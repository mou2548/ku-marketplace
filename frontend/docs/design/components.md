# Component System

Phase 4. Everything lives in `components/kit/` and is built on
`react-aria-components` with a hand-written visual layer.

**Why `kit/` and not `ui/`:** the legacy shadcn components in `components/ui/` are
still imported by 47 screens. Overwriting them would break the build for the whole of
Phase 5. `kit/` is the new system; `ui/` and the flat legacy components are deleted at
the end of Phase 5, at which point `kit/` can be renamed if desired.

Status: `tsc` clean, `eslint` clean, `next build` green.

---

## 1. Rules

1. **Never render a raw enum.** Everything routes through `lib/status.ts`.
2. **Never hardcode a hex.** Semantic tokens only — see [`tokens.md`](tokens.md).
3. **Never bypass RAC for interaction.** No raw HTML5 drag, no hand-rolled focus
   traps. The keyboard path is not optional.
4. **Mobile is the base.** Write the 360px layout first, then `sm:` / `md:` / `lg:`.
5. **Server Components by default.** `"use client"` only where interaction requires it.
6. **Elevation is decided by role, not by taste.** See the table below.

### Elevation by role

CLAUDE.md §3 opens with "The old UI failed because it was *flat*", and an audit
found `elevation="flat"` was the most-used value in the codebase — 22 call
sites against 3 for `floating`. The tokens were all there; the screens were not
spending them. A surface picks its elevation from what it *is*:

| Role | Elevation | Fill |
|---|---|---|
| The page itself | — | `--bg-page` |
| A container sitting directly on the page | `raised` | `surface`, or `plate` on a game surface |
| A rail or summary panel | `raised` | `plate` + `noise` |
| A row or cell nested inside another surface | `flat` or `sunken` | `sunken` |
| A tinted inline notice (`bg-tone-*-bg`) | `flat` + a 2px tone left rail | the tone wash |
| A well an item drops into | `sunken` | `sunken` |
| Dialog, sheet, popover, toast | `floating` / `--shadow-overlay` | `surface` |

A tinted notice is the one case that stays flat on purpose: a wash already
separates it from the page, and giving it a shadow as well makes it read as a
card the user can act on. It gets a tone-coloured left rail instead, so it is
annotated rather than blank.

### Width by role

A **column fills the space it is given. A control caps itself.**

A text input, a paragraph and a button have a usable maximum width. A table
row, a list of cards and a settings row do not — those read fine edge to edge,
because the eye tracks the label on the left and the control on the right.

**Never put `max-w-*` on a layout column to make its contents readable. Cap the
contents.** Capping the column leaves a dead band where the cap ends, and the
page reads as a narrow strip pinned to one side of the window.

This is written down because it went wrong three times: the detail pages, then
`/account`, then `/inventory/new`, which spent 44% of a 1600px window and left
896px of grey. Each time the cap was added for a good reason and each time it
produced the same result.

`scripts/layout-audit.mjs` checks it. It measures the widest painted surface —
not the rightmost element, which is what an earlier hand-rolled version got
wrong, reporting `/account` as 98% wide while the content stopped at 72%. Run it
before calling a layout change done, and open the screenshots as well as
reading the numbers.

```
node --experimental-websocket scripts/layout-audit.mjs
```

**Texture** (§3.3): `noise` belongs on game and rail surfaces — never behind
body text. `texture-grid` belongs on heroes, banners, and empty states.

Client components in this set: `button`, `field`, `countdown-pill`,
`inventory-slot`, `trade-bench`, `overlay`, `qr-ticket`, `appointment-card`, `slip`.
Everything else is a Server Component.

---

## 2. Foundation

### `lib/status.ts`
The single enum→presentation map. Research risk R1.

- 7 enum maps: transaction, offer, item, post type, ticket, allocation method,
  report, appeal — each value carrying `{ tone, label (Thai), icon, hint }`
- `ITEM_CONDITION` → rarity edge / glow / text for the inventory slot
- `requiresPayment(tx)` — a trade with no cash top-up skips the entire payment
  sequence. Resolved **once**, here, because four downstream components branch on it.
- `resolveTransactionActor(tx, viewer)` — risk R4. Second person when it is the
  viewer's turn, third person otherwise.
- `sellerConfirmDeadline` (24h) · `shippingDeadline` (ETA + 3d) ·
  `cancelResponseDeadline` (72h) · `TICKET_ROTATION_MS` (15 min) — risk R2
- `canReport(deadlines)` — the report button appears exactly when the flow says,
  never before

### `lib/use-now.ts`
`useNow(intervalMs)` — a ticking clock readable during render, via
`useSyncExternalStore`. Calling `Date.now()` in a component body is an impure read
and seeding it from an effect causes a cascading render; this is the sanctioned
shape. Server snapshot is `UNKNOWN_TIME` (`0`), and callers render a placeholder for
it rather than a wrong time.

### `components/kit/tone.ts`
Tailwind cannot see through a runtime string, so each tone's classes are written out
statically and looked up by key. The only place a tone becomes CSS.

### `components/kit/icon.tsx`
`lib/status.ts` names its icon as a string so it stays JSX-free. This registry
resolves those names, and keeps the lucide import tree-shakeable.

---

## 3. Primitives

| Component | Notes |
|---|---|
| `Button` | 5 variants × 5 sizes. Solid variants carry the lit top edge and press by translating 1px. `bg-brand text-on-brand` is 4.04:1 — legal only because button labels are large text. |
| `TextInput` / `TextAreaField` | Inputs are **sunken**, buttons are **raised**. That inversion is what makes a form read as wells to fill. |
| `Label` / `FieldError` / `FieldHint` | RAC field parts, styled. |
| `Surface` | The elevation vocabulary as a component: `elevation × shape × fill`, plus `noise` for the 2% texture. |
| `Overlay` | One primitive, two presentations — bottom sheet below `sm`, dialog above. RAC handles focus trap, scroll lock, `aria-modal`, Escape. Safe-area padded. |

---

## 4. Patterns

| Component | Research | What it does |
|---|---|---|
| `StatusBadge` | R1, principle 4 | tone + Thai sentence + icon. Takes a presentation object, never a string. |
| `CountdownPill` | R2, principle 2 | Escalates tone as the deadline nears — under 6h warning, under 1h danger. Ticks at 1s, coarser above an hour. |
| `ActorLine` | R4, principle 1 | The "whose turn is it" banner. Second person + the action button when it is yours. |
| `TrustBadge` | T1, principle 3 | KU verification wherever a person appears. |
| `TransactionStepper` | R3, principle 5 | Steps are **derived** from timestamps, and the step list differs per path — Shipping ends with a tracking number, Meetup with a scan, a cashless trade skips payment entirely. Vertical on mobile. |
| `MasonryGrid` / `MasonryItem` | P1, feed | CSS multi-column, not a JS masonry lib — a JS layout pass measures after paint and guarantees CLS. Documented tradeoff: reading order is column-major, so only use it where sequence carries no meaning. |
| `PostCard` | P1 | Reserves its aspect ratio before the image loads. Surfaces `course_name`, which existed in the schema and was invisible in the old UI. |
| `InventoryGrid` / `InventorySlot` | P3, R9 | Sunken wells with a rarity rim; the border colour **is** the condition. RAC `GridList` gives arrow-key navigation, multi-select, and a keyboard drag path. |
| `EmptySlot` | | Dashed well that lights up as a drop target. |
| `TradeBench` / `TradeSourcePanel` | P3, R5, principle 6 | Two stacks facing each other with the cash gap on the seam. Side-by-side on desktop, stacked on mobile with the money field at the join. |
| `AppointmentCard` | T3 | A commitment device. A `proposed` card carries a warning ring so it never reads as settled. Map iframe is lazy — an eager Google Maps frame would blow the route budget alone. |
| `SlipUploader` / `SlipReviewer` | T2 | The three-beat receipt: upload → inspect → confirm, with both timestamps rendered. Zoom on the reviewer is load-bearing: an unreadable slip means a seller confirms blindly or stalls, and stalling starts the 24h clock. |
| `QrTicket` | R8, principle 7 | Countdown ring + silent self-refresh 5s before expiry + one line saying why it rotates. A dead QR is never displayed. One effect owns the whole rotation loop. |
| `EmptyState` | principle 10 | Mark, a sentence explaining *why* it is empty, and exactly one action. |

---

## 5. Choice, navigation, and comms

| Component | Notes |
|---|---|
| `SelectField` / `SelectOption` | RAC `Select` + `Popover`. Trigger matches the sunken input well. |
| `Checkbox` | 20px mark inside a 44px row. |
| `RadioGroupField` / `Radio` | Passing `description` turns the row into a pressable card — the shape the giveaway allocation picker needs, where each method must explain itself (research R7). |
| `Switch` | Spring-eased knob. |
| `DatePickerField` | Segmented, locale-aware, keyboard operable. `<input type="date">` renders inconsistently across Thai Android browsers, and a JS date library costs more than the component. Used by appointments (T3), the giveaway window (R7), and the delivery estimate. |
| `OtpInput` | **One** real input holds the value, with boxes drawn over it. Splitting the value across six inputs — the common approach — breaks SMS autofill on iOS and Android. |
| `Tabs` / `SegmentTab` / `UnderlineTab` / `TabCount` | Segment for peers (buyer/seller filter, market segments), underline where a tab carries a count (Offers inbox, R6). Scrolls horizontally on mobile rather than wrapping. |
| `AppShell` | 5-slot bottom tab bar with a raised centre FAB on mobile; persistent sidebar on desktop. Safe-area padded, 44px targets. Badges come from one derived count so Home and Deals can never disagree. |
| `QrScanner` | Platform `BarcodeDetector` with manual code entry as the fallback. A ~250 KB JS decoder would eat the whole route budget for a screen used once per deal, and a handover blocked by a failed polyfill is worse than typing six characters. |
| `ChatThread` / `ActionCard` | IA decision D1: the chat **is** the transaction. Flow actions render as cards in the thread, not on their own routes. Scroll jumps rather than animating, so reading back is not fought. `isReadOnly` covers the giver-only giveaway room (flow 3). |
| `ToastProvider` / `useToast` | Only for actions that do not change the screen. `role="status"`, polite, above the tab bar. |

---

## 6. Phase 4 exit criteria

- [x] `lib/status.ts` covers every enum in the schema
- [x] Rarity, tones, and deadlines wired to tokens
- [x] Drag-and-drop has a keyboard path
- [x] Form, choice, navigation, chat, and scanner primitives
- [x] `tsc` clean · `eslint` clean · `next build` green
- [ ] Delete `components/ui/`, the flat legacy components, the legacy alias block in
      `globals.css`, and the `shadcn` / `tw-animate-css` imports — **end of Phase 5**,
      once no screen imports them
- [ ] Remove `shadcn` and `@base-ui/react` from `package.json`

### Dependencies added in this phase

`react-aria-components` · `motion` · `@internationalized/date`
