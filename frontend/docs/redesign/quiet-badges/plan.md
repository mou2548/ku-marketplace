# Quiet badges: implementation plan (Style 3, "Urgent stands out")

Owner decision 2026-10-30: Style 3 from `quiet-badges.html`. Branch
`feature/giveaway-admin-quiet-badges`, based on the latest `origin/main`. PR target is
`develop`, only after the owner says so. Research in `research/`.

## Scope

Whole site, but only three things change: **status badges and chips**, **message
boxes**, and **buttons**. Fonts (Prompt), card radius, menus, the app shell and every
layout stay as on `origin/main`.

## The rules (Style 3)

**Badges.** Two tiers.
- Information (the default): 22px tall, 4px radius, 12px/500, soft neutral fill
  (`n-bg` / `n-fg`), no border, icon 14px. Success statuses may use the soft green
  fill (`s-bg` / `s-fg`).
- Act now: a calm solid fill, 600 weight. Warning solid `#dbba66` with dark text;
  danger solid `#b05e4f` with white text (dark theme values in the mock).
- Which tier: a status is "act now" when its tone is warning or danger **and** it is
  not an ended state. Ended states (cancelled, expired, rejected, not selected,
  closed, violation confirmed) are information tier, neutral.
- Trade loses its blue: neutral, told apart by its icon and label.
- Condition, listing type, giveaway phase, admin pills, tier chips and countdown pills
  follow the same two tiers. Countdowns are information tier until their own warning
  threshold.

**Message boxes.** White surface, 1px `line` hairline, 12px radius, 12/14px padding,
ink text, the icon inside a 32px tinted tile (8px radius). A blocking error (danger)
is a solid strip (`d-solid`, white text). No tinted box backgrounds and no coloured
borders anywhere. Covers `Notice` and the about 33 hand-painted tinted boxes, 9
coloured top stripes and 4 coloured side rails found in the audit.

**Buttons.**
- Primary: fill `#257248` (white text 5.87:1), dark theme `#3ab572` with `#14171b`
  text; label 15px/600, does not wrap; one per screen.
- Secondary: white surface, 1px `#b9c3be` border, ink text.
- Danger: solid `d-solid`, used for the confirming step of a destructive action.
- Ghost unchanged. The `trade` variant becomes primary/secondary (no blue).
- The 27 raw `<button>` elements that imitate these styles move to the shared Button
  where the change is mechanical.

**Listing marks on photos.** Sold / Reserved: ink label (`#1f2421`, page-coloured
text). Free: primary green label.

## Tokens

Add the research palette B (brand-harmonised) as new semantic tokens in
`app/globals.css`, light and dark, as in the mock: `*-fg`, `*-bg`, `*-solid` for
success, warning, danger, info, neutral, plus the button tokens. Old tone tokens stay
until no component uses them, then are removed in the same branch.

## Steps

1. **Implement** (one agent): tokens, `tone.ts`, `StatusBadge`, `Notice`, `Button`,
   the chip components, then the hand-painted spots from the audit, route by route.
2. **Gates.** lint, `tsc`, `npm test`. Visual comparison against `origin/main` at
   360/768/1280, light and dark: every difference must be a badge, box, button or
   mark; no layout shift elsewhere. No horizontal scroll. Contrast checked for every
   new pair. axe clean.
3. **Review** (second agent): checks, fixes, commits (rantod-cmd, no AI trailer).
4. **Hand-off**: the owner's dev servers on 3000/4000. Push and PR into `develop`
   only after the owner says so.
