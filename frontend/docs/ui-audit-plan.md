# UI / UX / functionality audit plan

Date: 2026-10-28. Status: planned, not executed.

## Goal

Find everything in the frontend that is out of place, renders strangely, or is
not robust: layout and responsive defects, unhandled edge cases, confusing UX,
and broken or fragile behaviour. Use Playwright to actually click through the
app as real users would, not only to load pages.

This is a **find-and-report** pass. No source file is changed while it runs.
The output is a findings report; the user then decides which findings get fixed,
and fixes happen in a separate phase.

The earlier [verification plan](verification-plan.md) and
[report](verification-report.md) covered state-machine correctness, permissions
and concurrency, mostly at DB/API level. This plan covers what they explicitly
left open: what the user sees and touches. Do not re-test their DB/API cases;
do re-test any browser flow they listed as "Remaining release checks".

## Ground rules

- Scope lock from [CLAUDE.md](../CLAUDE.md) applies: nothing outside `frontend/`
  is edited. Backend defects found through the UI are recorded, not fixed.
- Playwright scripts, storage states, raw screenshots and JSON live in the
  session scratchpad, **not** in the repository, and no dependency is added to
  `frontend/package.json`.
- Only the final report and a curated set of evidence screenshots go into
  `frontend/docs/` (see [Deliverables](#deliverables)).
- The developer's running stack (ports 3000/4000/5432/6379) and its Docker
  volumes are never touched.
- Never guess expected behaviour. When the correct behaviour is unclear, the
  source of truth is `docs/activity diagram.pdf`, then the admin moderation
  rulings in `../backend/docs/admin-moderation-handoff.md`. If neither settles
  it, log the item as "Question" rather than as a defect.
- English only, no emoji, in every written artefact.

## Phase 0 — Isolated environment

1. Copy `docker-compose.yml` to the scratchpad with distinct `container_name`s,
   volumes and ports (PostgreSQL 15432, Redis 16379), project name
   `ku-ui-audit`. A project-name change alone is not enough: the original file
   hardcodes container names.
2. Fresh volumes, so `init.sql` + schema v3 seed the demo data.
3. Backend on port 14000 (`PORT=14000`, `APP_URL=http://localhost:13000`,
   `DATABASE_URL`/`REDIS_*` pointing at the isolated services). No Resend or
   Cloudinary keys: OTPs are read from the backend log; uploads are expected to
   fail, and *how the UI reports that failure* is itself a test case.
4. Frontend as a **production build** on port 13000
   (`NEXT_PUBLIC_API_URL=http://localhost:14000`, then `next build` and
   `next start -p 13000`). Dev mode hides some issues (hydration, caching) and
   adds overlay noise. Node 20 is required; the default shell currently has
   Node 22, so switch before building.
5. Playwright: install `playwright` in a scratchpad folder, choosing the version
   whose Chromium revision is already in `~/.cache/ms-playwright`; also load
   `axe-core` there for accessibility scans. Firefox and WebKit are already
   cached; use WebKit for one mobile Safari pass.
6. Accounts and storage states: `user1@ku.th` (seller A), `user2@ku.th`
   (buyer B), a third freshly registered account C (empty-state user, also
   exercises registration), `admin1@ku.th`, and `user8@ku.th` (suspended).
   Password `KuDemo123!`. One browser context per account so cookies never mix.

Exit criteria: all five accounts sign in; feed, inventory and admin overview
load at 13000.

## Phase 1 — Static pre-sweep (cheap, before any browser)

Run and record, do not fix:

- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` (warnings
  included: bundle sizes per route against the 150 KB budget).
- Grep the source for rule violations from CLAUDE.md: hardcoded hex colours in
  components, `outline-none` / `outline: none` without a replacement focus
  style, `<img>` instead of `next/image`, `next/image` without `sizes`, fixed
  pixel widths (`w-[NNNpx]`, `min-w-[...]`) that can force overflow at 360px,
  `primary-600` used on normal-size text, emoji in copy, `any` types,
  enum switches with a silent `default`.
- Route inventory: list every `page.tsx` and whether its route segment has a
  `loading.tsx`, `error.tsx` and `not-found.tsx` (directly or inherited).

Already observed while writing this plan (confirm during the run):

- `lib/giveaways-api 2.ts` is a tracked duplicate of `lib/giveaways-api.ts`
  (filename with a space; looks like a copy artefact).
- Only `app/(app)/error.tsx` exists as a group-level error boundary;
  `(admin)` and `(auth)` have none, so an API failure there may fall through
  to the default Next.js error page.
- `app/(app)/chat/[roomId]/room-screen.tsx` is 1,544 lines and
  `app/(app)/market-feed.tsx` 746 lines — the most likely places for state edge
  cases; give them extra exploratory time in Phase 4.

## Phase 2 — Automated layout sweep (every route x viewport x theme)

A script visits every route from the inventory with the account that can see
it, using real IDs from the seed (one item, post, offer, transaction, chat
room, giveaway, ticket, report, appeal, user, seller).

Matrix:

| Axis | Values |
| --- | --- |
| Viewport | 360x780, 390x844 (touch, deviceScaleFactor 3), 768x1024, 1024x768, 1280x800, 1920x1080 |
| Theme | light, dark (`ku-theme` cookie) |
| Motion | default; one extra pass with `prefers-reduced-motion: reduce` at 390 |
| Engine | Chromium for all; WebKit at 390 for the core user routes |

Automated checks per page, each written to JSON with the offending selector:

1. **Horizontal overflow** — `document.documentElement.scrollWidth > innerWidth`,
   and every element whose bounding box extends past the viewport.
2. **Clipped text** — elements with `overflow: hidden` whose `scrollWidth` or
   `scrollHeight` exceeds the box, without `text-overflow: ellipsis` or
   line-clamp.
3. **Overlap** — fixed/sticky layers (bottom tab bar, action bars, headers,
   toasts) covering interactive elements or the last row of content; check by
   scrolling to the bottom and hit-testing the primary CTA with
   `elementFromPoint`.
4. **Touch targets** — interactive elements smaller than 44x44 at touch widths.
5. **Images** — broken (`naturalWidth === 0`), missing dimensions/aspect
   reservation, wrong aspect (stretched).
6. **Layout shift** — CLS via `PerformanceObserver` during load and first
   2 seconds; budget 0.05.
7. **Console and network** — any console error/warning (hydration mismatch
   especially), uncaught exception, request with status >= 400 or failed.
8. **Accessibility** — axe-core scan (WCAG 2.2 AA tags); colour contrast in
   both themes; document title present and specific per page.
9. **Screenshot** — full page, kept in the scratchpad.

Then a visual pass over the screenshots, page by page, looking for what
scripts cannot judge: misalignment, inconsistent spacing or radius, orphaned
single words, dark-mode surfaces that lost their depth or became unreadable,
skeletons that do not match final content, desktop layouts that look like a
stretched phone screen (or the reverse).

## Phase 3 — Edge-case data

Create the following on the isolated database through the API (and the UI
where it is the only way), then repeat the Phase 2 sweep on the affected
routes only:

- **Text**: 200-character Thai title with no spaces (Thai has no word breaks,
  so it is the realistic worst case); one unbroken 80-character English token
  or URL; mixed Thai/English/emoji user content; empty optional description;
  maximum-length bio, item description, report details, chat message.
- **Numbers**: price 0, price at the maximum the API accepts, large quantity,
  quantity 1 of 1 (sold out after one purchase), money top-up in a trade.
- **Images**: none, one, the maximum allowed, extreme portrait and extreme
  landscape, a URL that 404s.
- **Volume**: a user with zero of everything (account C: empty feed filters,
  empty inventory, no offers, no chat, no history, no notifications); a user
  with many of everything (pagination, long lists, 100+ chat messages,
  50+ notifications, a full admin queue).
- **Time**: items and deadlines just before/after expiry, countdowns crossing
  zero while the page is open, dates shown in Asia/Bangkok when the browser
  timezone is set to UTC and to Asia/Bangkok.
- **Status coverage**: every status value of transactions, offers, giveaways,
  tickets, reports, appeals and memberships rendered at least once; each must
  have a deliberate label and badge, never a raw enum or blank.

## Phase 4 — Exploratory journeys (UI, UX and function)

Driven by Playwright with headed-quality screenshots at each step, using two or
three contexts side by side where a flow has more than one party. For each
journey, record: could a first-time KU student finish it without help? Is every
state visible and explained? Is every error recoverable?

| Area | What to poke |
| --- | --- |
| Auth | Register with non-KU email, OTP wrong/expired/resent, login wrong password, forgot/reset, redirect back to the protected page after login, logout, session expiry mid-use (delete the access cookie), suspended user (`user8`) sees only profile and appeals |
| Feed and search | Filters, search by course code, Thai search, no results, back button restores filters and scroll position, masonry with mixed image ratios, sale vs trade vs giveaway distinguishable |
| Post detail and seller | Gallery and photo viewer (swipe, keyboard, zoom at 360), own post vs other's post actions, seller page, follow/unfollow, report post/user |
| Inventory and listing | Create item (validation messages, date pickers), edit, list as post, quota limit message, delete a listed item, drag and **keyboard** path in inventory |
| Buy | Shipping and Meetup from both sides, payment slip upload (expected to fail without Cloudinary: is the error clear?), seller rejects slip with reason, stepper accuracy at each step |
| Trade / offers | Compose an offer by drag and by keyboard, zero and positive top-up, reject, withdraw, accept, offer list states |
| Chat | Send text, very long message, image upload failure, appointment propose/accept/reject/replace, pinned appointment, system messages, polling with two contexts, unread counts, report a message as evidence |
| History, QR, scan | Transaction detail, QR display, scan page with camera permission denied and with no camera, manual code fallback if any, cancel and return requests from each side |
| Giveaway | Browse, join, First Come full, Random after close, manage page as owner, ticket and its QR, expired ticket |
| Report and appeal | 10-character minimum for details, evidence picker (photos, chat messages), duplicate report, appeal from `user8`, one-active-appeal rule |
| Account | Edit profile, avatar crop dialog at 360, membership upgrade and slip, following list, delete account flow (on a throwaway account) |
| Notifications | Links go to the right screen, read state, empty state |
| Admin | Overview dashboard and charts at 360/768, every queue table on mobile (horizontal scroll inside its container, not the page), report case with evidence highlighting, appeal decision, user sanction, membership verify/reject, items and transactions screens |

Generic probes, applied to every form and mutation in the table above:

- Double-click and rapid repeat on submit buttons: one request, button shows a
  pending state.
- Refresh, back and forward in the middle of a multi-step flow.
- Direct URL to another user's private resource, to a nonexistent ID, and to a
  malformed ID (`/history/abc`): a designed 403/404 screen, not a crash or blank.
- Network: Slow 3G throttling (loading states, skeleton fidelity, no double
  submits), offline toggle mid-request, backend stopped (error boundary text and
  a retry path).
- Keyboard only: tab order, visible focus ring, dialogs/sheets trap and return
  focus, Escape closes overlays.
- Mobile ergonomics: sheets instead of dialogs on mobile, primary action within
  thumb reach and not hidden by the tab bar, virtual keyboard not covering the
  chat composer (WebKit pass).

## Phase 5 — Heuristic design review

Run the `impeccable` skill (`critique` and `audit`) on the screenshots of the
main user surfaces and the admin area, as required by CLAUDE.md. Check against
the design principles there: depth over outline, radius rhythm, green-tinted
neutrals, one saturated primary action per screen, game styling only on
inventory and trade, every empty state with illustration, sentence and action.

## Findings format

One row per finding. Merge duplicates that share a root cause.

`ID | Severity | Area / route | Viewport, theme, engine | Steps to reproduce |
Expected | Actual | Evidence (screenshot file) | Suspected source file | Type`

- **Type**: Layout, Responsive, Visual, UX, Function, Edge case, A11y,
  Performance, Copy, Question.
- **Severity**:
  - Blocker — a core journey cannot finish, data is wrong, or a page crashes.
  - High — works but misleads the user, loses input, or breaks at a required
    width (360/768/1280).
  - Medium — clearly wrong presentation or friction with a workaround.
  - Low — polish.
- "Question" items list the ambiguity and the options; they are not defects
  until the user rules on them.

## Deliverables

- `frontend/docs/ui-audit-report.md`: environment, coverage matrix (route x
  viewport x theme: checked / issues / not reachable), findings table sorted by
  severity, open questions, and what was not tested and why (camera hardware,
  real uploads/email).
- `frontend/docs/ui-audit-evidence/`: only screenshots referenced by findings,
  compressed. Raw sweep output stays in the scratchpad.
- Nothing is committed or pushed without asking.

After the report, stop. The user picks which findings to fix; fixes then follow
the normal workflow (plan first, one phase at a time, `code-review` before a
phase is done, re-run the relevant Playwright checks as regression evidence).

## Teardown

Stop the `ku-ui-audit` Compose project and remove **its** volumes only
(`docker compose -p ku-ui-audit down -v` against the scratchpad compose file),
stop the 13000/14000 processes, and confirm the developer stack on
3000/4000 is still running untouched.
