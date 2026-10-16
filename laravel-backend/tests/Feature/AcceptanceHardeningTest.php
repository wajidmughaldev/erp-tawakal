<?php

namespace Tests\Feature;

use App\Models\CardLifecycleEvent;
use App\Models\Employee;
use App\Models\IdCard;
use App\Models\User;
use App\Support\CardToken;
use App\Support\CardValidity;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\Fixtures\EmployeeDossier;
use Tests\TestCase;

class AcceptanceHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['cards.validity_policy' => 'selected_years', 'app.timezone' => 'Asia/Karachi']);
        $this->actingAs(User::create(['name' => 'Acceptance Operator', 'email' => 'acceptance@example.test', 'role' => 'admin', 'is_active' => true, 'password' => bin2hex(random_bytes(20))]), 'web');
    }

    private function fixture(int $days = 31, string $state = 'active'): IdCard
    {
        $employee = Employee::create(['employee_id' => 'QA-'.bin2hex(random_bytes(8)), 'full_name' => 'Acceptance Card Holder', 'designation' => 'QA', 'joining_date' => CardValidity::today(), 'dossier' => EmployeeDossier::make(), 'status' => 'active']);
        $token = CardToken::generate();
        $card = IdCard::create(['employee_id' => $employee->id, 'current_employee_id' => $state === 'active' ? $employee->id : null, 'card_number' => 'QA-'.bin2hex(random_bytes(8)), 'status' => $state, 'issued_date' => CardValidity::today()->subYear(), 'expiry_date' => CardValidity::today()->addDays($days), 'verification_token_digest' => CardToken::digest($token), 'verification_token' => $token, 'validity_policy' => 'selected_years', 'validity_years' => 1]);

        return $card->fresh();
    }

    public function test_active_includes_expiring_at_application_timezone_boundaries_and_excludes_ineligible_cards(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-01-31 23:30:00', 'UTC'));
        try {
            $this->assertSame('2026-02-01', CardValidity::today()->toDateString());
            foreach ([31, 30, 15, 1, 0, -1] as $days) {
                $card = $this->fixture($days);
                $this->assertSame($days >= 0, IdCard::displayStatus('active')->whereKey($card->id)->exists());
                $this->assertSame($days >= 0 && $days <= 30, IdCard::displayStatus('expiring_soon')->whereKey($card->id)->exists());
                $this->assertSame($days < 0, IdCard::displayStatus('expired')->whereKey($card->id)->exists());
            }
            $this->fixture(10, 'revoked');
            $this->fixture(10, 'replaced');
            $legacy = $this->fixture(10);
            $legacy->update(['verification_token_digest' => null, 'verification_token' => null, 'current_employee_id' => null]);
            $inactive = $this->fixture(10);
            $inactive->employee->update(['status' => 'inactive']);
            $deleted = $this->fixture(10);
            $deleted->employee->delete();
            $this->getJson('/api/v1/dashboard/summary')->assertOk()->assertJsonPath('data.activeCards', 5)->assertJsonPath('data.expiringCards', 4)->assertJsonPath('data.expiredCards', 1)->assertJsonPath('data.revokedCards', 1);
            foreach (['active' => 5, 'expiring_soon' => 4, 'expired' => 1, 'revoked' => 1, 'replaced' => 1] as $status => $count) {
                $this->getJson('/api/v1/id-cards?status='.$status)->assertOk()->assertJsonPath('meta.total', $count);
                $this->getJson('/api/v1/employees?cardStatus='.$status)->assertOk()->assertJsonPath('meta.total', $count);
            }
            foreach (['/api/v1/id-cards?status=active&expiry=expiring', '/api/v1/employees?cardStatus=active&expiry=expiring'] as $url) {
                $this->getJson($url)->assertJsonPath('meta.total', 4);
            }
            $this->getJson('/api/v1/id-cards?status=active&expiry=expired')->assertJsonPath('meta.total', 0);
        } finally {
            CarbonImmutable::setTestNow();
        }
    }

    public function test_seventy_long_valid_twenty_expiring_five_expired_five_revoked_count_ninety_active(): void
    {
        foreach ([[70, 31, 'active'], [20, 10, 'active'], [5, -1, 'active'], [5, 10, 'revoked']] as [$count,$days,$state]) {
            for ($index = 0; $index < $count; $index++) {
                $this->fixture($days, $state);
            }
        }
        $this->assertSame(90, IdCard::displayStatus('active')->count());
        $this->getJson('/api/v1/dashboard/summary')->assertJsonPath('data.activeCards', 90)->assertJsonPath('data.expiringCards', 20)->assertJsonPath('data.expiredCards', 5)->assertJsonPath('data.revokedCards', 5);
        $this->getJson('/api/v1/id-cards?status=active')->assertJsonPath('meta.total', 90)->assertJsonPath('meta.lastPage', 6);
        $this->getJson('/api/v1/employees?cardStatus=active&expiry=expiring')->assertJsonPath('meta.total', 20)->assertJsonPath('meta.lastPage', 2);
    }

    public function test_renewal_requires_revision_and_binds_replay_to_original_inputs_before_revision_check(): void
    {
        $card = $this->fixture();
        $url = '/api/v1/id-cards/'.$card->id.'/renew';
        $key = bin2hex(random_bytes(16));
        $this->getJson('/api/v1/id-cards/'.$card->id)->assertHeader('ETag', $card->etag());
        $this->withHeader('Idempotency-Key', $key)->postJson($url, ['option' => 'existing'])->assertStatus(428);
        $this->withHeader('If-Match', 'W/'.$card->etag())->postJson($url, ['option' => 'existing'])->assertStatus(412);
        $original = $card->etag();
        $preview = $this->getJson('/api/v1/id-cards/'.$card->id.'/renewal-preview?option=existing')->assertOk()->assertHeader('ETag', $original)->json('data');
        $first = $this->withHeader('If-Match', $original)->postJson($url, ['option' => 'existing'])->assertOk()->assertHeader('ETag', '"card-'.$card->id.'-v2"')->assertJsonPath('data.expiryDate', $preview['proposedExpiry'])->json('data');
        $this->postJson($url, ['option' => 'existing'])->assertOk()->assertJsonPath('data.expiryDate', $first['expiryDate']);
        $this->postJson($url, ['option' => 'new_physical'])->assertConflict();
        $this->postJson($url, ['option' => 'existing', 'validityYears' => 2])->assertConflict();
        $this->withHeader('If-Match', $card->fresh()->etag())->postJson($url, ['option' => 'existing'])->assertConflict();
        $otherCard = $this->fixture();
        $this->withHeader('If-Match', $otherCard->etag())->postJson('/api/v1/id-cards/'.$otherCard->id.'/renew', ['option' => 'existing'])->assertConflict();
        $operator = auth()->user();
        $other = User::create(['name' => 'Other Operator', 'email' => 'other-acceptance@example.test', 'role' => 'manager', 'is_active' => true, 'password' => bin2hex(random_bytes(20))]);
        Auth::forgetGuards();
        $this->actingAs($other, 'web')->withHeader('If-Match', $original)->postJson($url, ['option' => 'existing'])->assertConflict();
        Auth::forgetGuards();
        $this->actingAs($operator, 'web');
        $this->withHeader('Idempotency-Key', bin2hex(random_bytes(16)))->withHeader('If-Match', $original)->postJson($url, ['option' => 'existing'])->assertStatus(412);
        $this->assertDatabaseCount('card_renewal_operations', 1);
        $this->assertDatabaseCount('card_lifecycle_events', 1);
        $this->withHeader('If-Match', $card->fresh()->etag())->postJson($url, ['option' => 'existing'])->assertOk();
        $this->assertDatabaseCount('card_renewal_operations', 2);
        $this->assertSame(3, $card->fresh()->revision);
    }

    public function test_ledger_database_failure_rolls_back_revision_expiry_and_audit(): void
    {
        $card = $this->fixture();
        $before = $card->getRawOriginal();
        CardLifecycleEvent::created(fn () => DB::table('card_renewal_operations')->insert(['key_digest' => hash('sha256', 'failure'), 'administrator_id' => auth()->id(), 'card_id' => 0, 'option' => 'existing', 'result_card_id' => $card->id, 'created_at' => now()]));
        try {
            $this->withHeaders(['If-Match' => $card->etag(), 'Idempotency-Key' => bin2hex(random_bytes(16))])->postJson('/api/v1/id-cards/'.$card->id.'/renew', ['option' => 'existing'])->assertStatus(500);
        } finally {
            Event::forget('eloquent.created: '.CardLifecycleEvent::class);
        }
        $this->assertSame($before, $card->fresh()->getRawOriginal());
        $this->assertDatabaseCount('card_renewal_operations', 0);
        $this->assertDatabaseCount('card_lifecycle_events', 0);
    }

    public function test_preview_is_protected_read_only_and_uses_the_final_validity_calculation(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-01-31 12:00:00', 'Asia/Karachi'));
        try {
            $card = $this->fixture(0);
            $url = '/api/v1/id-cards/'.$card->id;
            $this->getJson($url.'/renewal-preview?option=existing')->assertOk()->assertHeader('ETag', $card->etag())->assertJsonPath('data.currentExpiry', '2026-01-31')->assertJsonPath('data.proposedExpiry', '2027-01-31');
            $this->assertSame(1, $card->fresh()->revision);
            $this->assertDatabaseCount('card_lifecycle_events', 0);
            $this->assertDatabaseCount('card_renewal_operations', 0);
            config(['cards.validity_policy' => 'unconfigured']);
            $this->getJson($url.'/renewal-preview?option=existing')->assertStatus(503);
            config(['cards.validity_policy' => 'eleven_months']);
            $card->update(['validity_years' => null]);
            $this->getJson($url.'/renewal-preview?option=new_physical')->assertOk()->assertJsonPath('data.proposedExpiry', '2026-12-31');
            $this->withHeaders(['If-Match' => $card->etag(), 'Idempotency-Key' => bin2hex(random_bytes(16))])->postJson($url.'/renew', ['option' => 'new_physical'])->assertOk()->assertJsonPath('data.expiryDate', '2026-12-31');
            $this->assertSame(2, $card->fresh()->revision);
            $this->getJson($url.'/renewal-preview?option=existing')->assertConflict();
        } finally {
            CarbonImmutable::setTestNow();
        }
    }

    public function test_legacy_ledger_entries_and_card_history_are_retained_and_never_guessed_as_new_operations(): void
    {
        $card = $this->fixture();
        $key = bin2hex(random_bytes(16));
        DB::table('card_renewal_operations')->insert(['key_digest' => hash('sha256', $key), 'administrator_id' => auth()->id(), 'card_id' => $card->id, 'option' => 'existing', 'result_card_id' => $card->id, 'created_at' => now()]);
        $this->withHeaders(['If-Match' => $card->etag(), 'Idempotency-Key' => $key])->postJson('/api/v1/id-cards/'.$card->id.'/renew', ['option' => 'existing'])->assertConflict();
        $this->assertDatabaseCount('card_renewal_operations', 1);
        $this->assertSame(1,$card->fresh()->revision);
    }
}
