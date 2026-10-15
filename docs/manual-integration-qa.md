# Checkpoint 5: Windows manual QA

Use fictional employee details and a separate MySQL database. Never point these commands at a real employee database. Do not run `migrate:fresh`, reset, seed demo passwords, or change the normal `.env` for testing.

## Prerequisites and isolated environment

PHP 8.3+, Composer, Node.js, MySQL and Chrome are required. The verified local stack is PHP 8.3.31, Laravel 13.36.0 and MySQL 8.4.3. Keep the same hostname (`localhost`) for both applications; do not mix `localhost` and `127.0.0.1` in browser URLs. MySQL may use 127.0.0.1 independently.

Create an empty MySQL database named `tawakal_frontend_integration_test` and a dedicated database account granted access only to that database. Supply your own credentials privately. The browser fixture command refuses any other database name, non-MySQL connections, or unrelated existing users/employees/invitations.

```powershell
Set-Location 'E:\Clients WOrk\TawakalENT\employee-management'
npm install
Set-Location laravel-backend
composer install
# Only copy if the ignored file does not already exist.
if (!(Test-Path .env.integration)) { Copy-Item .env.example .env.integration }
notepad .env.integration
```

Set these values in `.env.integration`, plus the dedicated DB account/password and actual MySQL port. Use a new APP_KEY; do not copy a real application's key.

```dotenv
APP_ENV=integration
APP_URL=http://localhost:8200
APP_DEBUG=false
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3308
DB_DATABASE=tawakal_frontend_integration_test
DB_USERNAME=YOUR_DEDICATED_TEST_ACCOUNT
DB_PASSWORD=YOUR_PRIVATE_TEST_PASSWORD
SESSION_DRIVER=file
SESSION_COOKIE=tawakal_integration_session
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=false
SESSION_SAME_SITE=lax
SESSION_ENCRYPT=true
FRONTEND_ORIGINS=http://localhost:3200,http://localhost:3000
SANCTUM_STATEFUL_DOMAINS=localhost:3200,localhost:8200,localhost:3000
CACHE_STORE=file
QUEUE_CONNECTION=sync
LOG_LEVEL=warning
CARD_VALIDITY_POLICY=unconfigured
```

```powershell
php artisan key:generate --env=integration
php artisan migrate --env=integration
```

## Automated real-browser check

Before creating a manual test admin, run this on the empty dedicated database. Ports 3200 and 8200 must be free. It creates random temporary credentials locally, uses independent admin/anonymous browser sessions, and removes its owned fixtures afterward. Never print `.next/integration/fixtures.json`. Do not enable traces, raw screenshots or HTML reporters containing dossier or token data.

```powershell
Set-Location 'E:\Clients WOrk\TawakalENT\employee-management'
$env:NEXT_PUBLIC_API_BASE_URL='http://localhost:8200'
$env:NEXT_OUTPUT_DIR='.next/integration-build'
$env:NEXT_FRONTEND_TEST='0'
npm run build
npm run test:integration
```

Results: `.next/integration-report/results.json`. Windows must permit Playwright to launch and terminate its own child servers. The suite resets only `.env.integration` policy to `unconfigured`. If interrupted, run `php tests/integration/backend.php cleanup` and `php tests/integration/backend.php policy unconfigured` from `laravel-backend`. Cleanup only removes records owned by the ignored fixture manifest; it does not reset a database. If cleanup fails, inspect the dedicated test database before rerunning.

## Start a manual session

After the automated suite has finished, create your own test administrator with an operator-selected strong password. This account is persistent and causes the automated suite's empty-database guard to refuse another run until you remove your own manual fixtures separately.

```powershell
Set-Location 'E:\Clients WOrk\TawakalENT\employee-management\laravel-backend'
php artisan portal:create-user --env=integration
# Select admin; enter a new testing password at the hidden prompt.
php -S localhost:8200 tests/integration/router.php
```

In another PowerShell window, use the already-built integration bundle:

```powershell
Set-Location 'E:\Clients WOrk\TawakalENT\employee-management'
$env:NEXT_PUBLIC_API_BASE_URL='http://localhost:8200'
$env:NEXT_OUTPUT_DIR='.next/integration-build'
$env:NEXT_FRONTEND_TEST='0'
npx next start -p 3200
```

Open `http://localhost:3200/login`. Normal developer ports remain 3000/8000; the automated evidence uses isolated 3200/8200 with the same cross-port cookie behavior. Do not replace a running real-data server for QA.

## Human PASS/FAIL checklist

Record PASS or FAIL against each item; do not put passwords, full CNICs, invitation URLs or QR payloads in the report.

| Result | Check |
|---|---|
| ___ | Wrong password shows an error; valid login opens the portal; private navigation while logged out redirects to login. |
| ___ | Create a fictional employee through all five dossier sections, including employers, references, checklist, declaration and photo. Directory shows the official employee ID; profile retains all submitted fields and displays the photo. |
| ___ | Search by name, official ID, phone and fictional CNIC. Combine card status and expiry filters; pagination totals match records. |
| ___ | Open the same employee edit form in two tabs. Save A, then save stale B. B must show a conflict. Reload latest, confirm discarding unsaved edits, then deliberately save again. Photo persists without a replacement. |
| ___ | Create an invitation without an implicit role restriction. In a private browser, complete an English candidate dossier and submit once. Administrator reviews private photo/details and approves; exactly one employee is created. Used link cannot be resubmitted. |
| ___ | Submit an Urdu candidate with an office role; check RTL labels. Administrator rejects with a reason; no employee is created. Expired/malformed links show useful errors. |
| ___ | With policy unconfigured, issuance and renewal are disabled with an explanation. No fake success appears. |
| ___ | For fictional QA only, run `php tests/integration/backend.php policy selected_years`; issue a card, inspect official data and photograph, preview/print it, and verify its QR publicly. Then test `eleven_months`: label changes and no years selector appears. |
| ___ | Renew existing card: same QR, one extension. A transport replay using the same Idempotency-Key must not extend twice. A deliberate new action uses a new key. |
| ___ | Reissue a lost card: new QR, unchanged expiry, old QR invalid. New physical renewal replaces the old QR and extends validity. Permanent deactivation invalidates the current QR. Historical records remain visible. |
| ___ | A legacy card without a modern verification credential is marked historical and cannot present an active QR or lifecycle actions. |
| ___ | Dashboard totals match actual stored employees, requests and eligible cards, including zero values. Managers, employment actions and notifications remain unavailable. |
| ___ | Logout invalidates the session; private photo/document URLs fail in a fresh anonymous browser. Public verification exposes only the limited verification response. |
| ___ | On real target camera hardware, allow camera permission and scan a printed QR through Scan Card. Check denied permission, focus, low light, unknown/revoked QR and manual fallback. |
| ___ | Inspect actual card print dimensions, clipping, duplex alignment and QR readability on the intended printer. |

Reset the isolated policy afterward:

```powershell
php tests/integration/backend.php policy unconfigured
```

Camera/printer hardware and deployed HTTPS, domain cookies, CORS, sessions and private storage still require human/hosting verification. Production card validity remains an outstanding product approval. Managers CRUD, employment actions and notifications are deferred.
