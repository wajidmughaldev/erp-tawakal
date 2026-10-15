# Checkpoint 5 completion report

Branch: `feat/frontend-backend-integration`. Parent/base: `e328478405496030ffa54c57216cf41df0004cf9` (`feat/laravel-smart-id-cards`, verified before branching). No merge, main push or deployment. Exact changed-file manifest: [checkpoint-5-files.txt](checkpoint-5-files.txt). API audit: [integration-matrix.md](integration-matrix.md). Reproducible Windows commands and human checklist: [manual-integration-qa.md](manual-integration-qa.md).

## Implemented in code

- Anonymous CSRF bootstrap is coalesced; decoded XSRF header and credentialed cookies are used. Explicit 419 refresh does not replay a mutation. Network failure never silently retries a write.
- Employee GET captures its own ETag; multipart edit sends If-Match. A 412/428 requires explicit reload with an unsaved-change warning. Directory shows official display IDs and real combined SQL card/expiry filters before pagination.
- Stored photos display in the existing profile avatar. Employee/card/candidate images and document downloads remain private. Existing cookie authentication and dossier persistence remain intact.
- Anonymous English/Urdu invitation validation and submission work without an admin session. Malformed, expired and used links are handled. No role restriction is silently added.
- UI reads the server's validity policy; unconfigured policy disables issuance and renewal. Isolated tests cover selected-year and eleven-month modes. Normal application default remains unconfigured.
- Renewal requires Idempotency-Key. A transactional database ledger prevents replay from extending validity twice and binds the key to actor, card and submitted options. Explicit new actions receive new keys; simultaneous duplicates are tested. Only the digest is stored. The additive migration preserves prior card history and refuses destructive rollback of replay history.
- Legacy missing-token cards display as historical without active QR/lifecycle controls. Modern card issuance, preview, renewal, reissue, permanent deactivation and old-token invalidation use real backend state.
- Authenticated dashboard/request summaries use real database counts and shared credential eligibility predicates. Summary responses have no QR tokens or private dossiers and are not cached.
- Added a separate guarded real-backend browser suite; retained the existing mocked component suite. Temporary accounts/passwords are generated, not committed. Traces and sensitive screenshots are disabled. Fixture cleanup is limited to the manifest's owned records.

## Passed automated tests

Verified locally on Windows, PHP 8.3.31, Laravel 13.36.0, MySQL 8.4.3 and Next.js 15.5.27.

| Command/check | Observed result |
|---|---|
| `npm run lint` | PASS (TypeScript check) |
| `npm run build` | PASS; production integration bundle, 19 pages; isolated `.next/integration-build` |
| `npm run test:frontend` | 20 passed |
| `npm run test:browser` | 31 passed; mocked component/navigation responses, not real API evidence |
| `npm run test:integration` | 9 passed; actual Next.js, Laravel and isolated MySQL; no route mocks |
| `php artisan migrate --env=testing` | PASS; new additive migration applied, final run nothing pending |
| `php artisan test --compact --stop-on-failure` | 122 passed, 1,305 assertions; includes 13 real multi-process concurrency tests |
| `php artisan route:list` | PASS; 33 routes total (31 API routes, CSRF cookie, health) |
| `composer validate --strict` | PASS; Windows git ownership warning does not fail validation |
| `composer audit` | PASS; no vulnerability advisories found |
| `php tests/session-smoke.php` | PASS; real HTTP login, 419 checks, cookies, identity and logout invalidation |
| `php tests/employee-http-smoke.php` | PASS; all five sections, private files, edits, ETag 428/412, soft deletion |
| `php tests/candidate-http-smoke.php` | PASS; 59 checks, independent admin/anonymous clients, review/approve/reject/replays |
| `php tests/card-http-smoke.php` | PASS; 42 checks, both renewals, QR replacement/deactivation/history |
| Scoped Laravel Pint and `git diff --check` | PASS |
| `node tests/integration/visual-parity.mjs` | PASS; original class attributes preserved in all 10 changed TSX components |

The initial Smart ID HTTP run correctly returned 503 under an unconfigured smoke policy. It passed after explicitly setting the ignored smoke environment's test-only policy. The smoke environment was removed afterward. No normal environment policy was activated. The renewal migration was also applied additively to the local development database so the checked-out implementation can run there.

## Verified in a real browser

The dedicated suite ran production Next.js at `localhost:3200` and Laravel at `localhost:8200`, with MySQL database `tawakal_frontend_integration_test`. It used real UI interactions and separate browser contexts. These isolated ports preserve same-host, cross-port cookie behavior; normal developer ports 3000/8000 were left running separately.

1. Wrong/valid login, guest redirect, initial zero counts, empty/loading/error states.
2. Five-section employee creation, employers/references/checklist, photograph, official ID search, private photograph and document access/download, guest denial.
3. Two actual tabs: first update succeeds, stale update returns 412, explicit reload confirms discard, deliberate next update succeeds, photograph retained.
4. First-visit anonymous English candidate CSRF/validation/dossier/photo submission; administrator review and approval create one actual employee; used token is rejected.
5. Urdu RTL candidate submission; administrator rejection creates no employee.
6. Expired and malformed invitation UX and real missing-CSRF 419.
7. Disabled unconfigured policy, eleven-month mode without year selection, selected-year mode.
8. Card preview with actual photograph, locally rendered QR decoded from actual pixels, limited public verification, unknown-token/manual scan flow, real card filters, renewal replay returning unchanged expiry, reissue/new physical renewal/old-token invalidation, deactivation and historical missing-token display.
9. Dashboard totals compared with independent SQL counts after real create/approve/reject/card transitions; deferred modules unavailable; logout followed by private-access denial.

Safe local artifacts (ignored, not committed): `.next/integration-report/results.json`, `.next/integration-qa/login.png`, `.next/integration-qa/employee-form.png`, `.next/integration-qa/visual-parity.json`. Screenshots were inspected: login fields are blank; the empty form's CNIC field is masked. Existing styles/layouts are retained; this is class-preservation and visual inspection evidence, not a pixel-perfect baseline comparison. Global CSS, branding and legacy HTML/Vite files were untouched.

Final cleanup confirmed zero employee/request/card/renewal fixtures in the integration database, no credential fixture manifest, and integration policy restored to unconfigured. No raw passwords, full CNICs, invitation URLs or QR payloads are included in this report or committed fixtures.

## Still requiring human testing / genuine blockers

- Camera permission/focus/scanning on actual intended devices, and physical card dimensions, duplex alignment and printed QR readability. Browser QR decoding does not prove camera/printer hardware behavior.
- Deployment HTTPS, final frontend/API domains, credentialed CORS, secure cookies/session persistence, private storage and production PHP/MySQL configuration. No deployment was performed.
- Product approval of the production validity policy; issuance/renewal remain disabled until configured deliberately.
- Managers CRUD, employment actions and notifications are still deferred. This checkpoint does not claim a complete production-ready ERP.
