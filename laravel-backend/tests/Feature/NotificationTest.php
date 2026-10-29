<?php

namespace Tests\Feature;

use App\Models\PortalNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Tests\Fixtures\EmployeeDossier;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private User $superadmin;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('employee_private');
        config(['cards.validity_policy' => 'eleven_months']);
        $this->superadmin = User::create(['name' => 'Root', 'email' => 'root@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'superadmin', 'is_active' => true]);
        $this->manager = User::create(['name' => 'Branch Manager', 'email' => 'branch@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'manager', 'is_active' => true]);
    }

    private function as(User $user): void
    {
        Auth::forgetGuards();
        $this->actingAs($user, 'web');
    }

    private function titles(User $user): array
    {
        return PortalNotification::where('user_id', $user->id)->orderBy('id')->pluck('title')->all();
    }

    public function test_the_person_who_acted_is_not_notified_but_every_other_active_admin_is(): void
    {
        User::create(['name' => 'Gone', 'email' => 'gone@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'manager', 'is_active' => false]);
        $this->as($this->manager);
        $employee = $this->postJson('/api/v1/employees', ['dossier' => json_encode(EmployeeDossier::make())])->assertCreated()->json('data');
        $this->postJson('/api/v1/id-cards', ['employeeId' => $employee['id']])->assertCreated();
        $this->assertSame(['New employee added', 'ID card issued'], $this->titles($this->superadmin));
        $this->assertSame([], $this->titles($this->manager));
        $this->assertSame(0, PortalNotification::where('user_id', '!=', $this->superadmin->id)->count());
    }

    public function test_card_lifecycle_and_employment_events_are_announced(): void
    {
        $this->as($this->superadmin);
        $employee = $this->postJson('/api/v1/employees', ['dossier' => json_encode(EmployeeDossier::make())])->assertCreated()->json('data');
        $card = $this->postJson('/api/v1/id-cards', ['employeeId' => $employee['id']])->assertCreated()->json('data');
        $this->postJson('/api/v1/id-cards/'.$card['id'].'/reissue', ['reason' => 'Damaged Card', 'acknowledged' => true])->assertOk();
        $this->postJson("/api/v1/employees/{$employee['id']}/actions", ['type' => 'transfer', 'department' => 'Sales', 'location' => 'Karachi', 'effectiveDate' => '2026-11-01', 'reason' => 'Branch need'])->assertOk();
        $this->postJson("/api/v1/employees/{$employee['id']}/actions", ['type' => 'resign', 'resignationDate' => '2026-11-02', 'lastWorkingDate' => '2026-11-30', 'reason' => 'Left'])->assertOk();
        $this->assertSame(['New employee added', 'ID card issued', 'ID card reissued', 'Employee transferred', 'Employee resigned'], $this->titles($this->manager));
        $this->as($this->manager);
        $this->getJson('/api/v1/notifications?category=cards')->assertJsonPath('meta.total', 2);
        $this->getJson('/api/v1/notifications?category=employees')->assertJsonPath('meta.total', 3);
        $this->getJson('/api/v1/notifications')->assertJsonPath('data.0.title', 'Employee resigned')->assertJsonPath('data.0.target.type', 'employee')->assertJsonPath('data.0.level', 'warning');
    }

    public function test_candidate_forms_notify_everyone_and_manager_accounts_only_superadmins(): void
    {
        $this->as($this->superadmin);
        $invite = $this->postJson('/api/v1/registration-invites', [])->assertCreated()->json('data');
        Auth::forgetGuards();
        $this->app['auth']->guard('web')->logout();
        $this->post('/api/v1/employee-requests', ['token' => $invite['token'], 'dossier' => json_encode(EmployeeDossier::make())], ['Accept' => 'application/json'])->assertCreated();
        $this->assertSame(['New registration form received'], $this->titles($this->superadmin));
        $this->assertSame(['New registration form received'], $this->titles($this->manager));
        $this->as($this->superadmin);
        $this->postJson('/api/v1/managers', ['name' => 'New Manager', 'email' => 'new@example.test', 'phone' => '0300 1234567', 'department' => 'Sales', 'branch' => 'Hyderabad', 'initialPassword' => 'Start1234pw'])->assertCreated();
        // The creator does not get their own notice, and managers never see account events.
        $this->assertSame(['New registration form received'], $this->titles($this->superadmin));
        $this->assertSame(['New registration form received'], $this->titles($this->manager));
        $other = User::create(['name' => 'Second Root', 'email' => 'root2@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'superadmin', 'is_active' => true]);
        $this->postJson('/api/v1/managers/'.User::where('email', 'new@example.test')->value('id'), ['name' => 'New Manager', 'email' => 'new@example.test', 'phone' => '0300 1234567', 'department' => 'Sales', 'branch' => 'Hyderabad', 'status' => 'inactive', '_method' => 'PATCH'])->assertOk();
        $this->assertSame(['Manager deactivated'], $this->titles($other));
    }

    public function test_unread_count_mark_all_read_and_per_user_state(): void
    {
        $this->as($this->manager);
        $this->postJson('/api/v1/employees', ['dossier' => json_encode(EmployeeDossier::make())])->assertCreated();
        $this->as($this->superadmin);
        $this->getJson('/api/v1/notifications?summary=true')->assertOk()->assertExactJson(['unreadCount' => 1]);
        $this->getJson('/api/v1/notifications?category=unread')->assertJsonPath('meta.total', 1);
        $this->postJson('/api/v1/notifications/read-all')->assertNoContent();
        $this->getJson('/api/v1/notifications?summary=true')->assertExactJson(['unreadCount' => 0]);
        $this->getJson('/api/v1/notifications?category=unread')->assertJsonPath('meta.total', 0);
        $this->getJson('/api/v1/notifications')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.readAt', fn ($value) => $value !== null);
        // Another administrator's notices are unaffected, and invisible.
        PortalNotification::create(['user_id' => $this->manager->id, 'category' => 'cards', 'level' => 'info', 'title' => 'Private', 'message' => 'for the manager']);
        $this->getJson('/api/v1/notifications')->assertJsonPath('meta.total', 1);
        $this->as($this->manager);
        $this->getJson('/api/v1/notifications?summary=true')->assertExactJson(['unreadCount' => 1]);
        $this->getJson('/api/v1/notifications?category=bogus')->assertUnprocessable();
    }

    public function test_notifications_older_than_thirty_days_are_deleted(): void
    {
        $old = PortalNotification::create(['user_id' => $this->superadmin->id, 'category' => 'cards', 'level' => 'info', 'title' => 'Old', 'message' => 'old', 'created_at' => now()->subDays(31)]);
        $recent = PortalNotification::create(['user_id' => $this->superadmin->id, 'category' => 'cards', 'level' => 'info', 'title' => 'Recent', 'message' => 'recent', 'created_at' => now()->subDays(29)]);
        $this->as($this->superadmin);
        $this->getJson('/api/v1/notifications')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.title', 'Recent');
        $this->assertModelMissing($old);
        $this->assertModelExists($recent);
        PortalNotification::create(['user_id' => $this->superadmin->id, 'category' => 'cards', 'level' => 'info', 'title' => 'Old 2', 'message' => 'old', 'created_at' => now()->subDays(40)]);
        $this->artisan('notifications:prune')->assertSuccessful();
        $this->assertSame(1, PortalNotification::count());
    }

    public function test_guests_cannot_read_notifications(): void
    {
        $this->getJson('/api/v1/notifications')->assertUnauthorized();
        $this->postJson('/api/v1/notifications/read-all')->assertUnauthorized();
    }
}
