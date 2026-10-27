# Admin area: work plan

Written 2026-10-06. Decisions A to C answered by the owner the same day.

## Ground rules

1. **The flow is the source of truth:** `docs/activity diagram.pdf`, swimlane
   "ระบบรายงาน และยื่นอุทธรณ์" (Report and appeal). It is the only flow with an
   admin lane.
2. **No database changes.** No migrations, no edits to `init.sql` or
   `schema.prisma`, no manual data fixes on Supabase or local. Normal runtime
   writes by the API (for example `User.status`) are not database changes.
3. **Frontend first, backend where the flow needs it.** Backend changes stay
   inside existing columns.
4. **One admin.** The platform runs with exactly one admin (confirmed
   2026-10-06). That admin decides reports and the appeals against them.
5. Anything outside the flow is challenged before it is built.

Earlier analysis this plan builds on: the "KU Marketplace Admin Flow" page
(claude.ai artifact `M7fpCQz1chrHbzgbFdbP65`, 2026-10-05), which compared every
step of the diagram with the code, and the approved dashboard mockup
(`W6hemofBmoC4eHxggyM9GX`).

## The flow, step by step, against the code today

| # | Diagram step (admin lane and system) | Today |
|---|---|---|
| 1 | Report created, `report_status = pending` | Done |
| 2 | System notifies the admin | Done (`moderation-notifications.ts`) |
| 3 | Admin acknowledges (sees the case) | Done: dashboard queue and Reports list |
| 4 | **Admin presses "รับการรายงาน" (take the report)** | **Differs:** opening the case screen claims it automatically. Fixed by step 2 |
| 5 | `report_status = under investigation` | Done (`POST /admin/reports/:id/open`) |
| 6 | Admin checks the evidence | Done: reporter photos, target link, transaction evidence. Screen still uses the old student style |
| 7 | Guilty? → `report dismissed` / `violation confirmed` | Done |
| 8 | Apply the sanction | Done, takes effect at once. **Temporary suspension never ends.** Fixed by step 4 |
| 9 | Notify the reported user of the sanction and the right to appeal | Done |
| 10 | Appeal in time? No → sanction stands | Done (7-day window computed by `GET /appeals/eligible`) |
| 11 | Appeal submitted, admin notified | Done |
| 12 | **Admin presses "รับยื่นอุทธรณ์" (take the appeal)** | **Differs:** automatic on open. Fixed by step 3 |
| 13 | `appeal_status = under review` | Done (`POST /admin/appeals/:id/open`) |
| 14 | Consider: upheld (lift sanction) / reject (keep it) | Done. Decision panel still uses the old student style |
| 15 | Notify the result | Done |

Gaps from the 2026-10-05 analysis that are now closed: admin notifications,
the reported user's notifications, writing `Under_Investigation` /
`Under_Review`, dismiss keeping the admin's note, reporter evidence and target
links, the appeal screen showing the original verdict.

## Outside the flow

| Item | Where it comes from | Plan |
|---|---|---|
| Memberships queue (`/admin/memberships`) | Revenue feature; not in any diagram | Later (decision C) |
| Dashboard (`/admin`) | A view over the same queues (steps 3 and 11) | Keep. Adds nothing new |
| Sanction levels (warn / suspend / ban) | Spec; the diagram only says "apply the sanction" | Keep. They are how step 8 is carried out |
| Admin search, Users page, manual reinstate | Old mockup | Not built. Manual reinstate was removed (handoff decision 7) |

## Design rules for every admin screen

From the approved mockup and `components/admin/admin-ui.tsx`:

- White page, `AdminBox` hairline boxes, no shadows, no colour strips.
- Status is `AdminPill` with an `ADMIN_*` label from `lib/admin-labels.ts`:
  the words carry the meaning, the soft wash only groups.
- One green primary action per screen. Destructive choices are worded, not
  painted red.
- Case screens: overline + `h1` + pill header, as in `appeal-case.tsx`.
- No avatars (`AdminInitials` only), no rarity colour, no texture.
- 360 / 768 / 1280, light and dark. The primary action stays reachable on
  phones (sticky bottom bar below `lg`).
- With one admin nothing says "another admin" or "opened by".

## Steps

One reviewable commit per step.

### 1. Single-admin cleanup (frontend)

- `lib/admin.ts`: drop `openerName` and `QueueRow.openedBy`.
- `components/admin/queue-table.tsx`: drop the "Opened by" column. The status
  pill already says New / Under investigation / Under review.
- `app/(admin)/admin/reports/page.tsx`: drop the "opened by" suffix.

### 2. Report case on the admin style (frontend)

Rebuild `app/(admin)/admin/reports/[reportId]/verdict-form.tsx` on the
appeal-case layout:

```
Back to reports
Reported Transaction #12                       [Under investigation]
Report #7
+------------------------------+  +------------------------------+
| The report                   |  | Evidence                     |
| Reporter (TrustBadge)        |  | Transaction: item, amount,   |
| Reason, filed time           |  |   delivery, status           |
| Reporter's details           |  | Timeline of confirmations    |
| Reporter's photos            |  | Payment slip                 |
| Open the reported post/user  |  | Appointment cards            |
+------------------------------+  | Chat transcript (scrolls)    |
                                  +------------------------------+
+-----------------------------------------------------------------+
| Decision                                                        |
| ( ) Dismiss  ( ) Warn  ( ) Suspend  ( ) Ban    one line each     |
| Reasoning (30+ characters, sent to the reported user)           |
|                                     [Record decision: Warn]     |
+-----------------------------------------------------------------+
```

- A Pending case shows the evidence read-only and a
  single primary **Take this report** button in place of the Decision box. The
  button calls the existing `POST /admin/reports/:id/open`; the Decision box
  appears after it succeeds. The automatic claim on mount is removed.
- Post and User reports: the Evidence box shows the target link and account.
- Move `EvidenceGrid` from `appeal-case.tsx` into `admin-ui.tsx`.
- Verdict choices become hairline radio rows inside the Decision box.
- The primary button names the verdict ("Record decision: Ban permanently").
- `StatusBadge` / `APPOINTMENT_STATUS` replaced with admin labels.
- A decided case shows verdict, sanction, note and time read-only.
- Suspension copy: "Suspend for 3 days", with the end date.

### 3. Appeal case: take button and decision panel (frontend)

- Same pattern as step 2: **Take this appeal**
  calls the existing `POST /admin/appeals/:id/open`.
- `appeal-decision.tsx` restyled into the hairline Decision box. Each button
  states its effect using the contested sanction ("Uphold: lifts the
  suspension", "Reject: the suspension stays"). The 20-character note stays.

### 4. Temporary suspension that ends (backend, no DB change)

- New constant `TEMPORARY_SUSPENSION_DAYS = 3` beside the 7-day appeal window.
- The suspension ends at `Report.handled_at + TEMPORARY_SUSPENSION_DAYS`. Both
  values already exist.
- One function works out an account's status from its standing verdicts. It
  generalises what `undoConsequences` already does: a permanent ban means
  Banned; an unexpired temporary suspension means Suspended; otherwise Active.
  `undoConsequences` calls it too.
- The account is lifted lazily: login (`auth.service.ts`) and `JwtAuthGuard`
  run that function when they meet a `Suspended` user, so an expired
  suspension never blocks anyone. No scheduler needed.
- The end date is returned where the suspension is shown: verdict notification
  text, `GET /appeals/eligible`, the restricted-login message.
- Unit tests: expired vs unexpired, a ban alongside a suspension, an upheld
  appeal, a legacy verdict with no sanction recorded (left as is).

### 5. Frontend tests

`npm test` runs `node --test tests/*.test.mjs` and finds nothing today.
Recreate `tests/` with at least: `buildQueueRows` order and labels,
`waitingFor` / `waitingForLong`, admin login redirects to `/admin`, the bell
derives no moderation rows. Old tests can be read back from git history
(handoff open item 3).

### 6. Memberships (later, decision C)

- Restyle `/admin/memberships` on `AdminBox` rows: slip thumbnail, student,
  tier, amount, Approve / Reject.
- Show the tier being paid for, not the account's current tier. Backend:
  `listPendingPayments` returns the tier derived from the amount with the
  existing `resolveTierFromAmount`. No DB change.
- Reject asks for a reason (the API already accepts `rejectionReason`), and
  the toast stops claiming the student was told when nothing is sent.

### 7. Verification before each commit

```sh
cd frontend && npx tsc --noEmit && npx eslint "app/(admin)" components/admin lib && npm test && npm run build
cd backend && npx tsc --noEmit && npx jest
```

Then look at every touched screen at 360 / 768 / 1280, light and dark,
against the local Docker database. Taking a case changes its status, so case
screens are never tried against Supabase.

## Decisions (owner, 2026-10-06)

**A. Take button: yes.** Follow the flow. The admin presses "Take this report"
/ "Take this appeal"; opening a screen no longer claims anything. This
replaces handoff decision 2. Steps 2 and 3.

**B. Temporary suspension: 3 days.** `TEMPORARY_SUSPENSION_DAYS = 3`, counted
from the verdict, backend only, no DB change. Step 4.

**C. Memberships: later.** Step 6 waits until steps 1 to 5 are done.
