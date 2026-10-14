# Backend checkpoint 2: employee management

Branch: feat/laravel-employee-management. Verified base: c3ca24e8f792995c9a7f6a66ea1865fe980cc63c on feat/laravel-backend-foundation; fetching confirmed no newer base changes. All changes are inside laravel-backend/. No Next.js, HTML, portal-data.js, Vite, UI, main, merge or deployment changes.

The Laravel employee APIs are implemented. Existing frontend editing is intentionally blocked until it sends If-Match, as explicitly approved during this checkpoint. The backend does not fall back to session revisions or permit silent stale overwrites.

## Completed endpoints

All routes below require auth:sanctum and portal.role. Admin, Co-Admin and Manager retain the same existing employee access; no ownership rules or extra permissions are invented.

| Method | Endpoint | Result |
|---|---|---|
| GET | /api/v1/employees | 200, real search/filter/pagination |
| POST | /api/v1/employees | 201, creates the validated complete dossier, optional photo |
| GET | /api/v1/employees/{id} | 200, selected Employee and current ETag |
| POST with _method=PATCH | /api/v1/employees/{id} | 200, complete dossier update with If-Match |
| PATCH (also PUT) | /api/v1/employees/{id} | 200, complete dossier JSON string with If-Match |
| DELETE | /api/v1/employees/{id} | 204, soft deletion, retains files and card relationships |
| GET | /api/v1/employees/{id}/documents | 200, metadata for actual accessible files |
| GET | /api/v1/documents/{id}/download | Authorized private attachment |
| GET | /api/v1/employees/{id}/photo | Authorized private JPEG/PNG/WebP bytes |

Unknown/deleted employees and missing/ineligible files return 404. Guests receive 401, inactive/unsupported-role users 403. Stateful mutations retain Sanctum CSRF protection (419 when absent/stale). Invalid fields return 422 with Laravel field errors, including dossier.fullName/dossier.cnic/etc. Reads and mutations use no-store responses; downloads also use nosniff.

## Request/response contract

[employee-contract-example.json](employee-contract-example.json) contains a full documentation-only request and response example; it is not a seeded employee or a real person. [tests/Fixtures/EmployeeDossier.php](tests/Fixtures/EmployeeDossier.php) provides the complete test-only dossier exercised by the MySQL and HTTP tests.

The request stays multipart FormData: dossier is JSON.stringify(the complete five-step dossier); photo is optional binary. Updates through POST use _method=PATCH. Normal PATCH accepts the same dossier JSON string, including through a JSON request body. No email or department input is required or invented. A missing photograph is not fabricated; omitting photo during an update retains the existing file.

A single response is {data: Employee}. Lists are {data: Employee[], meta: {currentPage,lastPage,perPage,total}}, fixed at 15 records/page. id is the actual database key as a string; displayId is the immutable human-readable employee ID. department is an empty string when unassigned. The photo property is omitted when no accessible uploaded photo exists. All five dossier sections persist and return under their exact frontend keys, including employer rowId, both references, checklist booleans and declaration/signature/signing date.

Office roles clear vehicleRegistration, drivingLicence and tokenTaxStatus. Motorcycle/van roles require vehicle registration and licence. Gender, marital status, blood group, token-tax options and role-category values match the existing form. Dates use validated YYYY-MM-DD; dateOfBirth cannot be in the future or after joiningDate. CNIC requires the 12345-1234567-1 shape. The legal declaration wording was not edited or duplicated; the backend stores explicit acceptance, signature and signingDate.

A checklist check does not create a document. documents includes only existing employee-scoped files. history is [] because employment actions remain deferred. cards is [] without prior issued cards; existing issued legacy card records can be read without issuing or changing cards. Legacy expired cards retain active backend status with expiry derived from their actual expiry date. No qr_code_hash or fabricated verification credential is exposed; verificationToken is empty for legacy cards until the card checkpoint establishes real credentials. Pending-print legacy records are not represented as issued cards.

## Atomic revisions and concurrency

employees.revision is a database-backed unsigned integer, initially 1. Create/read/update responses emit a strong quoted tag such as ETag: "employee-42-v1". An update must send that exact tag as If-Match. Missing header returns 428; an outdated/invalid tag returns 412. The backend locks the current row with SELECT FOR UPDATE, checks the stored revision, writes the complete validated dossier/photo metadata and increments revision within the same MySQL transaction. Failed writes do not increment the revision. CORS allows If-Match and exposes ETag.

The current Next.js request helper does not retain/send ETag. It was deliberately left unchanged. A later approved frontend change must capture ETag from the employee retrieval, send If-Match when saving, and handle 428/412 by prompting the user to reload/review the newer record. This is the known integration blocker for employee editing; read/create APIs and the backend update API work independently.

Human-readable IDs derive from the database primary key, not row counts: EMP-year-zeroPaddedPrimaryKey. Legacy IDs are preserved; if one already occupies that candidate ID, a suffix avoids collision without changing the existing record. A database unique constraint remains the final guard. Simultaneous creation and creation after soft deletion were verified. Concurrent duplicate CNIC requests produce one employee and one 422.

## Schema and data preservation

Added migrations:

- 2026_10_15_000001_complete_employee_dossiers.php: evolves employees in place. Adds full_name/index, encrypted dossier LONGTEXT, unique keyed cnic_lookup, private photo_path and revision. Makes legacy first_name, last_name, email and department nullable, expands phone to encrypted-capable TEXT, and aligns status with active/inactive/transferred/resigned. employee_id temporarily supports NULL inside a creation transaction until its primary-key-derived ID is assigned; completed API-created records always have an ID.
- 2026_10_15_000002_create_employee_documents_table.php: adds employee_documents with employee FK, encrypted name/path, type and timestamps. No document upload endpoint or UI is added.

The original employee and card migrations are unchanged. Existing employee IDs, primary keys, timestamps, department and card foreign keys survive the forward migration. Known legacy contact data is moved into the encrypted dossier; old plaintext email/address/emergency_phone/photo_url/blood_group copies are cleared after preservation, and phone is encrypted. Original email/photo URL/status are retained in an encrypted _legacy section that is never serialized. Legacy suspended/pending statuses become inactive without inventing active employment; the original status remains encrypted. Missing historical form details remain blank/default and need actual HR completion, with no fake CNIC, birth date, references or declaration acceptance generated. No legacy remote photo URL is fetched or exposed.

Because reverting to mandatory legacy email/department and dropping dossiers would lose new data, the employee migration refuses automatic down(). Reversal requires a reviewed database backup restore. Back up the database and encryption keys before a production migration; no production migration was run here.

## Sensitive data and private files

The dossier uses Laravel's supported encrypted:array cast; phone uses the encrypted cast. CNIC is not duplicated in plaintext. An indexed HMAC-SHA256 digest allows exact CNIC lookup/uniqueness, including soft-deleted employees. It uses EMPLOYEE_LOOKUP_KEY when configured and otherwise APP_KEY. A lookup key must remain stable; changing a fallback APP_KEY requires setting the prior lookup key explicitly or reindexing the digests. Preserve APP_KEY/previous encryption keys to read existing records. See [Laravel encrypted casts](https://laravel.com/docs/13.x/eloquent-mutators#encrypted-casting).

Search accepts name, display ID, phone substring and exact formatted/compact 13-digit CNIC. Names/display IDs are queried with bound, escaped LIKE patterns; phone search decrypts the few hundred rows in memory and then paginates matching IDs in MySQL. This avoids a plaintext phone search copy. Partial CNIC search is not offered. status is a validated frontend enum. sort is whitelisted: newest (default), oldest, name_asc/name_desc (also name/-name), displayId/-displayId. Arbitrary SQL identifiers are rejected with 422. Card/expiry filters and employment actions remain for later checkpoints.

employee_private uses storage/app/private, never the public disk or a public storage symlink. Local signed-file serving is disabled. Photos go under employees/{internalId}/photos with generated filenames. Real MIME/type, image dimensions and the 3 MB limit are checked server-side; JPEG, PNG and WebP were tested with actual image bytes and misleading client filenames/MIME. Existing photos stay when omitted. Successful replacements update metadata only after upload; transaction failures roll back dossier/revision/photo metadata and remove the new upload, preserving the original file. Old replaced photos are removed after commit. Soft deletion retains files and relationships.

Document names and paths are encrypted in employee_documents. Only metadata matching DocumentRecord (id,name,type,uploadedAt) is serialized, with no filesystem path. Download resolves its owning active employee, applies the employee policy, verifies an employee-specific documents path, rejects traversal/cross-employee path substitutions, and checks file existence. Downloads are attachments with sanitized names and no-store/nosniff headers. All three approved portal roles may view all employees/documents; no narrower ownership permission existed to enforce. Guests, inactive users, soft-deleted parents, wrong path associations and absent files were tested and denied. No documents are created from checklist flags, and no document-upload interface is introduced.

## Verification

Local environment: PHP 8.3.31, Laravel 13.36.0, Sanctum 4.3.3, MySQL 8.4.3. Tests used only tawakal_checkpoint1_test on the isolated localhost:3308 instance, with ignored .env.testing credentials. The shared TestCase checks MySQL and the _test suffix before any RefreshDatabase/DatabaseTruncation operation. No development or production employee database was modified.

Executed:

~~~sh
php artisan migrate --env=testing
php artisan test --compact --stop-on-failure
php artisan route:list
composer validate --strict
composer audit --no-interaction
php tests/legacy-migration-smoke.php
php tests/employee-http-smoke.php
~~~

The legacy smoke intentionally rebuilds only the guarded test database into the original schema, inserts test fixtures, applies forward migrations and verifies preserved IDs/timestamps/relationships and encrypted legacy contacts. It is not for use on any application database.

**Final result: 50 feature tests passed, 364 assertions (22.70 seconds), against real MySQL.**

The feature suite includes all Checkpoint 1 authentication tests and employee coverage for each portal role, guests, full dossier round-trip/encryption, required/invalid fields, dates/CNIC/duplicate identity, employers/references, vehicle rules, all supported photo formats/invalid/oversize uploads, retention/replacement, rollback cleanup, normal and multipart updates, 428/412/ETag handling, unknown IDs, searches, status/sort/pagination, soft deletion, immutable IDs, actual document delivery/authorization, and public-data non-disclosure. Parallel PHP workers use independent MySQL connections and a start barrier to verify distinct creation IDs, duplicate identity enforcement and exactly one successful writer for simultaneous updates.

The real HTTP smoke passed with a Sanctum session against local Laravel/MySQL: login -> multipart employee/photo create -> search/list -> view -> private photo/document delivery -> multipart edit with If-Match -> retrieve full changed dossier from HTTP and MySQL -> stale edit rejection -> soft delete -> logout. Missing/stale revisions returned 428/412. Photos and document records survived the edit. Only test fixtures are generated, and the HTTP fixture account/files/employee are removed in finally. No demo account or employee seeder exists.

Composer manifest validated; audit found no security advisories. Focused Pint, PHP syntax and Git diff checks are included in final verification. Frontend checks were not rerun because no frontend files changed. The temporary PHP server and isolated MySQL instance are stopped after verification.

## Remaining blockers and boundaries

Frontend editing needs the explicitly deferred If-Match integration. Deployment PHP 8.3+, real hosting database credentials, shared frontend/API cookie domains and HTTPS remain unverified; hosting upload_max_filesize/post_max_size must allow a 3 MB image plus the dossier. Protected photo delivery relies on the same Sanctum cookie/domain setup as the existing frontend. No merge or deployment was performed.

Invitations, candidate approvals, ID-card issuance/security/lifecycle, manager CRUD, notifications, analytics and employment actions were not implemented. Existing deferred routes still return honest 503 responses; unimplemented proposed routes remain 404. Public verification still cannot access employee dossiers.

Exact repository-relative file changes are listed in employee-checkpoint-files.txt. The final pushed commit SHA is reported in the completion message and available from git log -1.
