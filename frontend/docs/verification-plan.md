# KU Marketplace verification plan

Date: 2026-09-09. Execution has started; see [verification-report.md](verification-report.md)
for actual results. This document remains the full verification scope, including
checks that require external services or physical devices.

## Objective and sources

Verify that another developer can obtain the release candidate, install it from
tracked files, and exercise the marketplace without setup blockers, broken core
flows, incorrect permissions or inconsistent transaction data.

Both sets in [activity diagram.pdf](activity%20diagram.pdf) are required: upper
"เจนทำ" and lower "เนตรทำ". Use the
[combined audit](design/activity-diagram-audit.md) for existing findings and the
[root README](../../README.md) for installation. The audit records the current
implementation, not independent proof that the implementation is correct.

Auth and membership are additional project scope; do not attribute rules to the
activity diagram when that diagram does not define them.

## Evidence already available

The previous run reported 20 backend unit cases, 12 database/API integration
cases, three frontend regression test files, frontend lint and both builds
passing. Database integration used an isolated schema. The full API startup and
demo login were tested; QR tests used a Redis substitute.

This does not establish a clean checkout installation, upgrade safety, real
Redis token expiry/consumption, camera behavior, external email/image delivery,
or complete browser coverage. Reuse existing evidence for unchanged code; rerun
relevant checks after fixes and the full release gate on the final candidate.

## Execution order

| Phase | Work | Completion evidence |
| --- | --- | --- |
| 1 | Trace both diagrams and freeze test expectations | Every decision edge has an actor, precondition, action, result, source and case ID; contradictions are listed explicitly |
| 2 | Verify fresh installation and existing-database upgrade | Installation transcript from candidate-only files; schema/data comparison before and after upgrade |
| 3 | Exercise API state transitions, permissions and concurrency | Automated results plus database assertions for critical cases |
| 4 | Exercise browser journeys with separate accounts | Case records, screenshots and API results; browser state agrees with database state |
| 5 | Exercise real Redis, camera, integrations and recovery | Real-service results separately identified from mocks |
| 6 | Fix findings, rerun affected cases and evaluate release gate | No unresolved blockers; final candidate, results and limitations recorded |

Prioritize setup, state/data integrity and permissions before visual polish.
No push or deployment is part of this plan.

## 1. Traceability and test expectations

Create one row per diagram branch, including alternate and failure paths:

`Case ID | upper/lower/both + action label | actor | starting state | input/event |
expected API result | expected UI | expected database effects | test method |
status | evidence/defect`

Record coverage for each diagram independently even when one test covers both.
Do not mark a whole area passed because only its successful path works.

Review these reconciliation points first:

- Item state after cancellation before handover: upper restores availability;
  lower labels Transferred. Current implementation restores availability. Track
  this as a documented interpretation, not literal agreement with both labels.
- Payment at meetup versus shipping, trade with/without additional money, and
  cancellation initiated by either party must have separate case rows.
- Refund-only cancellation versus completed-deal return has different required
  evidence and response deadlines. Verify arrows and actor direction, including
  who shows and who scans the return QR.
- Verify each timer's triggering timestamp, interval and expiry action against
  its particular branch. Similar-looking 24/72-hour labels are not interchangeable.
- Map diagram spelling variations to persisted states without silently changing
  business meaning. Record any unresolved product ambiguity rather than guessing.

## 2. Installation and upgrade

| ID | Test | Expected result |
| --- | --- | --- |
| SET-01 | Assemble a clean copy of the intended candidate; exclude local env, node_modules, generated files and ignored resources | Required source, examples, migrations and test files are present; no reliance on the current workspace |
| SET-02 | Follow README with supported Node and npm ci in each application | Lockfiles agree; Prisma client generates; installation does not require an undocumented manual step |
| SET-03 | Start new PostgreSQL and Redis volumes; run both apps with example configuration | Schema/seed succeeds; API 4000 and frontend 3000 do not collide; feed, login and inventory work |
| SET-04 | Start without Resend credentials in development; register/reset using local OTP | API boots; usable OTP is available locally; production behavior remains separately verified |
| SET-05 | Supply Cloudinary test credentials and upload a small valid image | Returned URL displays in item, chat and slip contexts |
| SET-06 | Apply documented migrations to an isolated copy of an older database; apply again | No lost users, transactions or evidence; repeatable additive changes; new queries work |
| SET-07 | Stop/start services and rebuild | Data survives; no duplicate allocations, notifications, reports or stock movements |
| SET-08 | Use the optional console alongside the frontend | Console uses port 3001 and reaches the intended API |

Use a separate Compose configuration/project with distinct container names,
ports and volumes. The existing Compose file hardcodes container names, so a
project-name change alone is insufficient isolation. Never reset the user's
current volumes. Test POSIX instructions and PowerShell equivalents when those
platforms are in the intended audience; otherwise record the untested platform.

## 3–4. Functional and permission matrix

Use at least three regular accounts (seller A, buyer/proposer B, unrelated C),
two admins for independent appeal review, and suspended/deleted accounts. Use
separate browser profiles so cookies do not mix. Create fixtures per case; one
case must not depend on a previous case's stock or status mutations.

| Case group | Required paths and assertions |
| --- | --- |
| AUTH | Register, wrong/expired/reused OTP, resend, duplicate email, valid/invalid login, password reset, logout, access-token expiry, refresh/direct navigation, old token after suspension/deletion; no account takeover through client-supplied IDs |
| ITEM | Create/edit/delete, categories, images, invalid price/quantity/date, owner-only mutations; soft deletion preserves report evidence; repeated list/delete/relist behavior is explicit |
| BUY | Purchase by shipping and meetup; reserve stock; open private chat; upload payment; seller review; tracking plus estimate; confirmed appointment/QR or delivery confirmation; complete only after required steps |
| TRADE | Propose with owned items, zero/positive extra money, reject/withdraw/accept, reject alternatives; no fictitious payment in zero-money trade; both item sets reach the correct state; prevent reusing reserved offered items |
| APPOINTMENT | Either party proposes; only the other responds; reject/re-propose; replace confirmed appointment; pin current card; refresh/reopen; old or superseded appointment cannot incorrectly authorize handover |
| CANCEL | Each party initiates before/after payment; no self-approval; accept/reject/timeout; pending request blocks conflicting actions; restore stock once; admin ruling allows the proper next step |
| RETURN | Requests before, exactly at and after seven days; accept/reject/timeout; paid purchase, trade with money and trade without money; new purchase-return appointment; refund and goods confirmed in either order; neither premature completion nor automatic relisting |
| GIVEAWAY | First Come/Random/Manual with zero, fewer, exact and excess entrants; close boundary; prevent early/manual unauthorized draw; automatic Random after restart; no duplicate entrants or over-allocation; forfeiture, pickup, expiry and replayed QR |
| CHAT | Two-party privacy; only entitled giveaway members access shared chat; correct sender and image visibility; new rooms open after mutation; no duplicate rooms under simultaneous reads; polling, navigation and offline recovery |
| REPORT | File report, admin receives/claims, evidence access, dismissal/violation, sanctions; unrelated users cannot read private evidence or administer cases; hidden posts disappear from feed and direct public detail |
| APPEAL | Eligible reported user, time window, one active appeal, independent admin review, uphold/reject, actual sanction reversal; other active sanctions are not accidentally undone |
| MEMBERSHIP | Tier limits, valid/invalid slip, admin verify/reject, repeated verification, expiry and renewal; privileges match authoritative server state |
| NOTIFY | Correct recipient and link, triggering event timestamp, due reminders, terminal-state behavior, no unauthorized records; distinguish inferred UI entries from persisted reminder entries |

For every mutation, also send it directly through the API as the wrong actor,
with missing/expired credentials, malformed IDs and an invalid starting state.
A hidden button is not an authorization check. Require a controlled 4xx response
and no unintended database change for invalid requests.

### Invariants and concurrency

Run independent connections or simultaneous HTTP requests, not serial calls:

- Two buyers take the last unit: exactly one transaction succeeds, stock stays
  nonnegative, and failure does not leave an orphan transaction/chat.
- Buyer purchases while seller accepts an offer; two offers are accepted at once;
  the same offered item is used on different posts. No double allocation.
- Both parties cancel, approve twice, or approve/reject simultaneously. Stock is
  released once and there is only one effective decision/report.
- Payment upload/confirmation, cancellation, shipping and handover race. No
  cancelled transaction is revived or completed after its reservation is released.
- Refund confirmation and return scan race. Both facts survive and the final
  state reflects the conjunction of required conditions.
- Wrong, expired, replaced and replayed QR tokens fail without changing state;
  simultaneous scans consume one token once, with real Redis as well as mocks.
- Two scheduler instances run or restart after downtime. Allocation, reminder
  event and escalation are idempotent; a failure for one record does not prevent
  other eligible records from being processed.

### Clock boundaries

Use controlled clocks or isolated fixture timestamps; do not wait real days.
For every rule test one millisecond before, exactly at and after the boundary.
Check database time, server UTC and Asia/Bangkok browser display consistency.

| Trigger | Boundary / behavior to verify |
| --- | --- |
| Payment evidence uploaded | Seller confirmation due at 24h; phase-specific reminders stop after confirmation |
| Cancellation requested | Other party responds within 72h; reminders every 8h |
| Completed return requested | Other party responds within 24h; reminders every 3h |
| Refund slip submitted | 24h cancellation-refund branch / 72h completed-return branch; timer does not use transaction creation time |
| Estimated delivery | Three-day grace, then daily reminders; no fabricated confirmation of receipt |
| Completion | Seven-day return window using a timestamp that genuinely represents completion |
| Registration/pickup | Registration closes, allocation happens, pickup tickets expire at their respective boundaries |
| OTP/JWT/QR | Configured expiry enforced by the authoritative service; device clock cannot bypass it |

## 5. Browser, real services and recovery

Browser journeys must cover both participants and the admin, including refresh,
back/forward, direct URLs, duplicate clicks and reopening a tab after expiry.
Check 360px, 768px and 1280px widths, Thai/English, keyboard operation, clear
errors and no unexpected console errors or failed API calls. Use deterministic
browser automation for core paths; keep real camera testing as explicit evidence.

- Use real Redis for expiring/single-use tokens and service restart behavior.
- Scan with an actual phone in a secure browser context; test permission denied,
  invalid code and expired code. Do not assume camera access works over LAN HTTP.
- Use test images and test accounts for Cloudinary/Resend; verify success,
  missing credentials, denied recipient, bad format, oversized image and timeout.
  Do not send messages to real users or perform real payments as test fixtures.
- Interrupt API, Redis or database access during selected mutations; restore it
  and retry. No infinite loading, silent success, duplicate irreversible actions
  or destructive reset should be necessary for recovery.
- Exercise production build/start locally, including cookie behavior and API
  configuration, rather than relying only on development mode.

## 6. Defects and release gate

For each failure record: case ID, candidate revision/file set, environment,
actors, exact reproduction steps, expected/actual behavior, sanitized evidence,
severity, fix and regression result. Avoid storing tokens, OTPs or service keys.

- Critical: unauthorized actions, lost/doubled stock or transaction state,
  secret disclosure. Blocks readiness.
- High: clean setup fails or a core diagram journey cannot finish. Blocks readiness.
- Medium/low: degraded but usable behavior or presentation issues. Record scope
  and impact explicitly; do not relabel an untested flow as passed.

Final commands from the repository root:

```sh
npm test --prefix backend -- --runInBand
npm run build --prefix backend
npm test --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
npm run test:e2e --prefix backend -- --runInBand
git diff --check
```

Run database checks only against the isolated test environment. The release gate
also requires candidate-only fresh setup, upgrade verification, browser core
journeys and real-service checks above; command success alone is insufficient.

Publish a verification report with Pass/Fail/Blocked/Not run per case, separate
coverage totals for the upper and lower diagrams, remaining ambiguities and
known limitations. Mark ready for others to try only when setup and all critical
core paths pass and no critical/high defect remains. This establishes tested
readiness, not a guarantee of zero future bugs.
