# Admin moderation: handoff

Last updated 2026-10-05. Read this before touching reports, appeals or the admin
area. It replaces the agent memory from the previous machine, which did not move
with the repository. Where this file and the activity diagram disagree, this file
records what the team decided.

## Working rules (from the project owner, 2026-10-05)

1. **The flow is the source of truth.** `frontend/docs/activity diagram.pdf`
   decides behaviour, refined by the decisions below.
2. **Push back on requests that leave the flow.** If the owner asks for
   something that does not follow the flow, say so plainly, explain which step
   it departs from, and ask "do you really want this, given it is not in the
   flow?" before doing it.
3. **The code is the API reference.** `API_Marketplace.pdf` was outdated and has
   been deleted. Read the NestJS controllers and DTOs in `backend/src/` for
   endpoints and request shapes. Documents that still cite the PDF
   (`frontend/CLAUDE.md`, `frontend/AGENTS.md`, `frontend/docs/design/*`) are
   stale on that point.

## Start on a new machine

1. Follow the root `README.md` setup (Node 20.19+, `npm ci` in `backend/` and
   `frontend/`, copy both `.env` examples, `docker compose up -d postgres redis`).
2. The team database is Supabase. `DATABASE_URL` uses the transaction pooler on
   port 6543 (`?pgbouncer=true`). That works for the running API but hangs
   `prisma db pull` and breaks the e2e suite, which sets `search_path` per
   connection. For CLI work, pass the session pooler (same host and password,
   port 5432, no query string) for that one command:

   ```sh
   cd backend
   DATABASE_URL="$(node -e 'require("dotenv/config");const u=new URL(process.env.DATABASE_URL);u.port="5432";u.search="";process.stdout.write(u.toString())')" npx prisma db pull
   ```

   The e2e suite creates and drops its own temporary schema, so it is safe to
   run against Supabase the same way:
   `DATABASE_URL="<session pooler url>" npx jest --config ./test/jest-e2e.json --runInBand`.
3. Opening a report or appeal screen in the admin area claims the case and
   changes its status in whatever database the API points at. Do not open case
   screens against Supabase just to look; use the local Docker database.
4. Demo accounts on a fresh local database: `admin1@ku.th`, `user1@ku.th`,
   `user8@ku.th` (suspended), password `KuDemo123!`.

## Decisions (authoritative)

1. **Sanction timing.** A sanction takes effect as soon as the admin records the
   verdict. The appeal window (7 days) opens immediately after. There is no
   deferred "apply the penalty when the window closes" step.
2. **Opening a case is taking it on.** There is no claim button. The first open
   of a Pending report moves it to `Under_Investigation`; the first open of a
   Pending appeal moves it to `Under_Review`. The opener is stored in
   `handled_by` while `handled_at` stays null until the decision.
3. **The reporter is never told the outcome.** No notification, and
   `GET /reports` / `GET /reports/:id` omit status, verdict note and handler.
4. **Who is notified.** Every active admin on a new report (including reports
   the system opens from stalled deals) and on a new appeal. The penalised user
   on an upheld report (every sanction, `warn` included) with the appeal
   deadline, and again when the appeal is decided.
5. **Warn is a penalty.** It is notified and appealable like the others.
6. **One admin account.** The flow has a single admin lane, so the admin who
   decided a report also decides its appeal. The old rule "a different admin
   must decide the appeal" was removed from the code. See open item 1.
7. **Dashboard uses existing endpoints only.** The temporary
   `GET /admin/users/restricted` and `POST /admin/users/:id/reinstate` were
   removed, together with the Users page. The only way out of a suspension is
   an upheld appeal, as in the flow.
8. **Admin visual style.** The admin area uses a minimal hairline style (white
   page, bordered boxes, soft status pills, one green primary action). This is
   an admin-only exception to `frontend/CLAUDE.md` §3.1 "depth over outline";
   student screens keep their shadows. Approved mockup:
   https://claude.ai/artifact/W6hemofBmoC4eHxggyM9GX (private to the owner).

## What exists now

Backend (`backend/src/report/`):

| Piece | Where |
|---|---|
| `POST /admin/reports/:id/open`, `POST /admin/appeals/:id/open` | `report.controller.ts`, `appeal.controller.ts`, `open()` in both services |
| Notification writers | `moderation-notifications.ts` (event keys start with `moderation:`) |
| System-opened reports notify admins | `transaction/transaction.service.ts` (`respondToCancellation`), `transaction/transaction-deadline.service.ts` |
| `GET /notifications` readable by suspended accounts, `kind: "moderation"` | `transaction/notifications.controller.ts` |
| Admin appeal list embeds the contested verdict | `serializeAdminAppeal` in `appeal.service.ts` |
| Unit tests | `moderation.spec.ts` |

Frontend (`frontend/`):

| Piece | Where |
|---|---|
| Admin shell: sidebar on desktop, bottom tabs on phones (Dashboard, Reports, Appeals, Memberships) | `app/(admin)/layout.tsx`, `components/admin/admin-navigation.tsx` |
| Dashboard: summary strip, combined queue with filter, moderation activity | `app/(admin)/admin/page.tsx`, `components/admin/queue-table.tsx` |
| Server reads (cached per request) | `lib/admin.ts` |
| Labels, predicates, time formatting (client-safe) | `lib/admin-labels.ts` |
| Report case: claims on open, dismiss keeps the note, reporter evidence, target link | `app/(admin)/admin/reports/[reportId]/` |
| Appeal case: appeal next to the original verdict, claims on open | `app/(admin)/admin/appeals/[appealId]/` |
| Bell no longer derives moderation rows | `lib/api/notifications.ts` |
| Admin login lands on `/admin` | `lib/actions/auth.ts` |

## Open items, in priority order

1. **Spec conflict, waiting on the team.** Spec §3.1.7.3 says the appeal must be
   decided by a different admin than the one who decided the report. The flow
   and decision 6 say one admin. The code currently allows the same admin. If
   the team keeps the spec, restore the check in `AppealService.decide`, exclude
   the original decider in `notifyAdminsOfAppeal`, show "not yours to decide" in
   the admin UI, and keep at least two admin accounts.
2. **Retiring `admin2`.** Set `isAdmin = false` instead of deleting the row:
   reports and appeals reference it through `handled_by`.
3. **Frontend tests were removed** (`frontend/tests/` deleted on purpose, to be
   rewritten). `npm test` in `frontend/` currently finds no files. Old tests can
   be read back with `git log --diff-filter=D --name-only -- frontend/tests`
   then `git show <commit>^:frontend/tests/<file>`. Cover at least: the bell
   has no derived moderation rows, admin login redirects to `/admin`,
   `buildQueueRows` ordering and labels, `waitingFor`.
4. **`frontend/fornewdesign/` was removed** from the repository, including the
   outdated `API_Marketplace.pdf`. `frontend/CLAUDE.md` §1 still names that
   folder as the source of truth. The flow images and schema PDF can be read
   back from git history the same way as item 3 if needed; the API PDF should
   not be restored (working rule 3). The authoritative activity diagram is
   still at `frontend/docs/activity diagram.pdf`. Consider updating
   `frontend/CLAUDE.md` §1 to point here.
5. **Account status history.** `User.status` is overwritten in place; there is
   no table recording status changes. Penalty history survives in `Report`
   (`sanction`, `handled_at`, `handled_by`) and `Appeal`. If manual
   reinstatement ever returns, add an append-only status log first; without it,
   an upheld appeal can re-apply a ban that an admin lifted by hand.
6. **Membership queue shows the wrong tier.** `GET /membership/payments/pending`
   returns the account's current tier, not the tier being paid for, so the
   dashboard row says "Membership slip" instead of a tier. Fix needs the
   requested tier in the API.
7. **Pre-existing failures, not caused by this work:** e2e "automatically
   allocates Random giveaways once" (2 Waiting tickets instead of 1) and the
   sellers e2e test timing out at 5 s over the network; three frontend unit
   tests (copy plurals, date format, room activity) that are now deleted with
   `frontend/tests/`.
8. **Stale docs.** `frontend/docs/verification-report.md` (APPEAL-01) still
   says the original admin cannot decide the appeal.
9. **Diagram details not modelled.** No stored `appeal_status = not appealed`;
   eligibility is computed by `GET /appeals/eligible` within 7 days. The admin
   area has no search.

## Checks used before the last commit

```sh
cd backend && npx tsc --noEmit && npx eslint src/report src/transaction && npx jest
cd frontend && npx tsc --noEmit && npx eslint "app/(admin)" components/admin lib
```

Backend unit tests: 32 passed. Frontend type check and lint: clean. A stale
`.next/dev/types/validator.ts` entry for the removed Users page clears when the
dev server restarts.
