# Quiet badges: handoff for a new session

Updated 2026-10-30. Read this first, then `plan.md` in this folder.

## Where things are

| Branch | What it holds | Pushed |
|---|---|---|
| `feature/giveaway-admin-quiet-badges` | **Current work.** Based on `origin/main`. Style 3 restyle of badges, message boxes and buttons, uncommitted in the working tree | No |
| `redesign/full` | The abandoned full-site redesign (phases 0-7 plus a WIP phase 8). Reference only | No |
| `feature/redesign-giveaway-admin` | The abandoned giveaway/admin port onto main. Reference only | No |
| `develop` (local) | Tracks `origin/develop` | - |

- PR target: **`develop`**, not `main`, and only after the owner says so. The branch
  is based on `origin/main`, so the PR also brings main's newer commits into
  `develop`; the owner accepted that.
- Commits: as `rantod-cmd`, conventional English message, **no AI trailer**. Never
  commit `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/` or `.claude/`. Never
  push without asking.
- `frontend/CLAUDE.md` in the working tree still describes the abandoned "Herbarium"
  redesign in sections 3-5 and 8 (2px radii, Maitree/Anuphan). **Those sections do not
  apply to this branch**: it keeps main's look (Prompt, existing radii) except for
  badges, message boxes and buttons. The scope lock, workflow and "never guess" rules
  still apply. The owner has not decided whether to restore the file.

## What was decided (owner, 2026-10-30)

- Style 3, "Urgent stands out" (`quiet-badges.html`, `data-style="3"`): small grey
  badges for information; calm solid badges (amber `#dbba66` with dark text, danger
  `#b05e4f` with white text) only when someone must act; white message boxes with a
  hairline and a 32px tinted icon tile; solid red strip only for real errors; primary
  button `#257248`, 15px/600, no wrap; secondary white with a `#b9c3be` border.
- Whole site, but only badges/chips, message boxes and buttons change.
- Act-now is **per viewer**: solid only for the person who must act; the other side
  sees the information tier.
- Admin: new or pending reports and appeals awaiting review are act-now amber.
- Delete-account explanation: white notice with a red icon tile, not the solid strip.
- Condition chips: all neutral grey.
- Lead decisions: First-come is an information category; Expired subscription and
  Rejected appointment are ended (neutral); trade has no colour; no new Sold/Reserved
  photo marks (main has none); dark-theme secondary border muted (about 3:1);
  membership selected tier card uses a brand 2px ring on white, no yellow tint.

## Status

Updated 2026-10-30 after the reviewer pass.

- Committed on `feature/giveaway-admin-quiet-badges` (not pushed):
  - `4beacb7` feat(frontend): quieter badges, message boxes and buttons
  - `8f70cc3` feat(frontend): giveaway phone tab and URL-driven tabs (the
    owner's changes from another chat)
  - plus the docs commit that carries this update.
- Reviewer fixes inside `4beacb7`: countdowns are act-now only for the side
  that must move (`viewerActsOnDeadline`, `CountdownPill viewerActs`); the
  deal headline in a room is never a second blocking strip, and an admin
  review on a cancelled deal is no longer shown as neutral.
- Checks on each committed tree: lint, `tsc`, `npm test` 84/84. Spot check
  on an isolated stack (43000/44000) at 360 and 1280, light and dark: no
  horizontal scroll. Stack torn down.
- **Not committed, waiting for the owner:** the behaviour changes in
  `app/(app)/giveaway/[giveawayId]/manage/manage-giveaway.tsx` (pick the
  remaining places after a first selection, stay on the page after
  confirming, chosen entrants first, back link to `?tab=given`, a Details
  button). Their origin is unknown. Also, the backend `select` is one-shot:
  it marks every other entrant Not selected and closes the giveaway. So the
  "You can pick N more" path can never work as written. Only the rail
  removal from that file is committed.
- `frontend/CLAUDE.md` is still modified and uncommitted (by design).

## Next steps

1. Owner: decide on the uncommitted `manage-giveaway.tsx` changes (see
   above). Commit them, rework them or discard them.
2. Owner questions left open: the light secondary button border `#b9c3be`
   is 1.81:1 on white (below the 3:1 UI-boundary guideline, but it is the
   approved value). `GIVEAWAY_STATUS.Closed` is `ended` while the pickup
   phase is `open`. The badge result is the same today (no one acts on
   either), but the two tables disagree.
3. Start the owner's dev servers for a look: backend `npm run start:dev` in
   `backend/` (port 4000), frontend `npm run dev` in `frontend/` (port 3000),
   both with Node 20.
4. Push and open the PR into `develop` only after the owner says so.

## Files in this folder

- `plan.md`: the approved plan.
- `quiet-badges.html`: the mock with the three styles (Style 3 chosen).
- `research/marketplaces.md`, `research/design-systems.md`: the research behind it.
