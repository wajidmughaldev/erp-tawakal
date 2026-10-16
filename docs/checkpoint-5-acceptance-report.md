# Checkpoint 5 acceptance hardening

Branch: `fix/checkpoint5-acceptance-hardening`, based on verified `c1649016ba7e42eddbf8eff2a387f4370ec8214a`. Only the two approved acceptance fixes are included. No merge or deployment. Exact changes are listed in [checkpoint-5-acceptance-files.txt](checkpoint-5-acceptance-files.txt).

## Active Cards

The shared `IdCard::displayStatus('active')` scope now includes eligible current credentials expiring today or later. Expiring Soon is the inclusive today-through-day-30 subset. Expired starts yesterday. Revoked, replaced, historical missing-token, inactive-holder and deleted-holder cards cannot enter Active.

| Fixture | Before | After |
|---|---:|---:|
| Active: 70 beyond 30 days plus 20 within 30 days | 70 | 90 |
| Expiring Soon | 20 | 20 |
| Expired | 5 | 5 |
| Revoked | 5 | 5 |

Do not add Active and Expiring Soon. Both directories, combined employee/card filters and dashboard SQL use the shared scope. Badges may still say Expiring Soon. Authenticated resources supply the server's application-timezone `asOfDate`; badges and dashboard remaining days use that date instead of the browser's local date.

The dashboard retains its five-column layout and all approved classes. Active Cards is displayed as supporting text in the existing Expiring ID Cards tile; no tile or column was added. The renewal form retains its existing structure/classes and adds only the small expiry summary and recovery controls. Card preview/print layout files and global CSS were untouched.

## Data-preserving migration

`2026_10_15_000006_add_card_revisions.php` adds non-null unsigned `id_cards.revision` with default 1 (existing rows initialize to 1) and nullable `card_renewal_operations.original_revision`. No employee, candidate, card, ledger or lifecycle record is deleted. Existing ledger rows have no provable original revision; they are retained and return 409 if their old key is replayed rather than being guessed or executed again. Destructive rollback is intentionally refused.

## Renewal contract

- Authenticated `GET /api/v1/id-cards/{id}` returns strong `ETag: "card-{id}-v{revision}"`, exposed through existing credentialed CORS.
- Authenticated read-only `GET /api/v1/id-cards/{id}/renewal-preview?option=existing|new_physical[&validityYears=1|2]` returns the source ETag plus current/proposed expiry, option and policy. It is no-store and writes no audit/ledger data.
- POST renewal requires `Idempotency-Key` and the original card `If-Match`. A genuinely new operation with missing revision receives 428; stale/weak/mismatched revision receives 412. Invalid operation keys remain 422.
- Under the existing employee-then-card locks, exact ledger replay is checked first and bound to administrator, source card, option, explicitly requested validity and original revision. Changed replay inputs receive 409. Exact replay can succeed after the original operation changed the revision and never increments validity/revision/events again.
- New operations check revision, eligibility and policy in the transaction. In-place renewal increments the current card revision; reissue/new physical renewal/deactivation increment the retired card revision. New credentials start at 1. The one-current-card constraint and audit order are preserved.
- Preview and transaction share the same validity helper. A tested example: current expiry 2026-01-31 with selected one-year validity proposes and applies 2027-01-31. The eleven-month test proposes/applies 2026-12-31. Client expiry dates are never used as authority.

## Recovery and deliberate repeats

Before transmission the form persists only random key, administrator ID, card ID, option, original card ETag and creation time in sessionStorage. It stores no credentials, QR tokens, CNICs, dossiers or employee-edit revisions. Storage failure prevents transmission. Refresh restores the attempt but sends no write automatically. Metadata for another signed-in account is removed; invalid metadata blocks that visit until a fresh review. Entries older than 24 hours are flagged and remain reconcilable rather than silently expiring.

A lost response shows uncertainty, fetches the latest card and retains the same key/revision for explicit retry/reconciliation. Confirmed success clears the entry. A definitive revision/validation rejection permits explicit discard; otherwise discard requires a fresh read showing the original revision unchanged. An older in-flight request cannot cause a double extension after discard because a different-key write with that same revision must conflict. A deliberate next renewal requires a fresh card/preview, explicit confirmation and a new key. The form's Review another renewal action performs that fresh review.

## Evidence

The real-browser suite uses isolated MySQL database `tawakal_frontend_integration_test`, real Laravel/Next.js servers and separate authenticated/anonymous contexts. No synthetic success responses are used. Its acceptance test deliberately fails the browser transport only after the actual Laravel transaction returned 200, then refreshes and reconciles the same operation.

| Verification | Actual result |
|---|---|
| Laravel full suite | 129 passed, 1,415 assertions |
| MySQL concurrency | All 14 multi-process cases passed within the full suite; same-key duplicates apply once, different keys/same revision produce 200/412 |
| Frontend unit tests | 24 passed |
| Existing browser regression plus storage-failure case | 32 passed; mocked component/API responses, separate from the real-backend suite |
| Real-backend Playwright | 10 passed, including all acceptance recovery/stale-tab scenarios |
| TypeScript lint | PASS |
| Next.js production build | PASS, 19 pages, isolated integration output directory |
| Employee HTTP smoke | PASS, dossier/private file/employee ETag regressions preserved |
| Candidate HTTP smoke | PASS, 59 checks |
| Smart ID HTTP smoke | PASS, 42 checks, updated If-Match contract |
| Composer validation / security audit | PASS; no vulnerability advisories; existing Windows Git ownership warnings do not fail Composer |
| Migrations | Additive revision migration applied to dedicated test databases and local development; final testing migration run had nothing pending |
| Route inspection | 34 total registered routes, including the authenticated read-only renewal preview |
| Scoped Laravel Pint / Git whitespace check | PASS |
| Visual class parity | PASS across the 10 approved TSX screens/components checked against the frontend base; this branch changes only dashboard/form supporting content |

The backend suite also verifies 31/30/15/1/0/-1-day boundaries, revoked/replaced/historical/ineligible holders, combined filters/pagination, changed replay inputs (including another administrator/card), intentional repeats, real MySQL constraint failure rolling back expiry/revision/audit/ledger, and preservation of pre-revision ledger rows. No destructive migration or test ran against normal employee data.

Real browser scenarios executed successfully: all previous Checkpoint 5 workflows; correct Active/Expiring overlap in the dashboard/directories; backend preview equals applied expiry; lost-response uncertainty; pending identity preserved after refresh with no automatic write; same-key reconciliation producing only one extension; different-key stale tab receiving 412; explicit discard/fresh review and deliberate new renewal. Cleanup verified zero owned employee/request/card/renewal fixtures and no ignored credential fixture manifest.

The first parallel browser attempt timed out in old navigation tests. Running the suites separately eliminated that contention. The expanded lifecycle test uses a 180-second budget for its actual multi-context QR/lifecycle checks. Hardware camera/physical printing and deployment were not exercised in this checkpoint.

The existing mocked visual test also captured the card screen; `.next/qa/card.png` was visually inspected and retains the approved card layout. Its QR/data are mocked fixtures, not actual employee credentials. Safe real-suite evidence remains in ignored `.next/integration-report/results.json` and `.next/integration-qa/visual-parity.json`; these artifacts are not committed.

Manual Windows setup and PASS/FAIL checklist: [manual-integration-qa.md](manual-integration-qa.md). API details: [../lib/api-contract.md](../lib/api-contract.md). Production validity policy remains `unconfigured`; no production configuration or infrastructure was changed.

SessionStorage recovery covers refreshes in the same tab. Closing the tab can discard browser metadata; a new operation still requires the latest server revision, expiry preview and explicit confirmation. Older pre-revision ledger keys cannot be reconciled automatically and safely return 409. Real camera/printer behavior and hosting remain human checks; deferred ERP modules are unchanged.
