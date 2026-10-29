<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ManagerManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->superadmin = User::create(['name' => 'Root', 'email' => 'root@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'superadmin', 'is_active' => true]);
        $this->actingAs($this->superadmin, 'web');
    }

    private function payload(array $overrides = []): array
    {
        return array_replace(['name' => 'Branch Manager', 'email' => 'Manager@Example.test', 'phone' => '0300 1234567', 'department' => 'Sales', 'branch' => 'Hyderabad', 'initialPassword' => 'Start1234pw'], $overrides);
    }

    public function test_superadmin_creates_a_manager_who_can_sign_in(): void
    {
        // A role sent by the client is ignored: only managers can be created here.
        $created = $this->postJson('/api/v1/managers', $this->payload(['role' => 'superadmin']))->assertCreated()->assertJsonPath('data.role', 'manager')->assertJsonPath('data.email', 'manager@example.test')->assertJsonPath('data.status', 'active')->assertJsonMissingPath('data.password');
        $this->assertSame('manager', User::findOrFail($created->json('data.id'))->role);
        Auth::forgetGuards();
        $this->app['auth']->guard('web')->logout();
        $this->postJson('/api/v1/auth/login', ['email' => 'manager@example.test', 'password' => 'Start1234pw'])->assertNoContent();
    }

    public function test_input_is_validated(): void
    {
        $this->postJson('/api/v1/managers', [])->assertUnprocessable()->assertJsonValidationErrors(['name', 'email', 'phone', 'department', 'branch', 'initialPassword']);
        $this->postJson('/api/v1/managers', $this->payload(['initialPassword' => 'weakpass']))->assertUnprocessable()->assertJsonValidationErrors('initialPassword');
        $this->postJson('/api/v1/managers', $this->payload(['email' => 'root@example.test']))->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->postJson('/api/v1/managers', $this->payload())->assertCreated();
        $this->postJson('/api/v1/managers', $this->payload(['email' => 'MANAGER@example.test']))->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_only_superadmin_can_use_manager_endpoints(): void
    {
        $id = $this->postJson('/api/v1/managers', $this->payload())->assertCreated()->json('data.id');
        $manager = User::findOrFail($id);
        Auth::forgetGuards();
        $this->actingAs($manager, 'web');
        $this->getJson('/api/v1/managers')->assertForbidden();
        $this->getJson('/api/v1/managers/'.$id)->assertForbidden();
        $this->postJson('/api/v1/managers', $this->payload(['email' => 'second@example.test']))->assertForbidden();
        $this->patchJson('/api/v1/managers/'.$id, $this->payload(['status' => 'active']))->assertForbidden();
        Auth::forgetGuards();
        $this->app['auth']->guard('web')->logout();
        $this->getJson('/api/v1/managers')->assertUnauthorized();
    }

    public function test_list_search_filter_and_superadmins_are_hidden(): void
    {
        $this->postJson('/api/v1/managers', $this->payload())->assertCreated();
        $other = $this->postJson('/api/v1/managers', $this->payload(['name' => 'Karachi Lead', 'email' => 'lead@example.test', 'branch' => 'Karachi']))->assertCreated()->json('data.id');
        $this->patchJson('/api/v1/managers/'.$other, $this->payload(['name' => 'Karachi Lead', 'email' => 'lead@example.test', 'branch' => 'Karachi', 'status' => 'inactive']))->assertOk();
        $this->getJson('/api/v1/managers')->assertOk()->assertJsonPath('meta.total', 2)->assertJsonPath('meta.activeTotal', 1);
        $this->getJson('/api/v1/managers?search=Karachi')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $other);
        $this->getJson('/api/v1/managers?status=inactive')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/managers?status=active')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/managers?search=root@example.test')->assertJsonPath('meta.total', 0);
        // Superadmin accounts cannot be read or changed through this API.
        $this->getJson('/api/v1/managers/'.$this->superadmin->id)->assertNotFound();
        $this->patchJson('/api/v1/managers/'.$this->superadmin->id, $this->payload(['status' => 'inactive']))->assertNotFound();
        $this->assertTrue($this->superadmin->fresh()->is_active);
    }

    public function test_deactivation_blocks_sign_in_and_live_sessions_and_accounts_cannot_be_deleted(): void
    {
        $id = $this->postJson('/api/v1/managers', $this->payload())->assertCreated()->json('data.id');
        $this->deleteJson('/api/v1/managers/'.$id)->assertStatus(405);
        $this->patchJson('/api/v1/managers/'.$id, $this->payload(['status' => 'inactive']))->assertOk()->assertJsonPath('data.status', 'inactive');
        $manager = User::findOrFail($id);
        $this->assertFalse($manager->is_active);
        Auth::forgetGuards();
        $this->actingAs($manager, 'web');
        $this->getJson('/api/v1/auth/me')->assertForbidden();
        Auth::forgetGuards();
        $this->app['auth']->guard('web')->logout();
        $this->postJson('/api/v1/auth/login', ['email' => 'manager@example.test', 'password' => 'Start1234pw'])->assertUnauthorized();
        $this->actingAs($this->superadmin, 'web');
        $this->patchJson('/api/v1/managers/'.$id, $this->payload(['status' => 'active', 'name' => 'Renamed']))->assertOk()->assertJsonPath('data.name', 'Renamed');
        $this->assertTrue(Hash::check('Start1234pw', $manager->fresh()->password));
    }
}
