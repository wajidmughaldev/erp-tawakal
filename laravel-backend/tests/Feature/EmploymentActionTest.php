<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\IdCard;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Tests\Fixtures\EmployeeDossier;
use Tests\TestCase;

class EmploymentActionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['cards.validity_policy' => 'selected_years']);
        $this->actingAs(User::create(['name' => 'Action Operator', 'email' => 'action-operator@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'manager', 'is_active' => true]), 'web');
    }

    private function employee(): Employee
    {
        $response = $this->postJson('/api/v1/employees', ['dossier' => json_encode(EmployeeDossier::make())])->assertCreated();

        return Employee::findOrFail($response->json('data.id'));
    }

    public function test_transfer_updates_department_location_and_status_and_is_recorded(): void
    {
        $employee = $this->employee();
        $this->postJson("/api/v1/employees/{$employee->id}/actions", ['type' => 'transfer', 'department' => 'Sales', 'location' => 'Karachi', 'effectiveDate' => '2026-11-01', 'reason' => 'Branch need'])
            ->assertOk()->assertJsonPath('data.status', 'transferred')->assertJsonPath('data.department', 'Sales')->assertJsonPath('data.location', 'Karachi');
        $this->assertSame(1, DB::table('employment_actions')->where(['employee_id' => $employee->id, 'type' => 'transfer'])->count());
    }

    public function test_transferred_employee_keeps_a_valid_card_and_can_still_resign(): void
    {
        $employee = $this->employee();
        $card = $this->postJson('/api/v1/id-cards', ['employeeId' => $employee->id, 'validityYears' => 1])->assertCreated()->json('data');
        $this->postJson("/api/v1/employees/{$employee->id}/actions", ['type' => 'transfer', 'department' => 'Sales', 'location' => 'Karachi', 'effectiveDate' => '2026-11-01', 'reason' => 'Branch need'])->assertOk();
        $this->postJson('/api/v1/verify-card', ['token' => $card['verificationToken']])->assertJsonPath('status', 'valid');
        $this->getJson('/api/v1/dashboard/summary')->assertJsonPath('data.activeCards', 1);
        $this->postJson("/api/v1/employees/{$employee->id}/actions", ['type' => 'resign', 'resignationDate' => '2026-11-02', 'lastWorkingDate' => '2026-11-30', 'reason' => 'Left'])->assertOk()->assertJsonPath('data.status', 'resigned');
        $this->assertSame('revoked', IdCard::findOrFail($card['id'])->status);
        $this->postJson("/api/v1/employees/{$employee->id}/actions", ['type' => 'transfer', 'department' => 'HR', 'location' => 'Lahore', 'effectiveDate' => '2026-12-01', 'reason' => 'x y z'])->assertStatus(409);
    }

    public function test_resign_revokes_live_cards_and_marks_employee_resigned(): void
    {
        $employee = $this->employee();
        $card = $this->postJson('/api/v1/id-cards', ['employeeId' => $employee->id, 'validityYears' => 1])->assertCreated()->json('data');
        $this->postJson("/api/v1/employees/{$employee->id}/actions", ['type' => 'resign', 'resignationDate' => '2026-11-02', 'lastWorkingDate' => '2026-11-30', 'reason' => 'Personal'])
            ->assertOk()->assertJsonPath('data.status', 'resigned');
        $this->assertSame('revoked', IdCard::findOrFail($card['id'])->status);
        $this->assertDatabaseHas('card_lifecycle_events', ['card_id' => $card['id'], 'operation' => 'deactivation']);
        $this->postJson('/api/v1/verify-card', ['token' => $card['verificationToken']])->assertJsonPath('status', 'invalid');
    }

    public function test_validation_and_other_action(): void
    {
        $employee = $this->employee();
        $url = "/api/v1/employees/{$employee->id}/actions";
        $this->postJson($url, ['type' => 'bogus'])->assertUnprocessable();
        $this->postJson($url, ['type' => 'resign', 'resignationDate' => '2026-11-10', 'lastWorkingDate' => '2026-11-01', 'reason' => 'Left'])->assertUnprocessable()->assertJsonValidationErrors('lastWorkingDate');
        $this->postJson($url, ['type' => 'transfer', 'department' => 'Sales'])->assertUnprocessable();
        $this->assertSame('active', $employee->fresh()->status);
        $this->postJson($url, ['type' => 'other', 'title' => 'Warning letter', 'date' => '2026-11-03', 'description' => 'Late arrival'])->assertOk()->assertJsonPath('data.status', 'active');
        $this->assertSame(1, DB::table('employment_actions')->where('type', 'other')->count());
    }

    public function test_guests_and_deleted_employees_are_rejected(): void
    {
        $employee = $this->employee();
        $payload = ['type' => 'other', 'title' => 'Note', 'date' => '2026-11-03', 'description' => 'Something'];
        $employee->delete();
        $this->postJson("/api/v1/employees/{$employee->id}/actions", $payload)->assertNotFound();
        Auth::forgetGuards();
        $this->app['auth']->guard('web')->logout();
        $this->postJson('/api/v1/employees/1/actions', $payload)->assertUnauthorized();
    }
}
