# Checkpoint 3: candidate registration and enrollment

Branch: `feat/laravel-candidate-registration`. Base verified locally and against origin: `e136856d4e40f0d08aecb049467397d48a1ffbf6` on `feat/laravel-employee-management`. The completion message identifies the final commit SHA; `git rev-parse HEAD` identifies this checkout. Only the 24 backend files in [candidate-checkpoint-files.txt](candidate-checkpoint-files.txt) changed. No merge or deployment was performed.

The persisted workflow is invitation -> token validation -> pending candidate request -> authorized review -> approval with real employee enrollment, or rejection with a retained reason. All three existing portal roles use the existing authentication/role middleware; no extra permissions or modules were added.

## Endpoints

All paths below start with /api/v1.

| Method | Path | Access and result |
|---|---|---|
| POST | /registration-invites/validate | Public, safe valid/invalid/expired/used state; validation does not consume the invitation |
| POST | /employee-requests | Public with unused unexpired invitation; multipart token/dossier JSON/photo; 201 persistence receipt |
| GET | /registration-invites | Active authenticated portal role; real pagination and recoverable invitation tokens |
| POST | /registration-invites | Active authenticated portal role; 201 actual database invitation and generated token |
| GET | /employee-requests | Active authenticated portal role; page/search/status/role, 15 records per page |
| GET | /employee-requests/{id} | Active authenticated portal role; actual selected application, 404 if unknown |
| GET | /employee-requests/{id}/photo | Active authenticated portal role; scoped private photograph, 404 if unavailable |
| POST | /employee-requests/{id}/approve | Active authenticated portal role; pending only, actual employeeId after atomic enrollment |
| POST | /employee-requests/{id}/reject | Active authenticated portal role; pending only, required non-empty reason |

The existing auth, employee CRUD, private employee files, ETags/revisions and deferred unrelated routes remain in place. Submission alone creates no employee. Approval creates no ID card.

## Contracts

[Request/response examples](candidate-contract-example.json) include invitation creation, public validation, the full five-section multipart dossier, the public receipt, administrative review/list pagination, approval and alternative rejection. Example values are documentation only. Real IDs/tracking IDs and tokens come from persistence, not the client.

Create invitation JSON requires candidateName, designation, department, future expiresAt; optional roleCategory accepts office/motorcycle/van. The designation restriction is compared after trimming and case normalization; the optional role restriction must match. Candidate name spelling corrections are permitted.

Public submission returns only data.id, trackingId, status, submittedAt and documents:[]. This is the confirmation the current success screen reads. It deliberately does not return the full private EmployeeRequest DTO publicly. Authorized list/review/decision responses return that DTO: dossier, optional authenticated photo URL, actual employeeId after approval or encrypted rejectionReason after rejection. Checklist boxes never generate artificial document records.

Status filters are pending/approved/rejected. Role filters accept the three canonical values and the existing frontend display labels. Search matches tracking IDs, decrypted protected names for this small system, and exact formatted or compact CNIC through a keyed digest. Name search scans protected names before SQL pagination; revisit indexing if request volume grows far beyond the intended 200-300 employee system.

401/403 protect administrative access; unknown resources return 404. Consumed/expired submission, repeat/conflicting review, missing stored enrollment data or duplicate employee identity return 409. Missing/invalid stateful CSRF returns 419. Field errors use Laravel 422 errors including dotted dossier paths. Public limits return 429; genuine server failures remain 500 rather than simulated success.

## Database and privacy

Additive migration: `database/migrations/2026_10_15_000003_create_candidate_registration_tables.php`.

- registration_invites: protected candidate name, separately encrypted recoverable token, unique keyed token_digest, safe designation/department and optional role, creator FK, microsecond created/expiry/used timestamps.
- candidate_requests: unique invitation FK, immutable PK-backed REQ-year-id tracking ID, pending/approved/rejected status, encrypted full dossier/name/private photo path/rejection reason, protected CNIC lookup, unique nullable employee FK, reviewer FK and timestamp.
- Existing employees, IDs, cards, keys and historical data are preserved. The two new tables can be dropped in dependency order by this migration's down method; that is destructive to candidate records and was not run on the local employee database.

Tokens use 32 cryptographically random bytes (256 bits), base64url encoded to exactly 43 characters. Validation restricts the alphabet/length. Lookup uses a keyed HMAC with a separate invitation domain prefix; token/name ciphertext is stored with existing Laravel encryption. Actual tokens appear only in authorized invitation responses and the candidate's request body, never query URLs in backend tests/logs. Public responses omit token digests, creator/reviewer identities, dossiers, CNIC, storage paths and directory data. Responses use no-store; photos additionally use private and nosniff headers. Token/dossier fields are excluded from Laravel's flashed input.

Public validation is limited to 30 requests/minute/IP. Submission is limited to 10/minute/IP plus 5/minute/token digest; limiter keys contain no raw token. Existing session, CSRF, credentialed CORS and secure password hashing remain unchanged.

Submission locks the invitation and creates the application, tracking ID and consumed marker inside one transaction, rechecking expiration after file work. A unique invitation FK provides an additional duplicate guard. Approval/rejection locks the application and requires pending status. Approval reuses the small EmployeeEnrollment service extracted from Checkpoint 2 creation; existing update/delete/ETag logic was not refactored. Employee creation and approved linkage commit together. Existing/deleted employee CNIC identities remain reserved; database uniqueness guards simultaneous enrollment through separate requests.

Photos reuse the actual MIME/content/dimension checks and 3 MB limit. Candidate photos are kept outside public storage on employee_private, using generated filenames and authenticated scoped delivery. Approval copies the source to a generated employee-owned private path. The source survives approval/rejection/failure. New destination paths are recorded before file IO so database or partial-copy failures can remove staged files after rollback. Cleanup does not remove previously referenced photographs. Storage cleanup failure still needs operator attention; a database transaction cannot recover from an unavailable filesystem or a hard process crash by itself.

## Verification

Verified PHP 8.3.31, Laravel 13.36.0, existing Sanctum 4.3.3 and real MySQL 8.4.3. No dependency/infrastructure additions.

| Check | Result |
|---|---|
| php artisan migrate --env=testing | New migration applied successfully; final repeat: nothing to migrate |
| php artisan test --compact --stop-on-failure | **77 passed, 663 assertions**, including Checkpoint 1/2 regressions |
| CandidateRegistrationTest | **23 passed, 274 assertions** |
| EmployeeConcurrencyTest | **7 passed, 49 assertions**, independent PHP workers and real MySQL connections |
| php tests/candidate-http-smoke.php | **59 checks passed** through actual HTTP |
| php tests/employee-http-smoke.php | Passed real create/list/view/edit/retrieve, full dossier, photos/documents, 428/412 revisions, soft deletion and logout |
| php artisan route:list | Passed, 27 routes including Sanctum CSRF |
| composer validate --strict | Passed; Composer emitted the existing Windows Git ownership warning |
| composer audit --no-interaction | Passed, no vulnerability advisories; network access was required |
| Pint and php -l tests/candidate-http-smoke.php | Passed |
| git diff --check | Passed |

Feature tests verify encrypted storage and token entropy, all supported roles, privacy, safe validation statuses and exact expiration boundary, rate limits, all five dossier sections, photo validation/storage, name corrections and invitation restrictions, real selected review/search/filters/pagination, approval/rejection, soft-deleted duplicate CNIC, repeated decisions, database rollback, partial-copy cleanup and missing-file/invalid stored dossier behavior.

True simultaneous candidate tests: duplicate submission -> one 201 and one 409, one request and no employee; approval/approval -> one 200 and one 409, one employee; approval/rejection -> one 200 and one 409, one final decision; two applications with the same CNIC approved in parallel -> one 200 and one 409, one employee with the other request still pending. The three existing employee creation/update concurrency tests also passed.

HTTP smoke uses separate admin and anonymous cookie jars, a Sanctum CSRF cookie bootstrap, missing and invalid CSRF attempts (419), actual multipart photo/dossier submission, private review, approval/employee retrieval/photo/revision, a second application rejected with reason, conflicting decisions and token reuse (409), and logout. The helper explicitly suppresses its automatic CSRF header for the missing-header check. It prints assertion labels/statuses, never private payloads/tokens, and returns exit 1 on workflow failure.

Every automated test and HTTP fixture write uses the guarded dedicated MySQL tawakal_checkpoint1_test database. HTTP smoke server uses an ignored .env.smoke copied from isolated test settings with a non-testing application environment; its real CSRF/session middleware stays enabled. Test accounts are individually generated and removed, with no fixed/demo password. The smoke server was temporary; existing local portal services and account were preserved. The reviewed additive migration was also applied to local tawakal_erp after confirming all earlier migrations were already applied; no existing rows or encryption keys were changed and no destructive migration was run there.

## Remaining integration blockers

1. Next.js candidate validation/submission must initialize GET /sanctum/csrf-cookie with credentials, then send the decoded XSRF-TOKEN as X-XSRF-TOKEN on both public POSTs. The current candidate form does not do this. Backend CSRF was not weakened; frontend remains unchanged at this checkpoint.
2. Checkpoint 2's frontend employee edits still need the returned ETag as If-Match. Missing headers correctly return 428 and stale headers return 412.
3. Hosting PHP/MySQL/filesystem/CORS/session configuration and actual Laravel + Next.js browser integration remain unverified. Existing APP_KEY and identity lookup key must be retained with database backups. No production readiness, merge, deployment or unrelated module completion is claimed.
