# Verification execution report

Date: 2026-09-09. Source: both the upper and lower diagrams in
[activity diagram.pdf](activity%20diagram.pdf), reconciled in the
[combined audit](design/activity-diagram-audit.md). Auth and membership are
additional application scope. This report describes executed checks; it does
not certify every decision edge in the [full plan](verification-plan.md).

## Environment and installation

- Candidate assembled from tracked and intended untracked source files, excluding
  private environment files and installed/generated dependencies.
- Node 20.20.2; PostgreSQL 16; Redis 7; Linux; headless Chromium.
- Separate Compose project `ku-verification`, new volumes, PostgreSQL 15432,
  Redis 16379, API 14000, frontend 13000. Existing development data was untouched.
- `npm ci` succeeded independently in backend, frontend and optional API console.
  One backend registry connection reset required retrying installation.
- Prisma generated during backend installation. API booted with example local
  configuration and no email key. Frontend ran its built standalone server with
  copied public/static assets. Demo login worked with production frontend cookies.
- Backend, frontend and optional console production builds passed. Font retrieval
  needed network access. Next reported its existing multiple-lockfile warning;
  installation also reported a transitive Prisma package's Node 22 engine warning.
  The exercised Node 20 install/build/runtime paths succeeded despite that warning.
- Legacy upgrade applied all five incremental migrations twice, retained original
  rows/columns across 17 tables, and queried scalar columns of all 18 Prisma models.
  This is now repeatable in `backend/test/upgrade.e2e-spec.ts` with a fixed legacy
  fixture, independent of the branch's future HEAD.

## Final automated results

| Check | Result |
| --- | --- |
| Backend unit tests | 20 cases passed, 8 suites |
| PostgreSQL/API/Redis integration tests | 26 cases passed, 4 suites |
| Frontend regression tests | 5 test files passed |
| Frontend ESLint | Passed |
| Backend ESLint, without autofix | 0 errors, 17 test-code warnings |
| Backend/frontend production builds | Passed |
| Optional API console clean install/build | Passed; interactive console use not exercised |
| `git diff --check` | Passed |
| Responsive browser route checks | 36 passed: 12 routes at 360/768/1280px |

Tests deliberately use isolated schemas and prefixed Redis keys; they never
flush Redis or reset development volumes. API integration and browser tests use
local demo/test accounts. No real email recipients or payments were involved.

## Defects fixed during this execution

| ID | Reproduction / previous behavior | Fix and verification |
| --- | --- | --- |
| D01 | Confirm purchase only delayed and redirected to hardcoded transaction 6 | Real authenticated purchase action; Shipping and Meetup each created a new transaction, reserved stock and navigated to its own chat in Chromium |
| D02 | Expired/nonselected giveaway tickets caused `/chat` to fail with 403 | Load only eligible giveaway conversations; tolerate eligibility-changing 403/404 per room; regression tests plus all three browser widths |
| D03 | Invalid registration and membership payloads reached services; missing item fields caused 500 | Correct Zod/class-validator pipes; HTTP tests assert controlled 400 responses |
| D04 | PATCH item accepted `ownerId`, changing ownership | Whitelisted DTOs strip ownership/status injection; database assertions verify preserved owner/status |
| D05 | Concurrent OTP verifications both succeeded | Atomic Redis comparison/consumption and registration payload writes; real Redis replay/expiry tests |
| D06 | A stale payment upload revived a cancelled transaction | Conditional state updates reject stale payment/confirmation/shipping/refund writes; deterministic interleaving regression |
| D07 | One offered item could be accepted for two different trades | Lock offered items and check outstanding reservations before acceptance; regression covers competing sellers |
| D08 | Soft-deleted listings could never be listed again because item/post is unique | Restore the existing unreported post; retain its ID; protect reported evidence and reserved items |
| D09 | An old confirmed appointment authorized handover while a new proposal was pending | Latest appointment is authoritative; superseded responses and conflicting simultaneous responses fail |
| D10 | Listed inventory could be deleted or have quantity reduced; partial sale transferred the whole item | Protect committed inventory and quantity; preserve Listed while stock remains; shipping completion/replay regression |
| D11 | Two admin membership decisions could both succeed and disagree with subscription state | Row locks and atomic review transaction; concurrent request/review tests |
| D12 | Membership quota was displayed but never enforced by listing creation | Serialize per-owner quota check; derive usage from actual new posts in the UTC calendar month, including deleted posts; concurrent final-slot and month-boundary tests |
| D13 | An unrelated user could report a private transaction | Participant check and target validation; report privacy regression |
| D14 | Approving one appeal removed penalties from other reports | Store sanction on each verdict and preserve remaining penalties; legacy unknown sanctions are conservatively retained |
| D15 | Suspended/banned users could not enter the appeal flow at all | Restricted sign-in permits only profile read and user appeal routes; eligible verdict summaries shown without private evidence; HTTP tests reject marketplace/admin actions, including old tokens |
| D16 | Simultaneous first chat reads could create two rooms | Lock transaction while finding/creating its room; two-participant concurrent-read test |
| D17 | Admin navigation overflowed around tablet width | Use bottom navigation below desktop breakpoint; all three admin pages passed at 360/768/1280px |
| D18 | Slip picker advertised/accepted 8 MB while API allows 5 MB | Match both localized hints and client validation to 5 MB |

Changes from the preceding audit (schema/ports/demo passwords, cancellation and
return state transitions, giveaway scheduling and deadline notifications) were
retained and covered again by the relevant regression suites.

## Coverage against both flows

“DB/API” means automated service or HTTP calls with database assertions, not a
complete browser journey. “Unit” may use substitutes. The rows identify exactly
which branches have evidence instead of marking a whole domain passed.

| Case | Diagram area / actors and branch | Observed result / method |
| --- | --- | --- |
| ITEM-01 | Inventory supporting both flows; owner adds and publishes | Browser saved an item, listed it and displayed it to a second account |
| BUY-01 | Upper purchase + lower purchase; buyer selects Shipping | Browser created Pending deal 10 for post 12 and opened chat 14; API confirmed buyer, method and reservation |
| BUY-02 | Upper purchase/handover + lower purchase; buyer selects Meetup | Browser created Pending deal 11 for post 13 and opened chat 15 |
| BUY-03 | Purchase; two buyers request the last unit | Exactly one successful reservation and transaction; DB/API |
| BUY-04 | Shipping handover; buyer slip, seller confirmation/tracking, buyer receipt | Completed after required steps; wrong seller/early receipt/replay rejected; remaining stock preserved; DB/API |
| TRADE-01 | Upper and lower trade; acceptance reserves offered items | Same offered item cannot serve two accepted trades; DB/API |
| TRADE-02 | Trade without money; agreed meetup then handover | Completes without payment evidence; returned goods finish the no-money return; DB/API, QR substitute |
| APPT-01 | Upper appointment subflow + lower meetup branches | Proposer cannot self-confirm; replacement invalidates old response; concurrent confirm/reject has one decision; DB/API |
| QR-01 | Purchase meetup handover | Wrong actor/token, replaced/expired token rejected; simultaneous real Redis scans complete once; DB/API + real Redis |
| CANCEL-01 | Upper/lower cancellation before payment; either party | Cancellation releases reservation exactly once under concurrent requests; DB/API |
| CANCEL-02 | Paid cancellation; approval and refund evidence/acknowledgement | Pending Refund then Refunded, rather than premature completion; DB/API |
| CANCEL-03 | Cancellation vs payment race | Cancelled deal is not revived by a stale payment submission; DB/API |
| RETURN-01 | Completed purchase return and refund | Requires goods and money; new confirmed appointment; seven-day eligibility boundary; DB/API, QR substitute |
| RETURN-02 | Completed no-money trade return | Requires returned goods without a fictitious slip; DB/API, QR substitute |
| GIVE-01 | Upper/lower giveaway; First Come last place | Capacity enforced under concurrent joins; unit and DB/API |
| GIVE-02 | Random with zero/fewer/equal/excess entrants | Correct count, unique winners; empty draw closes; unit tests |
| GIVE-03 | Random after registration deadline | Automatic allocation occurs once; capacity retained; DB/API |
| GIVE-04 | Recipient forfeiture and pickup expiry | Persisted terminal ticket status; existing unit/scheduler checks |
| CHAT-01 | Private transaction conversation; seller and buyer | Seller sent local test text; buyer reopened the same chat 14 and saw it; browser |
| CHAT-02 | Giveaway shared chat; eligibility changes | Expired/nonselected rooms omitted, selected rooms retained; frontend regression and browser inbox checks |
| REPORT-01 | Upper/lower report and appeal; outsider/target/admin | Private transaction reporting and unrelated report access rejected; only target may appeal; DB/API |
| APPEAL-01 | Appeal review and sanction reversal | Upheld appeal reverses one verdict without removing another ban; DB/API. Executed 2026-09-09 under the old two-admin rule; since 2026-10-06 one admin decides both the report and its appeal |
| APPEAL-02 | Sanctioned user's appeal entry | Restricted login reaches `/account/appeals`; allowed profile/appeal API and blocked marketplace/admin API; browser + HTTP |
| TIMER-01 | Payment review/cancellation/return/refund/delivery timers | Unit checks cover trigger/interval differences; DB test covers before/exact cancellation deadline and concurrent-worker idempotency |
| AUTH-01 | Additional scope: validation and OTP | Invalid inputs rejected, OTP single-use/expiry enforced by real Redis; demo login and restricted/old-token permissions tested |
| MEMBER-01 | Additional scope: upgrade and quota | Concurrent requests/reviews, effective tier and final monthly listing slot tested; DB/API |

The conflicting lower pre-handover cancellation label “Transferred” is still
handled using the documented reconciliation: restore availability until goods
have actually changed hands. That remains an interpretation, not literal
agreement with both contradictory labels.

## Browser evidence

- [Responsive results](verification-evidence/responsive.json): all 36 final checks,
  no page-level horizontal overflow or runtime exceptions in those routes.
- [Purchase/access results](verification-evidence/purchases-and-access.json): both
  real purchases and restricted sign-in. Its earlier admin overflow observations
  led to D17; the later responsive results verify the correction.
- [Two-account chat](verification-evidence/chat.json),
  [shipping chat screenshot](verification-evidence/shipping-chat.png), and
  [admin tablet screenshot](verification-evidence/admin-tablet.png).

Browser coverage uses English/light-mode screens and does not establish complete
accessibility, all themes/locales, every mutation, or every network failure path.
Evidence contains only isolated demo data, never access tokens or service keys.

## Remaining release checks

The full release gate remains open. No claim is made that the application has
zero bugs or that every diagram edge was exercised end to end.

- Actual phone-camera scanning, permission denial and secure-context behavior.
- Real Cloudinary uploads and real Resend delivery with authorized test accounts;
  successful external uploads/email were not simulated as passes. The clean local
  configuration intentionally has no service credentials.
- Full browser completion of paid refunds/returns, Manual giveaway selection and
  collection, report/admin/appeal decisions and membership payments. Their listed
  DB/API/unit evidence is narrower than a full two-party browser journey.
- Exhaustive timer boundary/interleaving cases, service interruption recovery,
  accessibility/keyboard audit, Thai/dark-mode screen audit and PowerShell setup.
- Legacy verdicts lack recorded sanctions; an unknown remaining confirmed verdict
  keeps an existing suspension/ban instead of guessing it can be cleared.

Before sharing this candidate, include every new migration/test/source file and
follow the README migration instructions for existing volumes. No commit, push
or deployment was performed by this verification run.
