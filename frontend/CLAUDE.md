# KU Marketplace — Frontend

Student marketplace for Kasetsart University: buy/sell, item trading, and giveaways.
This file governs all work in this directory. It supersedes any previous design guidance.

---

## 0. Scope lock — read this first

**All work happens inside `frontend/`. Nothing outside it may be created, edited, or deleted.**

Explicitly off limits:

- `backend/` — do not read for guidance, do not modify, do not "fix"
- `init.sql`, `docker-compose.yml`, `README.md` at the repo root
- any `CLAUDE.md` outside this folder

Two exceptions, both deliberate:

- **The repository root `.gitignore`** may be created and edited. It exists, and
  `.claude/` is listed in it.
- **The repository root `.claude/`** holds the installed design skills, agents, and
  hooks. It is git-ignored, never committed, and never pushed. Do not edit it as part
  of design work; installing or updating a skill there is its own task.

The API contract is fixed. **The frontend adapts to the backend, never the reverse.**
If a screen needs data the API does not return, note the gap in
`docs/design/api-gaps.md` and design around it. Do not invent endpoints.

---

## 1. Source of truth

Design and behaviour derive from `fornewdesign/` (git-ignored, local only):

| File | Authority over |
|---|---|
| `flow1.png` | Buy / trade / cancel / refund / dispute state machine, including every timer |
| `flow2.png` | Report → investigation → appeal state machine |
| `flow3.png` | Giveaway allocation and ticket lifecycle |
| `flow4.png` | Auth, account actions, membership tiers |
| `API_Marketplace.pdf` | Every endpoint, request shape, response envelope |
| `DatabaseSchema.pdf` | Every table, column, and status enum |

There is no legacy design system to preserve. The previous UI is being replaced.

**Response envelope** — every endpoint except `DELETE` returns:

```json
{ "success": true, "message": "...", "data": {} }
```

---

## 2. Stack

| Concern | Choice | Rule |
|---|---|---|
| Framework | Next.js 16 (App Router) | **This is not the Next.js in your training data.** Read `node_modules/next/dist/docs/` before writing routing, caching, or data-fetching code. Heed deprecation notices. |
| React | 19 | Server Components by default. `'use client'` only for event handlers, state, effects, or browser APIs. |
| Styling | Tailwind v4 (`@theme` in `app/globals.css`) | No CSS-in-JS. No separate `tailwind.config.ts`. |
| Headless components | `react-aria-components` | The only component library. Chosen for keyboard-accessible drag-and-drop (the inventory and trade UI) and DatePicker (appointments, giveaway windows). |
| Motion | `motion` | Spring physics for item pickup, card lift, countdown rings, stepper progress. |
| Icons | `lucide-react` | Already present. |
| QR | `qrcode` | Already present. |
| Runtime | Node 20 only | Enforced by the `predev` script. |

**Removed and never to return: `shadcn`, `@base-ui/react`, `tw-animate-css`.**
Everything in `components/ui/` is hand-written on top of `react-aria-components`.
`react-aria-components` ships zero CSS — the entire visual layer is ours.

---

## 3. Design principles

The audience is a KU student in 2026 on a phone. The register is **modern, calm, and
easy to read: quiet colour, generous space, and hierarchy carried by type and
structure rather than by saturation.** Nothing on screen should shout.

**Where game DNA applies.** The game-inventory metaphor is confined to the two
surfaces whose mental model actually needs it — **inventory** and **trade/offer**.
There it stays: slots, rarity-coloured borders, drag to place, texture on the panel.
Everywhere else — feed, post, transaction, chat, giveaway, account, membership,
admin, auth — the surface is quiet and modern, and rarity colour, panel texture, and
game framing must not appear.

The old UI failed because it was *flat*, not because it was wrong. Every screen must
earn its depth. These are non-negotiable:

1. **Depth over outline.** Layered shadows plus a 1px top inner highlight, never a
   lone hairline border, to separate a surface from its background.
2. **Radius rhythm.** Radii differ by role: cards `20px`, inventory slots `10px`,
   buttons `12px`, pills fully round. One radius everywhere reads as a template.
3. **Texture is rationed.** 2% noise on the inventory and trade panels only. Never on
   body text backgrounds, and never on a surface outside those two.
4. **Green-tinted neutrals.** Grays carry a trace of the brand hue. Pure `#808080`
   grays are banned.
5. **Type carries hierarchy.** Prompt at display sizes with negative tracking and
   600–700 weight. Do not rely on color alone to signal importance.
6. **Motion is feedback, not decoration.** Every state change animates; nothing
   animates without a state change. Respect `prefers-reduced-motion`.
7. **No empty emptiness.** Every zero-state gets an illustration, a sentence
   explaining why it is empty, and one clear action.
8. **Game DNA, modern execution — inventory and trade only.** Those two surfaces read
   as a game inventory: slots, rarity-coloured borders, drag to place, rendered
   cleanly and with real depth, not as retro pixel skeuomorphism. No other screen
   borrows the vocabulary.
9. **Quiet by default.** Saturated fills are reserved for a single primary action per
   screen and for genuine danger. Status, category, and metadata are carried by
   plain language, weight, and a lucide icon before they are carried by colour.

---

## 4. Brand and tokens

Primary is `#2E8F5A`, anchored at step **600** of the primary ramp.

**Contrast rule, absolute:** `#2E8F5A` on white is **4.04:1** — it fails WCAG AA for
normal-size text. Use `primary-600` for fills, chrome, icons, and large bold labels
only. All normal-size text and links use `primary-700` (`#257248`, 5.88:1).

Semantic ramps: `primary` (green), `neutral` (green-gray), `warning` (amber),
`danger` (rose), `info` (blue), `trade` (violet — separates trade posts from sale
posts at a glance).

**Never hardcode a hex value in a component.** Every color comes from a semantic
token. The app is light-theme only for now, but tokens are written semantically so a
dark theme can be added later without touching a single component.

---

## 5. Responsive — mobile first, mandatory

Students use this on phones. Write the mobile layout as the base, then add `sm:`,
`md:`, `lg:`. Never write a desktop layout and shrink it.

Every screen is verified at **360px**, **768px**, and **1280px** before it is done.

- Mobile: bottom tab bar, full-bleed cards, sheets instead of dialogs
- Desktop: sidebar navigation, masonry grid, dialogs
- Touch targets: minimum 44×44px
- No horizontal page scroll at any width — wide content scrolls inside its own
  `overflow-x: auto` container

---

## 6. Accessibility — WCAG 2.2 AA

- Body text contrast ≥ 4.5:1; large text and UI boundaries ≥ 3:1
- Every interactive element reachable and operable by keyboard
- **The inventory and trade drag interactions must have a keyboard path.**
  `react-aria-components` provides it; do not bypass it with a raw HTML5 drag API.
- Visible focus rings everywhere; never `outline: none` without a replacement
- Semantic HTML first; ARIA only when semantics run out
- Status is never conveyed by color alone — always pair with an icon or text

---

## 7. Performance budget

| Metric | Target (p75, mobile 4G) |
|---|---|
| LCP | ≤ 2000ms |
| INP | ≤ 200ms |
| CLS | ≤ 0.05 |
| JS per route | ≤ 150 KB gzip |
| Lighthouse a11y | ≥ 95 |

Masonry cards reserve their aspect ratio before images load — the feed must not
shift. Use `next/image` with explicit `sizes`. Skeletons match final dimensions.

---

## 8. Code conventions

- `components/ui/` — primitives (Button, Input, Dialog, Sheet, Tabs, …)
- `components/patterns/` — composed, reusable (PostCard, StatusBadge, Stepper, …)
- `components/features/<domain>/` — feature-bound (trade, giveaway, chat, inventory)
- `lib/` — data access and domain logic; keep enum-to-label maps here, not in JSX
- Props are typed; no `any`. Discriminated unions for status props.
- Every backend enum value is handled explicitly — no silent `default` fallthrough
  that hides an unhandled state.

---

## 9. Language and typography rules

**English is the primary language of this repository.** Code, identifiers,
comments, commit messages, documentation, and file names are all written in
English, without exception.

**Never use emoji.** Not in code, not in comments, not in documentation, not in
commit messages, not in UI copy, and not in chat replies. Use words, a lucide
icon, or a typographic mark instead. This includes decorative status marks such
as check marks and coloured squares in tables and headings — write "done" or
"pending" instead.

---

## 10. Workflow rules

1. **Propose a plan before editing code.** Every time, no exceptions.
2. **Never guess. Ask.** If anything is unclear — which screen is meant, which
   behaviour is wanted, which value is correct, which file to touch — stop and
   ask the user. Do not infer it from context, do not pick the likeliest option,
   do not proceed on an assumption and flag it afterwards. A question costs a
   minute; a wrong assumption costs a rewrite. This outranks any instinct to keep
   momentum.
3. **Commits are allowed. Pushing requires explicit permission — always ask first.**
4. Never commit `.claude/`, `CLAUDE.md`, or anything under `fornewdesign/`.
5. Never add an AI assistant as a commit author, co-author, or trailer.
6. **When the context budget runs low, stop and say so.** Do not rush to finish a
   phase with the remaining tokens; the user decides whether to continue.
7. Work one phase at a time. Report what changed at the end of each.
8. **Use the installed design skills. Do not work from memory when a skill covers
   the task.** They are installed deliberately and each owns a different job:

   | Skill | Use it for |
   |---|---|
   | `impeccable` | The design workflow itself: `critique`, `audit`, `polish`, `quieter`, `distill`, `layout`, `typeset`, `clarify`, `harden`, `adapt`, `document`. This is the default driver for any screen-level pass. |
   | `ui-ux-pro-max` (and its `design`, `design-system`, `brand`, `ui-styling` siblings) | Its searchable local database — styles, palettes, font pairings, chart types, per-stack patterns — when choosing or justifying a visual decision. |
   | `frontend-design` | Aesthetic direction when a surface risks reading as a template. |
   | `senior-frontend` | React 19 / Next.js 16 / Tailwind 4 implementation questions and bundle work. |
   | `dataviz` | Any chart, meter, or stat tile. |
   | `code-review` | Before each phase is called done. |

   Name the skill you used in the phase report. If none applies, say so rather
   than skipping silently.

**Impeccable setup.** `PRODUCT.md` lives at `frontend/PRODUCT.md`, and the skill is
installed at the repository root. `context.mjs` therefore only resolves this project
correctly when a target inside `frontend/` is passed:

```
node ../.claude/skills/impeccable/scripts/context.mjs --target frontend/app/<route>/page.tsx
```

Run it from the repository root, once per session, and always with `--target`.
Without the flag it reports `NO_PRODUCT_MD` and will try to re-run the init
interview the user has already sat through.
