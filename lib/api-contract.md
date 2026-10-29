# Proposed Laravel frontend contract

These endpoints are prepared, not confirmed running services. `NEXT_PUBLIC_API_BASE_URL` is the Laravel origin; application endpoints use `/api/v1`. All requests send cookies and bypass persistent caches. JSON resources use `{data: record}`. Lists use `{data: records, meta: {currentPage,lastPage,perPage,total}}`; query keys are `page,search,status,cardStatus,expiry,sort,category,role`. Laravel must authorize every administrative endpoint and provide server filtering/pagination.

Authentication: GET `/sanctum/csrf-cookie` (outside prefix), POST `/auth/login` with `{email,password,remember}`, GET `/auth/me` returning `{data:{id,name,email,role}}`, POST `/auth/logout`. Roles: `superadmin`, `manager`. Use Sanctum stateful SPA cookies, HTTPS, correct session domain, credentialed CORS and stateful frontend domains. The frontend sends the decoded XSRF-TOKEN cookie in X-XSRF-TOKEN. Session cookies must be HttpOnly. Passwords/tokens are never stored in browser storage.

All domain models and mutation payloads are declared in `contracts.ts` and `services.ts`. Server IDs and display IDs are separate. Employee/card dates use ISO dates; timestamps use ISO 8601. Employee states: active/inactive/transferred/resigned; card backend states: active/revoked/replaced, with expiry labels derived from dates. Candidate states: pending/approved/rejected. Invite states: valid/invalid/expired/used. Managers never include passwords in responses.

Employees: GET/POST `/employees`, GET/PATCH `/employees/{id}`. Create/update use multipart `dossier` (JSON) and optional `photo`; updates POST with `_method=PATCH`. Unchanged photo/document metadata must be retained by Laravel. Dossier keys include dateOfBirth (legacy dob), cnic (legacy CNIC/nic), mobileNumber (legacy mobile/phone), and signingDate (legacy registration date). See Dossier for the complete five sections. Checklist verification is separate from uploaded documents. Office role excludes vehicle information. Employer rowId is a UI identifier, not a server record ID.

POST `/employees/{id}/actions` accepts the EmploymentAction discriminated union and returns the updated employee/history. GET `/employees/{id}/documents` returns metadata. GET `/documents/{id}/download` must authorize access and return bytes, never a public protected-document URL.

Invites: GET/POST `/registration-invites` with candidateName, designation, department, expiresAt. Create returns a backend-generated token. POST `/registration-invites/validate` accepts `{token}`, returning InviteValidation. POST `/employee-requests` uses the dossier multipart payload plus token. Validate and submit are public but backend gated; token consumption must be atomic. GET list/detail request endpoints are protected. POST `/{id}/approve` returns request with employeeId generated server-side; POST `/{id}/reject` accepts reason. Only pending requests transition.

Cards: GET list/detail `/id-cards`; POST create `{employeeId,validityYears}` returns official IDCard. POST `/{id}/renew` accepts option existing/new_physical; POST `/{id}/reissue` accepts reason, acknowledged and atomically revokes the old credential; POST `/{id}/deactivate` accepts reason. Retain card history. Backend returns authoritative numbers, dates and verificationToken. POST `/verify-card` accepts `{token}`, returns only PublicVerification. Never return CNIC, private contacts, documents or security hashes publicly.

Managers: GET/POST `/managers`, GET/PATCH/DELETE `/managers/{id}`. InitialPassword is creation-only; PATCH excludes passwords. Backend prevents self deletion/deactivation and enforces Co-Admin/Manager permissions. Notifications: GET `/notifications`, POST `/{id}/read`, POST `/clear-read`; summary query returns `{unreadCount}`. GET `/dashboard/summary` returns Result<DashboardSummary>.

Errors: 401 clears client session; 403 denied; 404 missing; 409 conflict; 419 CSRF/session expiration; 422 `{errors:{field:[messages]}}`; 429 rate limit; 500/503 unavailable. No failed mutation produces success. All IDs must be nonempty in successful responses.

Unresolved production rules: card validity (11 months vs 1/2 years) requires agreement before production issuance; frontend submits the current 1/2-year selection but server owns dates. Public verification is restricted to the safe model. Enrollment email is absent from the approved form and must not be invented to satisfy the legacy backend. Declaration wording must remain sourced from the approved legacy reference.

Dashboard includes activeCards/revokedCards separately from employee totals. Card status filters expiring_soon/expired are date predicates, replaced/revoked are backend states. Current card is the latest issued active backend credential; historical cards are never substituted for missing current credentials. Form photo uploads are optional on update and retain the stored original unless replaced.

## Legacy dossier mapping

| Approved HTML data | Canonical frontend payload |
|---|---|
| personal.fullName/fatherName/designation/joiningDate | fullName/fatherName/designation/joiningDate |
| personal.dob | dateOfBirth |
| personal.gender/maritalStatus/dependents/bloodGroup/cnic/cnicExpiry | gender/maritalStatus/dependents/bloodGroup/cnic/cnicExpiry |
| personal.photo | multipart photo file; existing photo URL remains response metadata |
| contact.address/homePhone/mobile | residentialAddress/homePhone/mobileNumber |
| contact.emergencyContact1/emergencyContact2 (HTML emergency1/emergency2) | emergencyContact1/emergencyContact2 |
| previousEmployment | employers (organization, designation, duration, address, phone); rowId is UI only |
| references[0]/references[1] | primaryReference/secondaryReference (name, relation, contact) |
| specialRoles.category | roleCategory (office, motorcycle, van); labels/Urdu never change values |
| specialRoles.vehicleRegNumber/licenseNumber | vehicleRegistration/drivingLicence |
| specialRoles.tokenTaxPaid (candidate tokenTaxStatus) | tokenTaxStatus |
| checklist.cnicCopy/bloodGroupReport/utilityBillCopy | checklist.cnic/bloodReport/utilityBill |
| checklist.photosCount (4 or 0) | checklist.photographs boolean; verification only, not uploaded file count |
| declaration.solemnAffirmed/applicantSignature/declarationDate | declarationAccepted/signature/signingDate |

Read-only metadata is not resubmitted as a file. Laravel must retain existing documents and photo during updates unless a replacement file is explicitly supplied. No email or fake attachment is invented.

References: [Laravel Sanctum SPA authentication](https://laravel.com/docs/12.x/sanctum), [ZXing browser API](https://github.com/zxing-js/browser), [local QR generator](https://github.com/soldair/node-qrcode), [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation/navigate_event).

## Checkpoint 5 implemented integration

Public invitation validation, candidate submission and card verification bootstrap `/sanctum/csrf-cookie` before the first mutation. Concurrent bootstrap calls share one promise. Requests include cookies and the decoded `X-XSRF-TOKEN`. An explicit 419 refreshes public security state once and reports the error; it never replays the mutation. Network failures also never trigger an automatic mutation retry.

`employeesApi.get(id)` returns `{data, etag}`. Multipart updates use POST with `_method=PATCH` and `If-Match` from that specific fetch result. Missing revision returns 428; stale revision returns 412. The UI requires explicit reload and warns before discarding unsaved edits. Revisions are checked/incremented atomically in MySQL. Directory rows display `displayId` while URLs retain internal IDs.

`GET /api/v1/id-cards/policy` returns `{data:{mode,canIssue,canRenew,validityYears,termLabel}}`. Unconfigured policy disables issuance/renewal. Selected-year issuance includes the selected `validityYears`; eleven-month issuance omits it. Production defaults remain unconfigured.

`POST /api/v1/id-cards/{id}/renew` requires `Idempotency-Key` (16–100 ASCII letters, digits or hyphens). The body is `{option:"existing"|"new_physical",validityYears?:number}`. The UI generates one random key per explicit attempt and persists it in sessionStorage before sending, scoped to administrator, source card, option and original ETag. Refresh restores unresolved metadata without submitting. Stale entries remain reconcilable; account changes remove other-account metadata. No credentials, QR tokens, CNICs, dossiers or employee-edit revisions are stored. The database stores only its SHA-256 digest, actor, source card, options and result card. Exact replay returns the existing result without extending validity or creating another event. Reusing a key for another actor/card/options/original revision returns 409. Genuinely new renewals require a strong card If-Match: missing is 428, stale or weak is 412. Replay is checked before the changed revision. Missing/invalid keys return 422. A new deliberate action uses a fresh key. Record locking, state checks, audit event and replay ledger insertion share one transaction.

Cards expose `credentialState` (`current`, `historical`, `ineligible`). Legacy rows without modern credential tokens are historical, never active QR credentials. Card statistics and directory filters share eligibility predicates: live active employee, modern token digest, current employee slot and active card. `active` means expiry today or later (including Expiring Soon); `expiring_soon` means today through day 30 inclusive; `expired` means before today. Revoked/replaced remain terminal backend states. Employee card-status/expiry predicates run in SQL before pagination.

`GET /api/v1/dashboard/summary` returns actual employee, eligible card, manager and pending-request counts plus the limited expiring-card list. It omits verification tokens and dossiers. `GET /api/v1/employee-requests/summary` returns actual total/pending/approved/rejected/fieldRoles/activeInvitations counts. Both require authentication and return `Cache-Control: no-store`. Private photo URLs use the session cookie in normal browser images; document downloads use credentialed fetch. Use the same browser hostname on both ports.

Managers CRUD and notifications remain unavailable; employment actions return 503. See `docs/integration-matrix.md`, `docs/checkpoint-5-report.md` and `docs/manual-integration-qa.md` for audit, measured results and isolated Windows QA commands.

### Acceptance hardening: card revisions and preview

Authenticated card detail and successful card mutation responses return strong `ETag: "card-{id}-v{revision}"` (already exposed by credentialed CORS). New and existing cards start at revision 1. Existing renewal, retirement by reissue/new physical renewal, and permanent deactivation increment the affected card revision inside the transaction; replacement credentials start at 1. Exact replays do not increment revisions. Existing pre-revision ledger entries are preserved with a null original revision and return 409 if replayed because their original precondition cannot be proven.

`GET /api/v1/id-cards/{id}/renewal-preview?option=existing|new_physical[&validityYears=1|2]` is authenticated, read-only and no-store. It returns the source card ETag and `{data:{currentExpiry,proposedExpiry,option,validityYears,policy}}`. Both preview and locked renewal use the same eligibility and `CardValidity::calculate` helper. The UI must compare the preview ETag with the reviewed card ETag before enabling confirmation. The final transaction rechecks revision, eligibility and policy; client-calculated expiry is never accepted.

For uncertain results the form reports uncertainty, fetches the latest card, retains original metadata and offers an explicit same-key reconciliation. It cannot create a second key while the attempt is unresolved. Confirmed success clears the entry. A definitive precondition/validation failure permits explicit discard followed by fresh review; otherwise discard requires a fresh GET with the unchanged original revision. Revision checks still prevent duplicate execution if an older in-flight request finishes after discard. A deliberately repeated renewal requires a new card/preview fetch and confirmation, then a fresh key. Older unresolved entries are flagged after 24 hours rather than silently deleted. Session storage must work before a new write is permitted.

Active and Expiring Soon overlap: 70 cards beyond day 30 plus 20 valid cards within day 30 means 90 active, 20 expiring, not 110 valid. Today is valid; yesterday is expired, using the application's timezone. Never sum activeCards and expiringCards. Badges may continue to label the subset Expiring Soon.

Authenticated card resources also supply `asOfDate` from the application timezone. Card badges and dashboard days remaining use that date rather than the browser's local calendar day, keeping midnight boundaries consistent with SQL counts and verification. Reload to refresh a previously fetched snapshot.
