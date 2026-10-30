# Quiet badges: handoff for a new session

Updated 2026-10-31. Read this first, then `plan.md` in this folder.

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

- Implemented in the working tree: tokens (`--signal-*`, `--action-*`), `lib/badge-tier.ts`
  with tests, `lifecycle` on every status map entry, `StatusBadge`, `Notice`,
  `Button`, chip components, about 20 hand-painted boxes, 9 stripes and 4 rails removed.
- Was in progress when this note was written: the per-viewer tier, the admin and
  delete-account rulings, and the visual gate.
- Last known checks: lint, tsc and `npm test` (76/76) passed before the rulings.

## Next steps

1. Check `git status` and `git diff --stat` on `feature/giveaway-admin-quiet-badges`;
   confirm the rulings above are all applied (`lib/badge-tier.ts`, its tests).
2. Run lint, `npx tsc --noEmit`, `npm test` under Node 20
   (`~/.nvm/versions/node/v20.20.2/bin`).
3. Visual gate on an isolated stack (own ports, not 3000/4000; recipe:
   `git show redesign/full:frontend/docs/redesign/stack.md` and
   `redesign/full:frontend/scripts/redesign-stack/`): compare with `origin/main` at
   360/768/1280, light and dark; only badges, boxes and buttons may differ; no
   horizontal scroll; axe clean. Tear the stack down.
4. A reviewer pass (`code-review` at medium), then commit.
5. Start the owner's dev servers for a look: backend `npm run start:dev` in
   `backend/` (port 4000), frontend `npm run dev` in `frontend/` (port 3000), both
   with Node 20.
6. Push and open the PR into `develop` only after the owner says so.

## Files in this folder

- `plan.md`: the approved plan.
- `quiet-badges.html`: the mock with the three styles (Style 3 chosen).
- `research/marketplaces.md`, `research/design-systems.md`: the research behind it.
