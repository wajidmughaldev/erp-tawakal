<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\PortalResetPassword;
use Database\Seeders\SuperAdminSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function beforeRefreshingDatabase(): void
    {
        if (config('database.default') !== 'mysql' || ! str_ends_with(config('database.connections.mysql.database'), '_test')) {
            throw new \RuntimeException('Tests require a dedicated MySQL database ending in _test.');
        }
    }

    private function user(string $role = 'superadmin', bool $active = true): array
    {
        $password = bin2hex(random_bytes(20));
        $user = User::create(['name' => 'Test User', 'email' => 'person@example.test', 'username' => 'person', 'password' => $password, 'role' => $role, 'is_active' => $active]);

        return [$user, $password];
    }

    public static function roles(): array
    {
        return [['superadmin'], ['manager']];
    }

    #[DataProvider('roles')]
    public function test_login_and_me_for_supported_roles(string $role): void
    {
        [$user, $password] = $this->user($role);
        $this->postJson('/api/v1/auth/login', ['email' => 'PERSON@example.test', 'password' => $password, 'remember' => false])->assertNoContent();
        $this->assertAuthenticatedAs($user, 'web');
        $this->getJson('/api/v1/auth/me')->assertOk()->assertExactJson(['data' => ['id' => (string) $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => $role]]);
        $this->assertNotEquals($password, $user->password);
        $this->assertTrue(Hash::check($password, $user->password));
    }

    public function test_username_login_is_not_supported_and_remember_cookie_is_set(): void
    {
        [$user, $password] = $this->user();
        $this->postJson('/api/v1/auth/login', ['email' => 'person', 'password' => $password])->assertUnprocessable();
        $response = $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => $password, 'remember' => true])->assertNoContent();
        $response->assertCookie(Auth::guard('web')->getRecallerName());
        $this->assertNotNull($user->fresh()->remember_token);
    }

    public function test_change_password_requires_current_password_and_strength(): void
    {
        [$user, $password] = $this->user();
        $this->actingAs($user, 'web');
        $this->postJson('/api/v1/auth/change-password', ['current_password' => 'wrong', 'password' => 'NewPass123', 'password_confirmation' => 'NewPass123'])->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->postJson('/api/v1/auth/change-password', ['current_password' => $password, 'password' => 'weak', 'password_confirmation' => 'weak'])->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->postJson('/api/v1/auth/change-password', ['current_password' => $password, 'password' => 'NewPass123', 'password_confirmation' => 'NewPass123'])->assertNoContent();
        $this->assertTrue(Hash::check('NewPass123', $user->fresh()->password));
    }

    public function test_forgot_password_does_not_reveal_accounts_and_reset_works(): void
    {
        Notification::fake();
        [$user] = $this->user();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'missing@example.test'])->assertNoContent();
        Notification::assertNothingSent();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertNoContent();
        $token = null;
        Notification::assertSentTo($user, PortalResetPassword::class, function ($notification) use (&$token) {
            $token = (new \ReflectionProperty($notification, 'token'))->getValue($notification);

            return true;
        });
        $this->postJson('/api/v1/auth/reset-password', ['token' => 'bad', 'email' => $user->email, 'password' => 'ResetPass123', 'password_confirmation' => 'ResetPass123'])->assertUnprocessable();
        $this->postJson('/api/v1/auth/reset-password', ['token' => $token, 'email' => $user->email, 'password' => 'ResetPass123', 'password_confirmation' => 'ResetPass123'])->assertNoContent();
        $this->assertTrue(Hash::check('ResetPass123', $user->fresh()->password));
    }

    public function test_seeder_creates_superadmin_once_without_overwriting(): void
    {
        putenv('SUPERADMIN_EMAIL=Seed@Example.test');
        putenv('SUPERADMIN_PASSWORD=Seeded123pass');
        $this->seed(SuperAdminSeeder::class);
        $user = User::where('email', 'seed@example.test')->firstOrFail();
        $this->assertSame('superadmin', $user->role);
        $user->update(['password' => 'Changed123pass']);
        $this->seed(SuperAdminSeeder::class);
        $this->assertTrue(Hash::check('Changed123pass', $user->fresh()->password));
        $this->assertSame(1, User::where('email', 'seed@example.test')->count());
    }

    public function test_invalid_and_missing_accounts_have_same_response(): void
    {
        $this->user();
        foreach (['person@example.test', 'missing@example.test'] as $email) {
            $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'incorrect'])->assertUnauthorized()->assertExactJson(['message' => 'Invalid credentials.']);
            $this->assertGuest('web');
        }
    }

    public function test_operator_can_create_account_without_demo_credentials(): void
    {
        $password = bin2hex(random_bytes(20));
        $this->artisan('portal:create-user')
            ->expectsQuestion('Name', 'Operator')
            ->expectsQuestion('Email', 'operator@example.test')
            ->expectsChoice('Role', 'superadmin', User::ROLES)
            ->expectsQuestion('Password (8-72 bytes)', $password)
            ->expectsOutput('Portal account created.')
            ->assertSuccessful();
        $user = User::where('email', 'operator@example.test')->firstOrFail();
        $this->assertTrue(Hash::check($password, $user->password));
    }

    public function test_bearer_tokens_are_not_accepted(): void
    {
        $this->withToken('1|untrusted-token')->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_non_string_identifier_is_validated(): void
    {
        $this->postJson('/api/v1/auth/login', ['email' => ['unexpected'], 'password' => 'incorrect'])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_login_validates_payload(): void
    {
        $this->postJson('/api/v1/auth/login', ['remember' => 'invalid'])->assertUnprocessable()->assertJsonValidationErrors(['email', 'password', 'remember']);
    }

    public function test_guests_cannot_access_administrative_endpoints(): void
    {
        foreach (['/api/v1/auth/me', '/api/v1/employees', '/api/v1/id-cards'] as $path) {
            $this->getJson($path)->assertUnauthorized();
        }
        $this->postJson('/api/v1/auth/logout')->assertUnauthorized();
        $this->postJson('/api/v1/employees')->assertUnauthorized();
    }

    public function test_inactive_accounts_cannot_login_or_access_portal(): void
    {
        [$user, $password] = $this->user('manager', false);
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => $password])->assertUnauthorized();
        $this->actingAs($user, 'web')->getJson('/api/v1/auth/me')->assertForbidden();
    }

    public function test_unknown_roles_are_rejected_by_model(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->user('owner');
    }

    public function test_database_rejects_unknown_roles(): void
    {
        [$user] = $this->user();
        $this->expectException(QueryException::class);
        DB::table('users')->where('id', $user->id)->update(['role' => 'owner']);
    }

    public function test_role_middleware_rejects_unknown_role(): void
    {
        [$user] = $this->user();
        $user->setRawAttributes(array_merge($user->getAttributes(), ['role' => 'owner']));
        $this->actingAs($user, 'web')->getJson('/api/v1/auth/me')->assertForbidden();
    }

    public function test_logout_invalidates_session(): void
    {
        [$user, $password] = $this->user();
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => $password])->assertNoContent();
        $sessionId = session()->getId();
        $this->postJson('/api/v1/auth/logout')->assertNoContent();
        $this->assertGuest('web');
        $this->assertNotEquals($sessionId, session()->getId());
        Auth::forgetGuards();
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_login_rate_limit(): void
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'missing@example.test', 'password' => 'incorrect'])->assertUnauthorized();
        }
        $this->postJson('/api/v1/auth/login', ['email' => 'missing@example.test', 'password' => 'incorrect'])->assertStatus(429)->assertHeader('Retry-After');
    }

    public function test_csrf_cookie_and_missing_token_rejection(): void
    {
        // Laravel bypasses CSRF in its normal test environment; re-enable it here.
        $this->app->instance('env', 'local');
        $response = $this->get('/sanctum/csrf-cookie')->assertNoContent()->assertCookie('XSRF-TOKEN')->assertCookie(config('session.cookie'));
        $this->assertTrue($response->getCookie(config('session.cookie'))->isHttpOnly());
        $this->postJson('/api/v1/auth/login', ['email' => 'person', 'password' => 'incorrect'])->assertStatus(419);
    }

    public function test_cors_only_allows_configured_origin(): void
    {
        $this->withHeaders(['Origin' => 'http://localhost:3000', 'Access-Control-Request-Method' => 'POST', 'Access-Control-Request-Headers' => 'content-type,x-xsrf-token'])->options('/api/v1/auth/login')->assertNoContent()->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000')->assertHeader('Access-Control-Allow-Credentials', 'true');
        $this->withHeaders(['Origin' => 'https://untrusted.example'])->options('/api/v1/auth/login')->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    }
}
