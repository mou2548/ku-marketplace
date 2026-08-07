# KU Marketplace — Frontend Redesign Plan

**This is a redesign from a blank canvas, not a restyle.** Every screen except the
login and register pages is thrown away and designed again around the user, not
around the existing markup. Applying new colours to old layouts is explicitly not
the goal.

Governing rules: [`../CLAUDE.md`](../CLAUDE.md) · Research: [`ux/research.md`](ux/research.md)
· Tokens: [`design/tokens.md`](design/tokens.md)

**Scope: `frontend/` only. The backend and the API contract are untouchable.**

---

## 1. What the research changed

The plan is not a list of screens to prettify. It is derived from findings. Each
finding below has a named owner in a later phase — nothing is research theatre.

| Finding | What it forces | Phase |
|---|---|---|
| **T1** identity is the only trust anchor (money moves off-platform, no escrow) | KU verification visible wherever a person appears — feed card, chat header, offer row. Not buried in a profile. | 4, 5 |
| **T2** the slip *is* the receipt | Upload → review → confirm rendered as a visible three-beat sequence with both timestamps, never a silent flag | 4, E3 |
| **T3** "will they show up?" | Appointment card as a commitment device: both sides accept, and unanswered looks different from accepted | 4, E6 |
| **R1** 24 enum values across 5 tables, `Pending` means five different things | Enums never reach the screen. `lib/status.ts` maps every value to tone + plain-language sentence + icon + actor. | 4 |
| **R2** four invisible clocks in flow 1 (24h / 8h / 72h / +3d) | `CountdownPill` on transaction, history, and chat. Deadlines appear *before* they bite. | 4, E3 |
| **R3** four terminal paths through one flow | The UI commits to one path the moment a delivery method is picked, and shows only its steps | E3, E4 |
| **R4** "whose turn is it" is the most-asked question | A second-person actor line at the top of every transaction. A "needs your action" home surface. | 3, 4, E3 |
| **R5** the cancel/refund path is as complex as the happy path | Reuse the *same* slip and stepper components — a user who did the payment sequence already knows this one | E3 |
| **R6** offers vanish after submission | Offer inbox as a first-class destination; `Withdrawn`/`Cancelled` collapsed into one user-facing state | 3, E4 |
| **R7** giveaway waiting has no shape | Allocation method and draw time stated at registration; waiting gets a real screen | E7 |
| **R8** a rotating QR reads as a bug | Countdown ring, silent auto-refresh, one line saying why. Never show a dead QR. | 4, E7 |
| **R9** inventory-before-post is a novel concept | Framed as "my stuff" — a possession, not a draft | E5 |
| **P1** buyers search by course code | `item.course_name` becomes a primary search axis (it exists in the schema and is invisible today) | E2 |
| **P2** end-of-semester dumping is bulk work | Multi-select and batch listing in inventory | E5 |
| **P3** a trade is two inventories negotiating | Side-by-side bench, not a form. Violet tone separates trade from sale in the feed. | 4, E4 |

Nothing above needs a new endpoint. "Needs your action" and every countdown are
derived client-side from `/transactions` plus the timestamp columns the schema
already has.

---

## 2. Ten principles every screen is checked against

From `ux/research.md` §6.

1. Whose turn is it — always answer, always first
2. Time is a first-class object; no surprise expiries
3. Verification is the product
4. Status speaks plain language — never colour alone
5. One path per transaction
6. Trade is comparison, not a form
7. The handover is the climax — QR and slip get the most visual weight
8. Mobile is the design, desktop is the adaptation
9. Depth over outline
10. Nothing is empty

---

## 3. Locked decisions

| Topic | Decision |
|---|---|
| Scope | `frontend/` only. No backend, no API, no root files. |
| Primary | `#2E8F5A` at ramp step 600. Text uses 700 (`#257248`, 5.88:1). |
| Font | Prompt, with a new scale tuned for Thai leading |
| Component library | `react-aria-components` — the only one. Chosen for keyboard-accessible drag-and-drop and DatePicker. |
| Motion | `motion` |
| Removed | `shadcn`, `@base-ui/react`, `tw-animate-css` |
| Visual layer | hand-written, 100%. RAC ships zero CSS. |
| Theme | light only; tokens are semantic so dark can be added later |
| Responsive | mobile-first, mandatory. Verified at 360 / 768 / 1280. |
| Game feel | modern-game — slots, rarity edges, drag, real depth. Not retro pixel skeuomorphism. |
| Navigation | **Sticky top navbar**, kept from the previous build. Hamburger drawer on mobile, as before — see `design/ia.md` §4. |
| Repo language | English throughout: code, identifiers, comments, docs, commits. |
| Emoji | Never, anywhere. See `../CLAUDE.md` §9. |
| **Not redesigned** | `app/page.tsx` (login) and `app/auth/register/page.tsx`. Visual design frozen; they are only ported off shadcn in Phase 4 with their appearance preserved. |

---

## 4. Phases

### Phase 0 — Housekeeping — done

- root `.gitignore` created out of scope → removed
- `frontend/.claude/settings.json` untracked via `git rm --cached` (file kept on disk)
- `frontend/.gitignore` deduplicated and grouped
- `frontend/CLAUDE.md` written — scope lock, stack, principles, budgets, workflow rules

> Open item outside scope: `backend/.claude/skills/prisma-*` is still tracked in git.
> Flagged, not touched.

### Phase 1 — UX research — done

`docs/ux/research.md` — 4 proto-personas with JTBD, teardown of 5 incumbent channels,
5 trust gaps, 9 usability risks read off the flow diagrams, 10 design principles, and
a one-afternoon validation plan. Stated openly as proto-research, not evidence.

### Phase 2 — Design system — done

`app/globals.css` rewritten; `docs/design/tokens.md` documents it.

- 6 ramps × 11 steps, every contrast ratio computed and recorded
- semantic layer — components never touch a raw ramp
- 6 tones as the enum target; the enum→tone map lives in TypeScript
- 4 rarity treatments for `Item.condition`
- type scale on Prompt with 1.65–1.75 leading for Thai, `clamp()` for mobile-first
- 5 radii by role, 4 elevations with a lit top edge, sunken and rarity shadows
- motion tokens, texture utilities, layer scale with a dedicated drag layer
- legacy alias block keeps all 57 routes building — **build verified green**

### Phase 3 — Information architecture

**Output:** `docs/design/ia.md`

The current app is 57 flat routes with no shell. The redesign gives it a spine:

- `(auth)` — login and register keep their current design, moved into a group
- `(app)` — **sticky top navbar**, the shape kept from the previous build at the
  team's request, restyled onto the new tokens; hamburger drawer on mobile;
  buyer/seller lens; global search; notification bell
- `(admin)` — separate shell
- **A "needs your action" home surface** — the direct answer to R4, assembled from
  data the API already returns
- Redirect map so all 57 existing URLs keep working

### Phase 4 — Component system

**Output:** `components/`, `docs/design/components.md`

`ui/` rewritten on RAC: Button, Input, Textarea, Select, Label, Dialog, Sheet, Tabs,
Badge, Card, Avatar, OTPInput, DatePicker.

`patterns/` — new, and where the research lands:

| Component | Serves |
|---|---|
| `MasonryGrid` + `PostCard` | Pinterest-style variable height, Sell/Trade/Both tone, CLS 0 |
| `InventorySlotGrid` | R9, P3 — slots, rarity edges, drag **and keyboard** |
| `TradeOfferBench` | P3, R5 — two stacks side by side plus the cash gap |
| `TransactionStepper` | R3, R4 — one path, current actor |
| `AppointmentCard` | T3 — time, place, map embed, two-sided accept |
| `SlipUploader` / `SlipReviewer` | T2 — the three-beat receipt |
| `QRTicket` / `QRScanner` | R8, principle 7 — countdown ring, silent refresh |
| `CountdownPill` | R2 — all four clocks |
| `StatusBadge` | R1 — tone + plain-language sentence + icon + actor |
| `TrustBadge` | T1 — KU verification, faculty, year |
| `EmptyState` | principle 10 |

`lib/status.ts` — the single enum→presentation map.
**End of phase: delete the legacy alias block and the shadcn + tw-animate imports.**

### Phase 5 — Screens, designed again

Each epic starts from the user's job, not from the existing file.

| # | Epic | Core design problem |
|---|---|---|
| E1 | Auth | *not redesigned* — port to new primitives, appearance preserved |
| E2 | Marketplace feed | masonry; course-code search (P1); filters that answer "can I get this today?" |
| E3 | Buy | branch hard on Shipping vs Meetup (R3); slip sequence (T2); four visible clocks (R2); report appears exactly where the flow says |
| E4 | Trade | the bench (P3); offer inbox as a destination (R6); two completion paths depending on `additional_money` |
| E5 | Post + Inventory | possession framing (R9); bulk capture and batch listing (P2) |
| E6 | Chat | per-transaction thread; appointment cards (T3); flow actions inline as cards, not buried in a menu |
| E7 | Giveaway | method and draw time up front (R7); giver-only chat; rotating ticket that never looks broken (R8) |
| E8 | History, report, appeal | every status legible (R1); report gated on flow conditions; appeal path |

### Phase 6 — Quality gate

| Check | Target |
|---|---|
| LCP p75, mobile 4G | ≤ 2000ms |
| INP | ≤ 200ms |
| CLS | ≤ 0.05 |
| JS per route | ≤ 150 KB gzip |
| Lighthouse a11y | ≥ 95 |
| Contrast | every token pair re-verified |
| Keyboard | full drag path on the inventory and trade bench |
| Breakpoints | 360 / 768 / 1280 on every screen |

Plus the one-afternoon student validation from `ux/research.md` §8, run between
Phase 3 and Phase 5.

---

## 5. Working agreement

1. A plan is proposed before code is edited. Every time.
2. Commits are fine. **Pushing requires permission — ask first.**
3. `.claude/`, `CLAUDE.md`, and `fornewdesign/` never enter a commit.
4. No AI assistant is ever named as a commit author or co-author.
5. When context runs low, stop and say so. Do not spend the remainder rushing.
