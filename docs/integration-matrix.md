# Checkpoint 5 integration audit

Base: e328478405496030ffa54c57216cf41df0004cf9. Audit recorded before application changes. All application paths start /api/v1 except the Sanctum bootstrap.

| Frontend call | Backend route | Request -> response | Access | Audited status / mismatch |
|---|---|---|---|---|
| auth.login / me / logout | GET /sanctum/csrf-cookie; POST /auth/login; GET /auth/me; POST /auth/logout | identifier,password,remember -> 204; data user; 204 | anonymous login, session otherwise | Implemented; normal login bootstraps CSRF |
| employeesApi.list | GET /employees | page/search/status/cardStatus/expiry/sort -> PageResult Employee | portal roles | cardStatus/expiry ignored; numeric ID displayed instead of displayId |
| employeesApi.get | GET /employees/{id} | ID -> data Employee + ETag header | portal roles | ETag not captured; browser image cookies need verification |
| employeesApi.create | POST /employees | multipart dossier JSON, photo -> data Employee | portal roles | Existing validation/storage; browser full dossier/photo must be verified |
| employeesApi.update | POST /employees/{id}, _method=PATCH | multipart dossier/photo + If-Match -> Employee + ETag | portal roles | Frontend omits If-Match; 428; needs 412 reload flow |
| employeesApi.action | POST /employees/{id}/actions | EmploymentAction -> Employee | portal roles | Intentionally 503; employment actions deferred |
| employeesApi.documents / downloadDocument | GET /employees/{id}/documents; GET /documents/{id}/download | ID -> data metadata[] / private bytes | portal roles | Implemented; verify browser credentials/download |
| requestsApi.list / get | GET /employee-requests; GET /employee-requests/{id} | page/search/status/role -> PageResult / data EmployeeRequest | portal roles | Implemented; summary counters currently placeholders |
| requestsApi.submit | POST /employee-requests | token + multipart full dossier/photo -> persistence receipt | public token, stateful CSRF | No initial anonymous CSRF bootstrap |
| requestsApi.approve / reject | POST /employee-requests/{id}/approve or /reject | {} / reason -> data request with employeeId or rejectionReason | portal roles | Implemented; verify browser data/photo round trip |
| invitesApi.list / create | GET/POST /registration-invites | page / candidateName,designation,department,expiresAt,optional roleCategory -> real invite/token | portal roles | Existing dialog imposes no optional role restriction; keep omitted unless selected |
| invitesApi.validate | POST /registration-invites/validate | token -> safe InviteValidation | public, stateful CSRF | Missing anonymous bootstrap; malformed tokens need invalid-link UX |
| invitesApi.get (generic exported helper, unused screen) | GET /registration-invites/{id} | ID -> invite | portal roles | Not implemented/not used; remove unused unsupported exported operation |
| cardsApi.list / get | GET /id-cards; GET /id-cards/{id} | page/search/status/expiry/sort -> PageResult / IDCard | portal roles | Implemented; legacy missing-token labels misleading |
| cardsApi.issue | POST /id-cards | employeeId,validityYears -> IDCard | portal roles | Default 503 by design; frontend does not read actual policy |
| cardsApi.renew | POST /id-cards/{id}/renew | existing/new_physical -> IDCard | portal roles | Replayed in-place requests extend twice; server idempotency required |
| cardsApi.reissue / deactivate | POST /id-cards/{id}/reissue or /deactivate | reason,acknowledged / reason -> IDCard | portal roles | Implemented; browser QR lifecycle must be verified |
| cardsApi.verify | POST /verify-card | token -> safe PublicVerification | public, stateful CSRF | Missing anonymous CSRF bootstrap; current backend state authoritative |
| dashboardApi | GET /dashboard/summary | {} -> data DashboardSummary | portal roles | Missing; implement focused counts without private dossiers/QR secrets |
| managersApi.list / get / create / update / remove | GET/POST /managers; GET/PATCH/DELETE /managers/{id} | manager fields / initialPassword creation only -> resource/page/204 | portal roles when implemented | Missing/deferred; no CRUD in this checkpoint; frontend must show unavailable state |
| notificationsApi.list / summary / read / clearRead | GET /notifications[?summary=1]; POST /notifications/{id}/read; POST /notifications/clear-read | query or {} -> page / unreadCount / notification / 204 | portal roles when implemented | Missing/deferred; no notifications in this checkpoint |

Planned minimal additions: authenticated card-policy and candidate-request summary reads; renewal idempotency header/ledger; shared card eligibility predicates for statistics and employee filters. Existing visuals and non-implemented modules remain intact. Final completion report records implementation and real browser evidence separately from the original audit.

## Implemented resolution

The audit table above intentionally preserves the pre-change findings. All listed integration mismatches for implemented modules are now resolved and covered by the real-backend browser suite and focused regression tests. Employee filters run before pagination, ETags travel with individual GET results, public mutations bootstrap CSRF, legacy records do not impersonate live credentials, and renewals require stable per-attempt keys. The unused invitation GET helper was removed. Managers, notifications and employment actions remain deferred, without simulated success.

| Added read | Response | Access / validation |
|---|---|---|
| GET /api/v1/id-cards/policy | data: mode, canIssue, canRenew, validityYears, termLabel | Authenticated portal roles; no-store; no policy mutation endpoint |
| GET /api/v1/employee-requests/summary | data: total, pending, approved, rejected, fieldRoles, activeInvitations | Authenticated portal roles; actual SQL counts; no-store |
| GET /api/v1/dashboard/summary | data: employee/card/manager/request counts, expiring-card summaries | Authenticated portal roles; no-store; no dossier or QR token |

POST /api/v1/id-cards/{id}/renew requires Idempotency-Key and the original strong card If-Match. Missing/invalid operation key is 422; a genuinely new operation with missing revision is 428 and stale revision is 412. Changed actor/card/options/requested validity/original revision for a reused key is 409. Exact replay is checked before the changed revision and returns the stored result without another extension/event. The authenticated GET /api/v1/id-cards/{id}/renewal-preview read returns the reviewed source ETag and server-calculated current/proposed expiry; detail also exposes ETag through existing CORS. The form retains unresolved metadata across refresh without automatic submission.

Active includes valid expiring credentials; Expiring Soon is its subset. Shared scopes supply dashboard and both directories before pagination. The existing audit table records pre-change findings, not the current definition. See `lib/api-contract.md`, `docs/checkpoint-5-report.md` and the superseding acceptance evidence in `docs/checkpoint-5-acceptance-report.md`.
