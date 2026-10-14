# Proposed Laravel frontend contract

These endpoints are prepared, not confirmed running services. `NEXT_PUBLIC_API_BASE_URL` is the Laravel origin; application endpoints use `/api/v1`. All requests send cookies and bypass persistent caches. JSON resources use `{data: record}`. Lists use `{data: records, meta: {currentPage,lastPage,perPage,total}}`; query keys are `page,search,status,cardStatus,expiry,sort,category,role`. Laravel must authorize every administrative endpoint and provide server filtering/pagination.

Authentication: GET `/sanctum/csrf-cookie` (outside prefix), POST `/auth/login` with `{identifier,password,remember}`, GET `/auth/me` returning `{data:{id,name,email,role}}`, POST `/auth/logout`. Roles: `admin`, `co-admin`, `manager`. Use Sanctum stateful SPA cookies, HTTPS, correct session domain, credentialed CORS and stateful frontend domains. The frontend sends the decoded XSRF-TOKEN cookie in X-XSRF-TOKEN. Session cookies must be HttpOnly. Passwords/tokens are never stored in browser storage.

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
