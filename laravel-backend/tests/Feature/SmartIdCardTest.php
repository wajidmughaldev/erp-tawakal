<?php

namespace Tests\Feature;

use App\Models\CardLifecycleEvent;
use App\Models\Employee;
use App\Models\IdCard;
use App\Models\User;
use App\Support\CardToken;
use App\Support\CardValidity;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Fixtures\EmployeeDossier;
use Tests\TestCase;

class SmartIdCardTest extends TestCase
{
    use RefreshDatabase;

    private User $operator;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('employee_private');
        config(['cards.validity_policy' => 'selected_years']);
        $this->operator = User::create(['name' => 'Card Test Operator', 'email' => 'card-operator@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'superadmin', 'is_active' => true]);
        $this->actingAs($this->operator, 'web');
    }

    private function employee(array $overrides = []): Employee
    {
        $response = $this->post('/api/v1/employees', ['dossier' => json_encode(EmployeeDossier::make($overrides)), 'photo' => UploadedFile::fake()->createWithContent('photo.png', EmployeeDossier::png())], ['Accept' => 'application/json'])->assertCreated();

        return Employee::findOrFail($response->json('data.id'));
    }

    private function issue(?Employee $employee = null, int $years = 1): array
    {
        return $this->postJson('/api/v1/id-cards', ['employeeId' => (string) ($employee ?? $this->employee())->id, 'validityYears' => $years])->assertCreated()->json('data');
    }

    private function verify(string $token)
    {
        return $this->postJson('/api/v1/verify-card', ['token' => $token]);
    }

    public static function roles(): array
    {
        return [['superadmin'], ['manager']];
    }

    #[DataProvider('roles')]
    public function test_all_existing_roles_can_issue_review_and_deactivate(string $role): void
    {
        $this->operator->role = $role;
        $this->operator->save();
        $card = $this->issue();
        $this->getJson('/api/v1/id-cards/'.$card['id'])->assertOk()->assertJsonPath('data.verificationToken', $card['verificationToken']);
        $this->postJson('/api/v1/id-cards/'.$card['id'].'/deactivate', ['reason' => 'Role permission check'])->assertOk()->assertJsonPath('data.status', 'revoked');
    }

    public function test_guest_inactive_and_invalid_role_cannot_access_admin_routes(): void
    {
        $card = $this->issue();
        Auth::forgetGuards();
        foreach (['/api/v1/id-cards', '/api/v1/id-cards/'.$card['id']] as $path) {
            $this->getJson($path)->assertUnauthorized();
        }
        foreach (['', '/renew', '/reissue', '/deactivate'] as $suffix) {
            $this->postJson('/api/v1/id-cards'.($suffix === '' ? '' : '/'.$card['id'].$suffix), [])->assertUnauthorized();
        }
        $this->operator->is_active = false;
        $this->operator->save();
        $this->actingAs($this->operator, 'web')->getJson('/api/v1/id-cards')->assertForbidden();
        $this->operator->is_active = true;
        $this->operator->save();
        $this->operator->setRawAttributes(array_replace($this->operator->getAttributes(), ['role' => 'owner']));
        $this->actingAs($this->operator, 'web')->getJson('/api/v1/id-cards')->assertForbidden();
    }

    public function test_official_card_contract_entropy_encryption_and_reprint(): void
    {
        $employee = $this->employee();
        $first = $this->issue($employee);
        $second = $this->issue();
        $this->assertNotSame($first['number'], $second['number']);
        $this->assertNotSame($first['verificationToken'], $second['verificationToken']);
        $this->assertSame(43, strlen($first['verificationToken']));
        $this->assertSame(32, strlen(base64_decode(strtr($first['verificationToken'], '-_', '+/').'=')));
        $this->assertSame((string) $employee->id, $first['employeeId']);
        $this->assertSame($employee->employee_id, $first['employee']['displayId']);
        $this->assertSame('O+', $first['employee']['bloodGroup']);
        $this->assertArrayHasKey('photo', $first['employee']);
        $this->assertSame('active', $first['status']);
        $this->assertSame(CardValidity::today()->toDateString(), $first['issueDate']);
        $this->assertSame(CardValidity::today()->addYearNoOverflow()->toDateString(), $first['expiryDate']);
        $this->assertSame($this->operator->name, $first['issuedBy']);
        $row = DB::table('id_cards')->find($first['id']);
        $this->assertNotSame($first['verificationToken'], $row->verification_token);
        $this->assertSame(CardToken::digest($first['verificationToken']), $row->verification_token_digest);
        $this->assertNull($row->qr_code_hash);
        $this->assertSame($employee->id, $row->current_employee_id);
        $this->assertSame($this->operator->id, $row->issued_by);
        $this->assertSame('selected_years', $row->validity_policy);
        $this->assertSame(1, $row->validity_years);
        $this->getJson('/api/v1/id-cards/'.$first['id'])->assertOk()->assertHeader('Cache-Control', 'no-store, private')->assertJsonPath('data', $first)->assertJsonMissingPath('data.verification_token_digest');
        $this->assertDatabaseHas('card_lifecycle_events', ['card_id' => $first['id'], 'operation' => 'issuance', 'administrator_id' => $this->operator->id]);
    }

    public function test_invalid_inactive_deleted_and_duplicate_issuance_are_rejected(): void
    {
        $this->postJson('/api/v1/id-cards', ['employeeId' => '9999999', 'validityYears' => 1])->assertUnprocessable()->assertJsonValidationErrors('employeeId');
        $employee = $this->employee();
        $employee->status = 'resigned';
        $employee->save();
        $this->postJson('/api/v1/id-cards', ['employeeId' => $employee->id, 'validityYears' => 1])->assertConflict();
        $employee->status = 'active';
        $employee->save();
        $employee->delete();
        $this->postJson('/api/v1/id-cards', ['employeeId' => $employee->id, 'validityYears' => 1])->assertConflict();
        $employee->restore();
        $card = $this->issue($employee);
        $this->postJson('/api/v1/id-cards', ['employeeId' => $employee->id, 'validityYears' => 1])->assertConflict();
        IdCard::find($card['id'])->update(['expiry_date' => CardValidity::today()->subDay()]);
        $this->postJson('/api/v1/id-cards', ['employeeId' => $employee->id, 'validityYears' => 1])->assertConflict();
        $this->assertDatabaseCount('id_cards', 1);
    }

    public function test_unique_current_slot_is_enforced_by_database(): void
    {
        $card = $this->issue();
        try {
            DB::table('id_cards')->insert(['employee_id' => $card['employeeId'], 'current_employee_id' => $card['employeeId'], 'card_number' => 'CONSTRAINT-COLLISION', 'issued_date' => now(), 'expiry_date' => now(), 'status' => 'active']);
            $this->fail('Duplicate current slot was accepted.');
        } catch (QueryException $error) {
            $this->assertSame(1062, $error->errorInfo[1]);
        }
        $this->assertDatabaseCount('id_cards', 1);
    }

    public function test_number_generation_survives_inherited_number_collision(): void
    {
        IdCard::created(function ($card) {
            if ($card->verification_token_digest !== null) {
                DB::table('id_cards')->insert(['employee_id' => $card->employee_id, 'card_number' => 'CARD-'.$card->issued_date->format('Y').'-'.str_pad((string) $card->id, 6, '0', STR_PAD_LEFT), 'qr_code_hash' => bin2hex(random_bytes(32)), 'issued_date' => now(), 'expiry_date' => now(), 'status' => 'expired']);
            }
        });
        try {
            $card = $this->issue();
        } finally {
            Event::forget('eloquent.created: '.IdCard::class);
        }
        $this->assertStringEndsWith('-1', $card['number']);
        $this->assertDatabaseCount('id_cards', 2);
    }

    public static function calendarTerms(): array
    {
        return [
            ['selected_years', '2024-02-29', 1, '2025-02-28'], ['selected_years', '2024-02-29', 2, '2026-02-28'],
            ['selected_years', '2026-01-31', 1, '2027-01-31'], ['selected_years', '2026-01-31', 2, '2028-01-31'],
            ['eleven_months', '2024-03-31', null, '2025-02-28'], ['eleven_months', '2023-03-31', null, '2024-02-29'],
            ['eleven_months', '2026-01-31', null, '2026-12-31'],
        ];
    }

    #[DataProvider('calendarTerms')]
    public function test_calendar_policy_is_deterministic(string $policy, string $date, ?int $years, string $expected): void
    {
        $this->travelTo(CarbonImmutable::parse($date.' 12:00:00'));
        config(['cards.validity_policy' => $policy]);
        $employee = $this->employee();
        $data = ['employeeId' => $employee->id];
        if ($years !== null) {
            $data['validityYears'] = $years;
        }
        $card = $this->postJson('/api/v1/id-cards', $data)->assertCreated()->assertJsonPath('data.expiryDate', $expected)->json('data');
        $row = IdCard::find($card['id']);
        $this->assertSame($policy, $row->validity_policy);
        $this->assertSame($years, $row->validity_years);
    }

    public function test_policy_defaults_disabled_mismatches_and_client_dates_are_rejected(): void
    {
        $employee = $this->employee();
        config(['cards.validity_policy' => 'unconfigured']);
        $this->postJson('/api/v1/id-cards', ['employeeId' => $employee->id, 'validityYears' => 1])->assertStatus(503);
        $this->assertDatabaseCount('id_cards', 0);
        config(['cards.validity_policy' => 'eleven_months']);
        $this->postJson('/api/v1/id-cards', ['employeeId' => $employee->id, 'validityYears' => 1])->assertUnprocessable()->assertJsonValidationErrors('validityYears');
        config(['cards.validity_policy' => 'selected_years']);
        foreach ([0, 3, 'one'] as $years) {
            $this->postJson('/api/v1/id-cards', ['employeeId' => $employee->id, 'validityYears' => $years])->assertUnprocessable();
        }
        $this->postJson('/api/v1/id-cards', ['employeeId' => $employee->id])->assertUnprocessable();
        $this->postJson('/api/v1/id-cards', ['employeeId' => $employee->id, 'validityYears' => 1, 'number' => 'FAKE', 'expiryDate' => '2040-01-01'])->assertUnprocessable()->assertJsonValidationErrors(['number', 'expiryDate']);
        $card = $this->issue($employee);
        $original = IdCard::find($card['id']);
        config(['cards.validity_policy' => 'unconfigured']);
        $this->withHeader('If-Match', IdCard::find($card['id'])->etag())->withHeader('Idempotency-Key', bin2hex(random_bytes(16)))->postJson('/api/v1/id-cards/'.$card['id'].'/renew', ['option' => 'existing'])->assertStatus(503);
        $this->assertSame($original->expiry_date->toDateString(), IdCard::find($card['id'])->expiry_date->toDateString());
        $this->verify($card['verificationToken'])->assertJsonPath('status', 'valid');
        config(['cards.validity_policy' => 'eleven_months']);
        $this->withHeader('If-Match', IdCard::find($card['id'])->etag())->withHeader('Idempotency-Key', bin2hex(random_bytes(16)))->postJson('/api/v1/id-cards/'.$card['id'].'/renew', ['option' => 'existing'])->assertUnprocessable()->assertJsonValidationErrors('validityYears');
    }

    public function test_public_verification_status_boundaries_privacy_and_invalid_tokens(): void
    {
        $card = $this->issue();
        $model = IdCard::find($card['id']);
        foreach ([31 => 'valid', 30 => 'expiring', 0 => 'expiring', -1 => 'expired'] as $days => $status) {
            $model->expiry_date = CardValidity::today()->addDays($days);
            $model->save();
            $response = $this->verify($card['verificationToken'])->assertOk()->assertHeader('Cache-Control', 'no-store, private')->assertJsonPath('status', $status);
            $this->assertSame(['status', 'message', 'card'], array_keys($response->json()));
            $this->assertSame(['number', 'employeeName', 'employeeDisplayId', 'designation', 'bloodGroup', 'issueDate', 'expiryDate', 'photo'], array_keys($response->json('card')));
            foreach ([$card['verificationToken'], $model->verification_token_digest, $model->employee->dossier['cnic'], $model->employee->dossier['residentialAddress']] as $secret) {
                $this->assertStringNotContainsString($secret, $response->getContent());
            }
        }
        $this->verify(CardToken::generate())->assertOk()->assertJsonPath('status', 'invalid')->assertJsonMissingPath('card');
        foreach (['', str_repeat('A', 42), str_repeat('A', 44), str_repeat('/', 43)] as $token) {
            $this->verify($token)->assertUnprocessable()->assertJsonValidationErrors('token');
        }
        $this->verify(str_repeat('A', 43))->assertJsonPath('status', 'invalid');
    }

    public function test_inactive_and_deleted_employee_never_verify_and_cannot_extend_or_reissue(): void
    {
        $card = $this->issue();
        $employee = Employee::find($card['employeeId']);
        $employee->status = 'transferred';
        $employee->save();
        $this->verify($card['verificationToken'])->assertJsonPath('status', 'valid');
        $employee->status = 'resigned';
        $employee->save();
        $this->verify($card['verificationToken'])->assertJsonPath('status', 'invalid')->assertJsonMissingPath('card');
        $this->withHeader('If-Match', IdCard::find($card['id'])->etag())->withHeader('Idempotency-Key', bin2hex(random_bytes(16)))->postJson('/api/v1/id-cards/'.$card['id'].'/renew', ['option' => 'existing'])->assertConflict();
        $this->postJson('/api/v1/id-cards/'.$card['id'].'/reissue', ['reason' => 'Damaged Card', 'acknowledged' => true])->assertConflict();
        $employee->status = 'active';
        $employee->save();
        $employee->delete();
        $this->verify($card['verificationToken'])->assertJsonPath('status', 'invalid');
        // Administrators can still revoke a credential whose employee has become ineligible.
        $this->postJson('/api/v1/id-cards/'.$card['id'].'/deactivate', ['reason' => 'Employee departed'])->assertOk();
    }

    public function test_verification_rate_limit_and_stateful_csrf(): void
    {
        $token = CardToken::generate();
        for ($i = 0; $i < 60; $i++) {
            $this->verify($token)->assertOk();
        }$this->verify($token)->assertStatus(429);
        $this->app->instance('env', 'local');
        $this->withHeader('Origin', 'http://localhost:3000')->verify($token)->assertStatus(419);
    }

    public function test_existing_renewal_preserves_credential_and_issue_metadata(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-01-31 12:00:00'));
        $card = $this->issue(null, 2);
        $model = IdCard::find($card['id']);
        $issue = $model->issued_date;
        $actor = $model->issued_by;
        $this->travelTo(CarbonImmutable::parse('2026-06-10 12:00:00'));
        $renewed = $this->withHeader('If-Match', IdCard::find($card['id'])->etag())->withHeader('Idempotency-Key', bin2hex(random_bytes(16)))->postJson('/api/v1/id-cards/'.$card['id'].'/renew', ['option' => 'existing'])->assertOk()->assertJsonPath('data.id', $card['id'])->assertJsonPath('data.number', $card['number'])->assertJsonPath('data.verificationToken', $card['verificationToken'])->assertJsonPath('data.issueDate', '2026-01-31')->assertJsonPath('data.expiryDate', '2030-01-31')->json('data');
        $this->assertSame($actor, $model->fresh()->issued_by);
        $this->assertTrue($issue->equalTo($model->fresh()->issued_date));
        $this->assertDatabaseCount('id_cards', 1);
        $this->assertDatabaseHas('card_lifecycle_events', ['card_id' => $card['id'], 'operation' => 'renewal', 'previous_expiry' => '2028-01-31', 'new_expiry' => '2030-01-31']);
    }

    public function test_expired_renewal_uses_today_and_eleven_month_policy(): void
    {
        config(['cards.validity_policy' => 'eleven_months']);
        $employee = $this->employee();
        $card = $this->postJson('/api/v1/id-cards', ['employeeId' => $employee->id])->assertCreated()->json('data');
        IdCard::find($card['id'])->update(['expiry_date' => CardValidity::today()->subDays(10)]);
        $this->withHeader('If-Match', IdCard::find($card['id'])->etag())->withHeader('Idempotency-Key', bin2hex(random_bytes(16)))->postJson('/api/v1/id-cards/'.$card['id'].'/renew', ['option' => 'existing'])->assertOk()->assertJsonPath('data.expiryDate', CardValidity::today()->addMonthsNoOverflow(11)->toDateString());
    }

    public function test_new_physical_renewal_preserves_old_history_and_revokes_old_qr(): void
    {
        $card = $this->issue();
        $new = $this->withHeader('If-Match', IdCard::find($card['id'])->etag())->withHeader('Idempotency-Key', bin2hex(random_bytes(16)))->postJson('/api/v1/id-cards/'.$card['id'].'/renew', ['option' => 'new_physical'])->assertOk()->json('data');
        $this->assertNotSame($card['id'], $new['id']);
        $this->assertNotSame($card['number'], $new['number']);
        $this->assertNotSame($card['verificationToken'], $new['verificationToken']);
        $this->assertSame($card['employeeId'], $new['employeeId']);
        $this->assertDatabaseHas('id_cards', ['id' => $card['id'], 'status' => 'replaced', 'current_employee_id' => null]);
        $this->assertDatabaseCount('id_cards', 2);
        $this->verify($card['verificationToken'])->assertJsonPath('status', 'revoked');
        $this->verify($new['verificationToken'])->assertJsonPath('status', 'valid');
        $this->getJson('/api/v1/employees/'.$card['employeeId'])->assertJsonCount(2, 'data.cards')->assertJsonPath('data.cards.0.id', $new['id'])->assertJsonPath('data.cards.1.id', $card['id'])->assertJsonPath('data.cards.1.status', 'replaced');
        $this->assertDatabaseHas('card_lifecycle_events', ['operation' => 'replacement', 'previous_card_id' => $card['id'], 'new_card_id' => $new['id']]);
        $this->assertDatabaseHas('card_lifecycle_events', ['operation' => 'renewal', 'previous_card_id' => $card['id'], 'new_card_id' => $new['id']]);
        foreach (['renew', 'reissue', 'deactivate'] as $action) {
            $this->withHeader('If-Match', IdCard::find($card['id'])->etag())->withHeader('Idempotency-Key', bin2hex(random_bytes(16)))->postJson('/api/v1/id-cards/'.$card['id'].'/'.$action, ['option' => 'existing', 'reason' => 'Damaged Card', 'acknowledged' => true])->assertConflict();
        }
    }

    public function test_reissue_keeps_expiry_and_old_token_cannot_verify_active(): void
    {
        $card = $this->issue();
        config(['cards.validity_policy' => 'unconfigured']);
        $new = $this->postJson('/api/v1/id-cards/'.$card['id'].'/reissue', ['reason' => 'Lost / Stolen Card', 'acknowledged' => true])->assertOk()->json('data');
        $this->assertNotSame($card['id'], $new['id']);
        $this->assertNotSame($card['verificationToken'], $new['verificationToken']);
        $this->assertNotSame($card['number'], $new['number']);
        $this->assertSame($card['expiryDate'], $new['expiryDate']);
        $this->verify($card['verificationToken'])->assertJsonPath('status', 'revoked');
        $this->verify($new['verificationToken'])->assertJsonPath('status', 'valid');
        $event = CardLifecycleEvent::where('operation', 'reissue')->first();
        $this->assertSame('Lost / Stolen Card', $event->reason);
        $this->assertSame((int) $card['id'], $event->previous_card_id);
        $this->assertSame((int) $new['id'], $event->new_card_id);
        $this->assertSame($this->operator->id, $event->administrator_id);
        $this->assertStringNotContainsString('Lost / Stolen Card', DB::table('card_lifecycle_events')->where('id', $event->id)->value('reason'));
        $this->assertStringNotContainsString($card['verificationToken'], json_encode($event->getRawOriginal()));
        $this->postJson('/api/v1/id-cards/'.$card['id'].'/reissue', ['reason' => 'Other', 'acknowledged' => true])->assertConflict();
    }

    public function test_expired_reissue_invalid_inputs_and_unknown_cards(): void
    {
        $card = $this->issue();
        $url = '/api/v1/id-cards/'.$card['id'];
        $this->postJson($url.'/reissue', ['reason' => 'Other', 'acknowledged' => false])->assertUnprocessable()->assertJsonValidationErrors('acknowledged');
        $this->postJson($url.'/reissue', ['reason' => 'invented', 'acknowledged' => true])->assertUnprocessable()->assertJsonValidationErrors('reason');
        $this->postJson($url.'/deactivate', ['reason' => '   '])->assertUnprocessable();
        $this->withHeader('If-Match', IdCard::find($card['id'])->etag())->withHeader('Idempotency-Key', bin2hex(random_bytes(16)))->postJson($url.'/renew', ['option' => 'fake'])->assertUnprocessable();
        IdCard::find($card['id'])->update(['expiry_date' => CardValidity::today()->subDay()]);
        $this->postJson($url.'/reissue', ['reason' => 'Other', 'acknowledged' => true])->assertConflict();
        $this->getJson('/api/v1/id-cards/9999999')->assertNotFound();
        foreach (['renew', 'reissue', 'deactivate'] as $action) {
            $this->postJson('/api/v1/id-cards/9999999/'.$action, ['option' => 'existing', 'reason' => 'Other', 'acknowledged' => true])->assertNotFound();
        }
    }

    public function test_deactivation_is_permanent_and_releases_slot_for_explicit_new_issue(): void
    {
        $card = $this->issue();
        $this->postJson('/api/v1/id-cards/'.$card['id'].'/deactivate', ['reason' => 'Security review'])->assertOk()->assertJsonPath('data.status', 'revoked');
        $this->assertNull(IdCard::find($card['id'])->current_employee_id);
        $this->verify($card['verificationToken'])->assertJsonPath('status', 'revoked');
        foreach (['renew', 'reissue', 'deactivate'] as $action) {
            $this->withHeader('If-Match', IdCard::find($card['id'])->etag())->withHeader('Idempotency-Key', bin2hex(random_bytes(16)))->postJson('/api/v1/id-cards/'.$card['id'].'/'.$action, ['option' => 'existing', 'reason' => 'Other', 'acknowledged' => true])->assertConflict();
        }
        $new = $this->issue(Employee::find($card['employeeId']));
        $this->assertNotSame($card['id'], $new['id']);
        $this->verify($card['verificationToken'])->assertJsonPath('status', 'revoked');
        $this->assertDatabaseHas('card_lifecycle_events', ['operation' => 'deactivation', 'card_id' => $card['id']]);
    }

    public static function transitions(): array
    {
        return [['renew', 'existing'], ['renew', 'new_physical'], ['reissue', null], ['deactivate', null]];
    }

    #[DataProvider('transitions')]
    public function test_failed_audit_write_rolls_back_entire_transition(string $action, ?string $option): void
    {
        $card = $this->issue();
        $before = IdCard::find($card['id'])->getRawOriginal();
        CardLifecycleEvent::creating(fn () => throw new \RuntimeException('Intentional audit persistence failure.'));
        try {
            $this->withHeader('If-Match', IdCard::find($card['id'])->etag())->withHeader('Idempotency-Key', bin2hex(random_bytes(16)))->postJson('/api/v1/id-cards/'.$card['id'].'/'.$action, ['option' => $option, 'reason' => 'Other', 'acknowledged' => true])->assertStatus(500);
        } finally {
            Event::forget('eloquent.creating: '.CardLifecycleEvent::class);
        }
        $this->assertSame($before, IdCard::find($card['id'])->getRawOriginal());
        $this->assertDatabaseCount('id_cards', 1);
        $this->assertDatabaseCount('card_lifecycle_events', 1);
        $this->verify($card['verificationToken'])->assertJsonPath('status', 'valid');
    }

    public function test_failed_issuance_rolls_back_card_and_slot_and_history_is_immutable(): void
    {
        $employee = $this->employee();
        CardLifecycleEvent::creating(fn () => throw new \RuntimeException('Intentional issuance failure.'));
        try {
            $this->postJson('/api/v1/id-cards', ['employeeId' => $employee->id, 'validityYears' => 1])->assertStatus(500);
        } finally {
            Event::forget('eloquent.creating: '.CardLifecycleEvent::class);
        }
        $this->assertDatabaseCount('id_cards', 0);
        $this->assertDatabaseCount('card_lifecycle_events', 0);
        $this->issue($employee);
        $event = CardLifecycleEvent::first();
        foreach (['update', 'delete'] as $operation) {
            try {
                $operation === 'update' ? $event->update(['operation' => 'reissue']) : $event->delete();
                $this->fail('History mutation succeeded.');
            } catch (\LogicException $error) {
                $this->assertSame('Card lifecycle history is immutable.', $error->getMessage());
            }
        }
    }

    public function test_legacy_cards_have_no_new_credential_and_remain_visible_in_history(): void
    {
        $employee = $this->employee();
        foreach (['active', 'expired', 'revoked', 'pending_print'] as $status) {
            $hash = bin2hex(random_bytes(32));
            $legacy = IdCard::create(['employee_id' => $employee->id, 'card_number' => 'LEGACY-'.$status, 'qr_code_hash' => $hash, 'issued_date' => '2020-01-01', 'expiry_date' => '2021-01-01', 'status' => $status, 'printed_by' => 'Historical operator', 'verification_count' => 17]);
            $this->assertNull($legacy->verification_token_digest);
            $this->assertNull($legacy->current_employee_id);
            $this->getJson('/api/v1/id-cards/'.$legacy->id)->assertOk()->assertJsonPath('data.verificationToken', '');
            $this->verify(substr($hash, 0, 43))->assertJsonPath('status', 'invalid');
            $this->postJson('/api/v1/id-cards/'.$legacy->id.'/reissue', ['reason' => 'Other', 'acknowledged' => true])->assertConflict();
        }
        $new = $this->issue($employee);
        $this->getJson('/api/v1/employees/'.$employee->id)->assertOk()->assertJsonCount(5, 'data.cards');
        $this->assertDatabaseHas('id_cards', ['card_number' => 'LEGACY-expired', 'status' => 'expired', 'verification_count' => 17]);
    }

    public function test_candidate_approved_employee_can_receive_real_card(): void
    {
        $dossier = EmployeeDossier::make();
        $invite = $this->postJson('/api/v1/registration-invites', ['candidateName' => $dossier['fullName'], 'designation' => $dossier['designation'], 'department' => 'Candidate department', 'expiresAt' => now()->addHour()->toIso8601String()])->assertCreated()->json('data');
        $request = $this->postJson('/api/v1/employee-requests', ['token' => $invite['token'], 'dossier' => json_encode($dossier)])->assertCreated()->json('data');
        $approved = $this->postJson('/api/v1/employee-requests/'.$request['id'].'/approve')->assertOk()->json('data');
        $card = $this->issue(Employee::find($approved['employeeId']));
        $this->assertSame('Candidate department', $card['employee']['department']);
        $this->verify($card['verificationToken'])->assertJsonPath('status', 'valid');
    }

    public function test_filters_search_safe_sorts_and_pagination_use_database_values(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-15 12:00:00'));
        foreach ([['active', 60, 'ACTIVE'], ['active', 30, 'EXPIRING'], ['active', 0, 'TODAY'], ['active', -1, 'EXPIRED'], ['revoked', 60, 'REVOKED'], ['replaced', 60, 'REPLACED']] as [$status,$days,$number]) {
            $employee = $this->employee(['fullName' => 'Searchable Card Holder']);
            $real = $this->issue($employee);
            IdCard::find($real['id'])->update(['card_number' => $number, 'issued_date' => CardValidity::today()->subDays($days + 100), 'expiry_date' => CardValidity::today()->addDays($days), 'status' => $status, 'current_employee_id' => $status === 'active' ? $employee->id : null]);
        }
        foreach (['active' => 3, 'expiring_soon' => 2, 'expired' => 1, 'revoked' => 1, 'replaced' => 1] as $status => $count) {
            $this->getJson('/api/v1/id-cards?status='.$status)->assertOk()->assertJsonPath('meta.total', $count);
        }
        $this->getJson('/api/v1/id-cards?expiry=expiring')->assertJsonPath('meta.total', 2);
        $this->getJson('/api/v1/id-cards?search=REPLACED')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/id-cards?search='.urlencode($employee->full_name))->assertJsonPath('meta.total', 6);
        $this->getJson('/api/v1/id-cards?search='.$employee->employee_id)->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/id-cards?search=%25')->assertJsonPath('meta.total', 0);
        $this->getJson('/api/v1/id-cards?sort=expiry_asc')->assertJsonPath('data.0.number', 'EXPIRED');
        $this->getJson('/api/v1/id-cards?sort=issue_desc')->assertJsonPath('data.0.number', 'EXPIRED');
        $this->getJson('/api/v1/id-cards?sort=issue_asc')->assertJsonPath('data.0.number', 'ACTIVE');
        $this->getJson('/api/v1/id-cards?sort=expiry_date;drop')->assertUnprocessable();
        $this->getJson('/api/v1/id-cards?status=made_up')->assertUnprocessable();
        for ($i = 0; $i < 11; $i++) {
            IdCard::create(['employee_id' => $employee->id, 'card_number' => 'PAGINATION-'.$i, 'issued_date' => now(), 'expiry_date' => now(), 'status' => 'revoked']);
        }
        $this->getJson('/api/v1/id-cards')->assertJsonCount(15, 'data')->assertJsonPath('meta.total', 17)->assertJsonPath('meta.lastPage', 2)->assertJsonPath('meta.perPage', 15);
        $this->getJson('/api/v1/id-cards?page=2')->assertJsonCount(2, 'data')->assertJsonPath('meta.currentPage', 2);
        $this->getJson('/api/v1/employees')->assertOk()->assertJsonPath('meta.total', 6);
    }
}
