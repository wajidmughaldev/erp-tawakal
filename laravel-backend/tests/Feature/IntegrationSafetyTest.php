<?php

namespace Tests\Feature;

use App\Models\CardLifecycleEvent;
use App\Models\Employee;
use App\Models\IdCard;
use App\Models\User;
use App\Support\CardValidity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\Fixtures\EmployeeDossier;
use Tests\TestCase;

class IntegrationSafetyTest extends TestCase
{
    use RefreshDatabase;

    private User $operator;

    protected function setUp(): void
    {
        parent::setUp();
        config(['cards.validity_policy' => 'selected_years']);
        $this->operator = User::create(['name' => 'Integration Operator', 'email' => 'integration-operator@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'admin', 'is_active' => true]);
        $this->actingAs($this->operator, 'web');
    }

    private function employee(string $name = 'Integration Employee'): Employee
    {
        $response = $this->postJson('/api/v1/employees', ['dossier' => json_encode(EmployeeDossier::make(['fullName' => $name]))])->assertCreated();

        return Employee::findOrFail($response->json('data.id'));
    }

    private function card(Employee $employee): array
    {
        return $this->postJson('/api/v1/id-cards', ['employeeId' => $employee->id, 'validityYears' => 1])->assertCreated()->json('data');
    }

    public function test_policy_and_summaries_are_protected_and_real_zero_counts_are_numeric(): void
    {
        foreach (['/api/v1/dashboard/summary', '/api/v1/employee-requests/summary', '/api/v1/id-cards/policy'] as $path) {
            Auth::forgetGuards();
            $this->getJson($path)->assertUnauthorized();
            $this->actingAs($this->operator, 'web')->getJson($path)->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        }
        $summary = $this->getJson('/api/v1/dashboard/summary')->json('data');
        foreach ($summary as $field => $value) {
            if ($field === 'expiring') {
                $this->assertSame([], $value);
            } else {
                $this->assertSame(0, $value);
            }
        }
        config(['cards.validity_policy' => 'unconfigured']);
        $this->getJson('/api/v1/id-cards/policy')->assertJsonPath('data.canIssue', false)->assertJsonPath('data.canRenew', false);
        config(['cards.validity_policy' => 'eleven_months']);
        $this->getJson('/api/v1/id-cards/policy')->assertJsonPath('data.mode', 'eleven_months')->assertJsonPath('data.validityYears', []);
    }

    public function test_renewal_replay_is_scoped_and_deliberate_new_renewals_still_work(): void
    {
        $card = $this->card($this->employee());
        $url = '/api/v1/id-cards/'.$card['id'].'/renew';
        $etag = IdCard::find($card['id'])->etag();
        $this->withHeader('If-Match', $etag);
        $key = bin2hex(random_bytes(16));
        $this->postJson($url, ['option' => 'existing'])->assertUnprocessable()->assertJsonValidationErrors('idempotencyKey');
        $first = $this->withHeader('Idempotency-Key', $key)->postJson($url, ['option' => 'existing'])->assertOk()->json('data');
        $this->postJson($url, ['option' => 'existing'])->assertOk()->assertJsonPath('data.expiryDate', $first['expiryDate']);
        $this->assertSame(1, CardLifecycleEvent::where('operation', 'renewal')->count());
        $this->postJson($url, ['option' => 'new_physical'])->assertConflict();
        $this->assertDatabaseCount('id_cards', 1);
        $this->withHeader('If-Match', IdCard::find($card['id'])->etag())->withHeader('Idempotency-Key', bin2hex(random_bytes(16)))->postJson($url, ['option' => 'existing'])->assertOk();
        $this->assertSame(2, CardLifecycleEvent::where('operation', 'renewal')->count());
        $this->assertDatabaseCount('card_renewal_operations', 2);
        $this->withHeader('If-Match', $etag)->withHeader('Idempotency-Key', $key)->postJson($url, ['option' => 'existing'])->assertOk();
        $this->assertSame(2, CardLifecycleEvent::where('operation', 'renewal')->count());
    }

    public function test_new_physical_renewal_replay_returns_the_same_credential(): void
    {
        $card = $this->card($this->employee());
        $url = '/api/v1/id-cards/'.$card['id'].'/renew';
        $etag = IdCard::find($card['id'])->etag();
        $this->withHeader('If-Match', $etag);
        $key = bin2hex(random_bytes(16));
        $first = $this->withHeader('Idempotency-Key', $key)->postJson($url, ['option' => 'new_physical'])->assertOk()->json('data');
        $this->postJson($url, ['option' => 'new_physical'])->assertOk()->assertJsonPath('data.id', $first['id']);
        $this->assertDatabaseCount('id_cards', 2);
        $this->assertDatabaseCount('card_renewal_operations', 1);
        $this->assertSame(1, CardLifecycleEvent::where('operation', 'replacement')->count());
    }

    public function test_failed_renewal_does_not_reserve_a_key_or_change_card_history(): void
    {
        $card = $this->card($this->employee());
        $url = '/api/v1/id-cards/'.$card['id'].'/renew';
        $etag = IdCard::find($card['id'])->etag();
        $this->withHeader('If-Match', $etag);
        $key = bin2hex(random_bytes(16));
        config(['cards.validity_policy' => 'unconfigured']);
        $this->withHeader('Idempotency-Key', $key)->postJson($url, ['option' => 'existing'])->assertStatus(503);
        $this->assertDatabaseCount('card_renewal_operations', 0);
        config(['cards.validity_policy' => 'selected_years']);
        $this->postJson($url, ['option' => 'existing'])->assertOk();
        $this->assertDatabaseCount('card_renewal_operations', 1);
    }

    public function test_employee_filters_and_summary_counts_exclude_legacy_and_ineligible_credentials(): void
    {
        $today = CardValidity::today();
        $eligible = [];
        foreach ([['Active', 60], ['Expiring', 30], ['Today', 0], ['Expired', -1]] as [$name,$days]) {
            $employee = $this->employee('Filtered '.$name);
            $card = $this->card($employee);
            IdCard::find($card['id'])->update(['expiry_date' => $today->addDays($days)]);
            $eligible[] = $employee;
        }
        $revoked = $this->employee('Filtered Revoked');
        $card = $this->card($revoked);
        $this->postJson('/api/v1/id-cards/'.$card['id'].'/deactivate', ['reason' => 'Test revocation'])->assertOk();
        $inactive = $this->employee('Filtered Inactive');
        $this->card($inactive);
        $inactive->status = 'inactive';
        $inactive->save();
        $deleted = $this->employee('Filtered Deleted');
        $this->card($deleted);
        $deleted->delete();
        $legacy = $this->employee('Filtered Legacy');
        IdCard::create(['employee_id' => $legacy->id, 'card_number' => 'LEGACY-ACTIVE-NO-QR', 'qr_code_hash' => bin2hex(random_bytes(32)), 'issued_date' => $today, 'expiry_date' => $today->addYear(), 'status' => 'active']);
        foreach (['active' => 3, 'expiring_soon' => 2, 'expired' => 1, 'revoked' => 1] as $status => $count) {
            $this->getJson('/api/v1/employees?search=Filtered&status=active&cardStatus='.$status)->assertOk()->assertJsonPath('meta.total', $count);
            $this->getJson('/api/v1/id-cards?status='.$status)->assertJsonPath('meta.total', $count);
        }
        $this->getJson('/api/v1/employees?cardStatus=active&expiry=expiring')->assertJsonPath('meta.total', 2);
        $this->getJson('/api/v1/employees?expiry=expiring')->assertJsonPath('meta.total', 2);
        $summary = $this->getJson('/api/v1/dashboard/summary')->assertOk()->assertJsonPath('data.totalEmployees', 7)->assertJsonPath('data.activeEmployees', 6)->assertJsonPath('data.activeCards', 3)->assertJsonPath('data.expiringCards', 2)->assertJsonPath('data.expiredCards', 1)->assertJsonPath('data.revokedCards', 1)->json('data');
        foreach ($summary['expiring'] as $item) {
            $this->assertArrayNotHasKey('verificationToken', $item);
            $this->assertArrayNotHasKey('dossier', $item);
            $this->assertSame('current', $item['credentialState']);
        }
        $this->getJson('/api/v1/employees/'.$legacy->id)->assertJsonPath('data.cards.0.credentialState', 'historical')->assertJsonPath('data.cards.0.verificationToken', '');
        // A revoked historical card must not override a later real current credential.
        $this->card($revoked);
        $this->getJson('/api/v1/employees?cardStatus=revoked')->assertJsonPath('meta.total', 0);
        $phone = $eligible[0]->dossier['mobileNumber'];
        foreach ([$eligible[0]->full_name, $eligible[0]->employee_id, $eligible[0]->dossier['cnic']] as $search) {
            $this->getJson('/api/v1/employees?search='.urlencode($search))->assertOk()->assertJsonPath('meta.total', 1);
        }$this->getJson('/api/v1/employees?search='.urlencode($phone))->assertOk();
    }

    public function test_request_summary_tracks_invitation_usage_and_actual_decisions(): void
    {
        $dossier = EmployeeDossier::make();
        $invite = $this->postJson('/api/v1/registration-invites', ['candidateName' => $dossier['fullName'], 'designation' => $dossier['designation'], 'department' => 'QA', 'expiresAt' => now()->addHour()->toIso8601String()])->assertCreated()->json('data');
        $this->getJson('/api/v1/employee-requests/summary')->assertJsonPath('data.activeInvitations', 1)->assertJsonPath('data.pending', 0);
        $request = $this->postJson('/api/v1/employee-requests', ['token' => $invite['token'], 'dossier' => json_encode($dossier)])->assertCreated()->json('data');
        $this->getJson('/api/v1/employee-requests/summary')->assertJsonPath('data.activeInvitations', 0)->assertJsonPath('data.fieldRoles', 1)->assertJsonPath('data.pending', 1);
        $this->postJson('/api/v1/employee-requests/'.$request['id'].'/reject', ['reason' => 'QA rejection'])->assertOk();
        $this->getJson('/api/v1/employee-requests/summary')->assertJsonPath('data.rejected', 1)->assertJsonPath('data.pending', 0);
    }
}
