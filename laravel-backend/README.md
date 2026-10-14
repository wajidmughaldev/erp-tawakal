# Backend checkpoint 1: foundation and authentication

Branch: feat/laravel-backend-foundation, based on fix/nextjs-frontend-parity at 4cf4cc373d464170fe11275867263f0f801af77a. All changes are confined to laravel-backend/. No frontend, HTML, legacy Vite, UI, merge or deployment changes.

## Runtime and setup

Laravel 13 requires PHP 8.3 or newer (supported range 8.3–8.5). Installed and verified locally: PHP 8.3.31, Composer 2.9.5, Laravel 13.36.0, Sanctum 4.3.3, MySQL 8.4.3. composer.lock pins the installation. Laravel 11 was replaced because its security support ended on March 12, 2026. See [Laravel support policy](https://laravel.com/docs/13.x/releases).

From this directory:

~~~sh
composer install
cp .env.example .env
# Set real DB_* credentials for a dedicated MySQL database.
php artisan key:generate
php artisan migrate
php artisan portal:create-user
php artisan serve --port=8000
~~~

Use PowerShell Copy-Item .env.example .env on Windows. The account command prompts for an email, unique username, one of the existing roles, and a hidden operator-supplied password. No accounts or default passwords are seeded. Passwords use Laravel's hashed cast and bcrypt (12 rounds outside tests). Password inputs are capped at 72 bytes to avoid bcrypt truncation. Users have unique email/optional username, a database enum role, is_active, remember_token and timestamps; passwords and remember tokens are hidden. No new permission rules are introduced: all three supported roles pass the same portal-role gate at this checkpoint.

Database configuration uses DB_CONNECTION=mysql and DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD. Local defaults use file sessions and file cache; no Redis, Docker or queue worker is needed. Session lifetime is 120 minutes; remember uses Laravel's remember cookie. Sessions are encrypted at rest, their cookie is always HttpOnly, and login renews the session ID. Logout invalidates the session, renews the CSRF token and clears the remember cookie.

## Exact authentication endpoints

| Method | Endpoint | Behavior |
|---|---|---|
| GET | /sanctum/csrf-cookie | Sanctum 204; sets XSRF-TOKEN and session cookies |
| POST | /api/v1/auth/login | identifier, password, optional boolean remember; 204 on real credentials, 401 on invalid/inactive credentials |
| GET | /api/v1/auth/me | Authenticated 200 with data: id (string), name, email, role; guest 401 |
| POST | /api/v1/auth/logout | Authenticated, CSRF-protected 204; guest 401 when valid CSRF accompanies request |

identifier accepts email or username, normalized to lowercase. Only admin, co-admin and manager are allowed by the model, MySQL schema and middleware. Inactive/unsupported sessions receive 403. Auth JSON responses do not include secrets and successful auth responses use Cache-Control: no-store. Bearer token retrieval is disabled; this is cookie authentication only, with no token issuance or personal-access-token table.

The existing frontend already requests CSRF then login then me and sends decoded XSRF-TOKEN as X-XSRF-TOKEN. Auth routes use web middleware so session/CSRF protection also applies when Origin is absent. Other API routes use Sanctum stateful middleware. Missing/stale CSRF on mutations produces 419 before authentication/validation; validation produces 422. Login throttling permits 5 requests/minute per normalized identifier + IP and 30/minute per IP, returning 429 with Retry-After. Both successful and failed attempts count.

Credentialed CORS uses exact FRONTEND_ORIGINS (comma-separated URLs with scheme/port), and Sanctum uses SANCTUM_STATEFUL_DOMAINS (hosts/ports, no scheme). Local example pairs localhost:3000 with localhost:8000. Do not mix localhost and 127.0.0.1 browser origins. With one permitted origin, the CORS library may send that fixed origin even for a disallowed request; the browser rejects the mismatch. It never echoes an untrusted origin.

For production, set APP_ENV=production, APP_DEBUG=false, APP_URL to the HTTPS backend origin, SESSION_SECURE_COOKIE=true, SESSION_DOMAIN to the shared parent domain (for frontend/API subdomains), SESSION_SAME_SITE=lax, and exact HTTPS FRONTEND_ORIGINS/stateful domains. The frontend and API must share the same registrable domain for Sanctum SPA cookies and readable XSRF-TOKEN. Configure the server document root to laravel-backend/public and make storage/bootstrap/cache writable. APP_KEY and database credentials stay in an untracked environment file. No hosting configuration was changed.

## Deferred routes

The old business controllers/models/migrations remain unchanged as reference; routes no longer call their incomplete operations. In particular, the old public verifier exposed full employee records, so it is unreachable.

These existing administrative routes require auth:sanctum and portal.role, then return an honest 503: GET/POST /api/v1/employees; GET/PUT/PATCH/DELETE /api/v1/employees/{id}; GET/POST /api/v1/id-cards; GET /api/v1/id-cards/{id}. No employee CRUD or card lifecycle is implemented.

Public routes (no authentication required) return an explicit 503 until later checkpoints: POST /api/v1/registration-invites/validate, POST /api/v1/employee-requests, POST /api/v1/verify-card. No candidate persistence, invite/token validation, fake verification or simulated success is implemented. Sanctum's normal CSRF requirement still applies when a request is recognized as stateful. Other proposed frontend domain endpoints are not implemented yet and return 404.

## Tests and local database

Create an isolated MySQL database named tawakal_checkpoint1_test and a dedicated test user with access only to that database. Copy .env.example to .env.testing, set APP_ENV=testing, APP_KEY (generate with php artisan key:generate --env=testing), and test DB_* credentials. Both environments remain ignored. The test suite refuses non-MySQL databases or names without the _test suffix before migrations. Never point tests at application data.

~~~sh
php artisan migrate --env=testing
php artisan test
php artisan serve --env=testing --host=127.0.0.1 --port=8100
# In another terminal, while that server is running:
php tests/session-smoke.php
composer check-platform-reqs
composer validate --strict
composer audit
~~~

Verified October 15, 2026:

- All three migrations ran on real MySQL 8.4.3, database tawakal_checkpoint1_test. Legacy employee/card migrations were retained without alteration.
- 19 backend feature tests passed, 97 assertions: all three role logins/me, username and remember cookie, invalid/missing credentials, validation, guest protection, inactive accounts, model/database/middleware role rejection, logout, login throttling, bearer rejection, operator account creation, deferred public/admin routes, explicit CSRF rejection and credentialed CORS.
- Real HTTP smoke passed with cookie persistence across separate requests: guest 401, Sanctum bootstrap 204, missing-CSRF login/logout 419, real login 204, me 200 with matching user ID, authenticated deferred route 503, logout 204, subsequent me 401. The random temporary test account is deleted in finally.
- Composer platform requirements passed on PHP 8.3.31; manifest validated; audit found no security advisories.
- Focused PHP formatting/syntax checks passed. No frontend files changed, so frontend checks were not rerun.

Testing used a separate loopback-only MySQL instance on port 3308 under ignored storage/testing-mysql, with randomly generated local database credentials. Existing XAMPP/Laragon databases were untouched. The temporary PHP server and isolated MySQL instance were stopped after verification.

## Remaining blockers

Deployment PHP version is unconfirmed: PHP 8.3+ is required before deploying this Laravel 13 branch. Actual hosting MySQL credentials, shared frontend/API domains, HTTPS session settings and web-server behavior are also unverified. No production account has been created. Employee CRUD, invitations, enrollment and card security/lifecycle remain for later approved checkpoints. Neither main nor the frontend branch is modified; no merge or deployment is performed.

## Files changed

See checkpoint-files.txt for the exact repository-relative file list. The scaffold adds artisan/bootstrap/public entrypoints, standard Laravel configuration and writable-storage placeholders; custom changes are limited to authentication, guarded deferred routes, user migration, tests and this setup report.
