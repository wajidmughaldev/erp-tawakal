# Checkpoint 4: Smart ID card lifecycle

Branch: `feat/laravel-smart-id-cards`. Base fetched and verified: `68c9bf93536a19e0650ff2a4fb46714c1acb6a07` on `feat/laravel-candidate-registration`. The final completion message supplies this feature branch's commit SHA; it can also be obtained with git rev-parse HEAD.

Only the 25 backend files listed in [smart-id-checkpoint-files.txt](smart-id-checkpoint-files.txt) are part of this checkpoint. The pre-existing untracked public/storage junction was preserved and excluded. No frontend, HTML, Vite or UI changes, merge or deployment were performed.

## API endpoints and contracts

| Method | Endpoint | Access |
|---|---|---|
| GET | /api/v1/id-cards | Sanctum session and existing portal role |
| POST | /api/v1/id-cards | Sanctum session and existing portal role |
| GET | /api/v1/id-cards/{id} | Sanctum session and existing portal role |
| POST | /api/v1/id-cards/{id}/renew | Sanctum session and existing portal role |
| POST | /api/v1/id-cards/{id}/reissue | Sanctum session and existing portal role |
| POST | /api/v1/id-cards/{id}/deactivate | Sanctum session and existing portal role |
| POST | /api/v1/verify-card | Public, rate-limited; normal stateful CSRF applies |

All admin/co-admin/manager accounts retain the same established portal authorization. Inactive/unknown roles are denied. Guessed IDs cannot bypass authentication. Unknown administrative card IDs return 404.

[Contract examples](smart-id-contract-example.json) contain issue, existing renewal, new physical renewal, reissue, deactivation, public verification, disabled policy and policy mismatch responses. Issue accepts employeeId and validityYears; renew accepts option existing/new_physical and can optionally receive validityYears for an explicit future term selection. Reissue accepts the existing UI reason choices (Lost / Stolen Card, Damaged Card, Updated Information, Other) and accepted acknowledgment. Deactivation requires a trimmed, nonempty reason of 3-2000 characters.

Administrative records use the exact IDCard shape inside data: id, number, employeeId, employee.displayId/name/designation/department/bloodGroup/optional authenticated photo, status, issueDate, expiryDate, verificationToken and issuedBy. Card numbers are generated from persisted PKs, with a suffix if an inherited historical number occupies the expected value. No row counting, client-generated official number or client expiration is used. Issue explicitly rejects submitted official numbers/dates/token fields.

List results use data plus currentPage/lastPage/perPage/total metadata, 15 per page. Search matches card number, employee name or display ID, with escaped literal LIKE parameters. Safe sorts are expiry_asc, issue_desc and issue_asc. Status filters active, expiring_soon, expired, revoked and replaced use database date/lifecycle predicates. Active means the Active display label, more than 30 days remaining; expiring_soon includes today through day 30, and expired means before today. expiry=expiring/expired can be combined with the other predicates. Expiry is a calendar-date state, never a new stored lifecycle status.

## Validity policy stays disabled by default

config/cards.php reads CARD_VALIDITY_POLICY with default unconfigured; .env.example explicitly retains that value. The existing local configuration was inspected and remains unconfigured. Neither eleven_months nor selected_years was activated in a real/production configuration. Only isolated tests and the temporary test-database HTTP server enabled a policy.

- unconfigured (or an unknown mode): initial issuance and renewal return 503 with a clear policy message. No mutation commits.
- selected_years: only integer 1/2 is accepted. Renewal reuses the original saved selection unless an explicit valid new selection is provided.
- eleven_months: 11 calendar months; a contradictory year selection returns a field-specific 422 policy mismatch. Initial API issuance omits validityYears in this mode. The current Next.js issuance form always sends 1 or 2, so it needs alignment if eleven_months is approved.

Dates use the application's configured calendar timezone (currently UTC), ISO Y-m-d, and no-overflow calendar addition: February 29 + one year becomes February 28; March 31 + eleven months clamps to February's last day, including leap years. The calculation uses [Carbon's documented no-overflow arithmetic](https://carbon.nesbot.com/guide/date-time-manipulation/addition-and-subtraction.html).

Renewal extends from the later of today and current expiry; it never discards remaining validity. The original issue date, issuing actor, number and token stay intact for existing-card renewal. Each issuance/renewal persists its policy and selected years, so a later configuration change does not rewrite existing expiration dates. A transition from a saved year term to eleven_months returns an explicit mismatch rather than silently discarding the saved selection. Reissue preserves an already established expiration and recorded term; it needs no new validity calculation and remains available for eligible, unexpired credentials even if new terms are subsequently disabled.

Updating backend validity does not update the date printed on an existing physical card. Frontend/operator integration must arrange updated printing or replacement, using the returned authoritative dates.

## Lifecycle and transaction safety

CardLifecycle is a small internal service. Transactions lock employee first, then affected card, and recheck eligibility inside the locks. The approach follows [Laravel's transaction/pessimistic-locking guidance](https://laravel.com/framework/docs/13.x/queries). A unique nullable current_employee_id slot independently enforces one current credential per employee. Expired but unreplaced credentials retain the slot and must be renewed/reissued through the appropriate operation rather than duplicate-issued.

Issuance requires an active, nondeleted employee. New physical renewal marks the old credential replaced, releases its slot, and creates a new official number/token with a new expiration in the same transaction. Reissue does the same but preserves the old expiry and refuses expired credentials. Deactivation records revoked, releases the slot and permanently prevents that credential from being reactivated through this API; it remains available even if the employee has become inactive/deleted. A later explicit new issuance is a distinct credential, never reactivation. Repeated transitions against replaced/revoked credentials return 409.

An in-place renewal leaves the same current credential. Therefore an existing renewal followed by reissue can both succeed as valid serialized operations, with the replacement inheriting the renewed expiry. If reissue wins first, renewal of the now-replaced old ID returns 409. The invariant in both outcomes is one current credential and no lost validity update. The unchanged frontend sends no revision/idempotency precondition for a renewal; intentional sequential in-place renewals each extend the term and each create an audit event.

Lifecycle events record card/employee/administrator IDs, timestamp, operation, encrypted reason, previous/new references and previous/new expiry. Initial issuance records issuance; existing renewal records renewal; new physical renewal records renewal and replacement; reissue/deactivation record their respective event. Tokens are never included. Eloquent update/delete attempts on lifecycle event records throw, making the application audit path append-only. Database failure while writing an event rolls back the entire card/status/slot change; no successful API response precedes commit.

## Migration and legacy preservation

Additive migration: database/migrations/2026_10_15_000004_add_smart_card_credentials.php.

Existing id_cards gains unique nullable verification_token_digest, encrypted recoverable verification_token, unique nullable current_employee_id FK, issued_by FK, validity_policy and validity_years. The enum retains every old value and adds replaced. Existing unique card_number/qr_code_hash indexes remain; those two columns permit null during new credential creation, with official number filled before commit and old QR hash unused for new cards. The small card_lifecycle_events table contains restrictive foreign keys and structured operation history. Its model does not accept ordinary update/delete operations.

The upgrade does not invent credentials, slots, policy metadata or audit history for historical rows. Legacy qr_code_hash is never queried by new public verification. All original numbers, hash values, active/expired/revoked/pending_print statuses, issue/expiry dates, printer names, verification counters, timestamps, soft deletions and employee links were compared before/after migration: **80 checks passed**.

EmployeeResource now uses the same IdCardResource for current and historical cards, including replaced cards. Legacy expired maps to DTO active with date-derived Expired label, preserving the distinction from revoked; pending_print maps to DTO revoked as an unissued/ineligible legacy record. Original statuses remain unchanged in MySQL. Legacy cards have an empty verificationToken, so they cannot produce a working new QR or use the new renewal/reissue transitions. An administrator must explicitly issue a real credential under an approved policy. No automatic legacy token enrollment or historical row overwrite occurs.

This migration intentionally refuses down(): removing the new fields/history would destroy revocation and lifecycle data. Recovery requires a reviewed backup restore, not a destructive rollback. The migration was applied successfully to the dedicated test database and, after confirming all earlier migrations were already applied, the local tawakal_erp database. No destructive migration was run on the local employee database; keys/accounts/data were retained.

## Privacy and public verification

Each token is 32 cryptographically random bytes (256 bits), base64url encoded to 43 characters. A keyed SHA-256 HMAC with the smart-card domain prefix is the unique lookup digest. The actual token is separately encrypted using existing Laravel encryption and returned only through authenticated card/employee DTOs for QR printing/reprinting. Replacement generates a fresh, uniqueness-constrained digest/token; old encrypted credentials remain available only as authorized historical records.

Public verification accepts the restricted 43-character alphabet/length. Unknown credentials return safe invalid with no card object; malformed input returns Laravel 422 errors. Eligible current credentials return valid, expiring (0-30 days inclusive) or expired. Revoked/replaced/noncurrent credentials never return valid: the public enum maps them to revoked. Inactive, transferred, resigned or soft-deleted holders return safe invalid without holder details. Expiry day remains valid through that calendar day, labeled expiring.

The only returned public card fields are number, employeeName, employeeDisplayId, designation, issueDate and expiryDate. No public photo, raw storage path, CNIC, dossier, contact/reference information, token/digest or administrator record is returned. Private photos retain the existing authorized delivery endpoint. Responses use no-store; public verification is limited to 60 requests/minute/IP. Backend lookup/requests/log messages use digests or POST bodies, never raw secrets in backend query URLs/audit records. Sensitive token fields are excluded from flashed input. No QR image storage or new printing system was introduced.

Existing session, credentialed CORS and Sanctum CSRF settings remain intact. The HTTP test explicitly omits/invalidates CSRF headers to prove 419 responses, then uses bootstrap cookies and the decoded X-XSRF-TOKEN for normal cross-origin stateful requests.

## Verification results

All automated fixtures and independent HTTP clients use the guarded real MySQL tawakal_checkpoint1_test database, never SQLite or production employee data. Runtime remains PHP 8.3.31, Laravel 13.36.0, Sanctum 4.3.3 and MySQL 8.4.3; no dependencies or infrastructure were added.

| Check | Actual result |
|---|---|
| php artisan migrate --env=testing | Upgrade applied; final repeat: nothing to migrate |
| php artisan test --compact --stop-on-failure | **115 passed, 1163 assertions**, including Checkpoints 1/2/3 regressions |
| SmartIdCardTest | **33 passed, 442 assertions** |
| EmployeeConcurrencyTest | **12 passed, 108 assertions**, independent PHP workers/MySQL connections |
| php tests/card-legacy-migration-smoke.php | **80 legacy comparisons passed** |
| php tests/card-http-smoke.php | **42 HTTP checks passed** |
| php tests/candidate-http-smoke.php | **59 HTTP checks passed**, approval/rejection/photos/CSRF/replay |
| php tests/employee-http-smoke.php | Passed CRUD/photos/documents/ETag 428/412/soft deletion/logout |
| php artisan route:list | Passed, 30 routes |
| composer validate --strict | Passed; existing Windows Git ownership warnings do not affect Composer validity |
| composer audit --no-interaction | Passed, no vulnerability advisories |
| Scoped Pint, PHP syntax and git diff --check | Passed before commit |

Card feature coverage includes all portal roles and guest/inactive denial, both policies/default disabled/mismatch, one/two years, leap years/month ends, immutable server-owned numbers, inherited number collisions, token entropy/encryption and authorized reprint, duplicate/current-slot constraints, privacy/expiry boundaries, inactive/deleted employees, rate limits/CSRF, all lifecycle actions, both renewal types, no extension on reissue, repeated conflicts, append-only audit records and rollback after forced persistence failure. Candidate-approved employee issuance, employee history and list/search/status/expiry/sort/pagination compatibility also passed.

Actual independent card races: issuance/issuance produced one 201 and one 409, one card and one issuance event. Reissue/reissue, new-physical renewal/reissue, and deactivation/reissue each produced one 200 and one 409. In-place renewal/reissue passed the permitted serialized-outcome checks described above. Every race retained at most one current slot and left the obsolete token unable to verify valid. The seven existing employee/candidate concurrency tests also passed.

The real two-client HTTP flow covers admin login, issuance, authorized retrieval of the same reprint token, anonymous verification with only approved fields, in-place renewal, reissue, old QR revoked/new QR valid, new physical renewal, deactivation, repeat conflict, complete employee card history, six audit events, anonymous detail denial, missing/invalid CSRF 419 and logout. Generated accounts/fixture rows are removed afterward. Its configured term exists only in ignored, temporary test-database settings. No frontend browser/camera/physical-print integration result is claimed.

## Remaining blockers and operator requirements

1. **Validity approval:** initial issuance and renewal remain disabled by default (503). Select and explicitly approve the production policy before activation. eleven_months also requires frontend alignment; the current issuance form always sends a one/two-year selection.
2. **Public CSRF bootstrap:** verification, like the candidate flow, needs GET /sanctum/csrf-cookie with credentials before POST and the decoded XSRF header. Current public verification/candidate frontend flows need that later integration change. CSRF was not weakened.
3. **Dashboard statistics:** /dashboard/summary remains outside this checkpoint. The current ID Cards page requests it; statistics are not implemented or simulated here.
4. **Legacy adoption/printing:** legacy records without new credentials need an explicit administrative new issuance after policy approval. Existing-card renewal requires updating/reprinting the physical expiry details. Public photos remain omitted pending separate disclosure review.
5. **Previous employee edit integration:** If-Match from the retrieved ETag is still required; the unchanged frontend does not send it yet.
6. **Hosting/browser verification:** actual PHP/MySQL/private-disk/session/CORS/HTTPS deployment configuration, access-log handling of frontend QR URLs and Laravel + Next.js browser/printing/scanner integration remain unverified. Preserve APP_KEY/EMPLOYEE_LOOKUP_KEY with database backups. No production readiness, merge or deployment is claimed.
