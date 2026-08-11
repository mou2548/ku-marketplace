# Design Tokens

Source of truth: `app/globals.css`. This file explains the *why* and records the
contrast maths. Every design decision here traces to a finding in
[`docs/ux/research.md`](../ux/research.md).

**Rule, absolute:** components reference **semantic** tokens only. A raw ramp step
(`--green-600`) or a hex literal in a component is a bug.

---

## 1. Why these tokens exist

The previous UI was not wrong, it was *flat* — one radius, one hairline border, one
1px shadow, neutral grays, no motion. Research principle 9 ("depth over outline")
drives the elevation and shape sections below; principle 4 ("status speaks plain language")
drives the tone system; risk R1 (24 enum values across 5 tables) drives the decision
to map enums to tones **in TypeScript, never in CSS**.

---

## 2. Primary ramp — anchored at 600

`#2E8F5A` is the brand colour. It sits at step 600 so there are five lighter steps
for washes and four darker for text.

| Step | Hex | vs white | Use |
|---|---|---|---|
| 50 | `#F4F9F6` | 1.07 | page background |
| 100 | `#E6F2EB` | 1.15 | badge wash, hover fill |
| 200 | `#CDE7D9` | 1.31 | subtle border, selection |
| 300 | `#A7DABE` | 1.56 | tone border |
| 400 | `#6BCA96` | 2.00 | decorative only |
| 500 | `#3AB572` | 2.60 | rarity edge (Good) |
| **600** | **`#2E8F5A`** | **4.04** | **brand fill, icons, button background. Fails AA for normal text.** |
| **700** | **`#257248`** | **5.88** | **text and links. AA pass.** |
| 800 | `#1F5939` | 8.23 | headings on wash |
| 900 | `#19432C` | 11.16 | |
| 950 | `#122B1D` | 15.04 | ink, inverse surfaces |

### The one rule people get wrong

`#2E8F5A` on white is **4.04:1**. WCAG AA needs 4.5:1 for text under 18.66px
regular / 24px bold.

```
OK   <p class="text-ink-brand">      → green-700, 5.88:1
OK   <button class="bg-brand text-on-brand">  → white on green-600, 4.04:1,
                                               allowed because button labels are
                                               >=16px at weight 600 (large text)
BAD  <p class="text-brand">          → green-600 body text, 4.04:1, FAILS
```

Verify with: `docs/design/` has no checker script — use any WCAG contrast tool, or
the numbers in this table, which were computed with the WCAG 2.x relative-luminance
formula.

---

## 3. Neutrals are green-tinted

Pure `#808080` grays next to a saturated green read as dirty. Every neutral carries a
trace of the brand hue (~147°) at very low saturation.

| Step | Hex | vs white | Use |
|---|---|---|---|
| 50 | `#F6F8F7` | 1.08 | sunken surface |
| 100 | `#EBEDEC` | 1.18 | neutral tone wash, secondary fill |
| 200 | `#D8DCDA` | 1.39 | `--border-subtle` |
| 300 | `#BDC4C0` | 1.78 | `--border-default` |
| 400 | `#94A09A` | 2.70 | `--border-strong`, disabled glyph. **Never text.** |
| 500 | `#708077` | 4.17 | large text and icons only |
| 600 | `#58655E` | 6.12 | `--text-muted`. AA. |
| 700 | `#46504B` | 8.34 | `--text-secondary` |
| 800–950 | | 10.7–16.4 | inverse surfaces |

---

## 4. Accent ramps

| Ramp | Base | AA text step | Meaning |
|---|---|---|---|
| amber | `#F09C00` | **700** `#966200` (5.20) | waiting on someone, deadline near, membership |
| rose | `#BE324B` | **500** `#BE324B` (5.61) | cancelled, reported, expired, destructive |

Only two accent ramps remain. **Blue, violet and gold were deleted** — see "The
palette: five hues" below. Violet used to carry trade on the reasoning that a
swap is a different mental model from a purchase; the feed still signals that
before the tap, but with a filled chip that says "For trade" in words rather
than with a sixth hue.

---

## 5. Tones — the enum layer

Six tones, each a trio of wash / border / text plus a solid fill. **Backend enums map
to a tone in `lib/status.ts`, never in CSS.** This is what keeps risk R1 contained:
one place to change, 24 enum values, zero raw enum strings in JSX.

| Tone | Wash | Border | Text | Solid |
|---|---|---|---|---|
| neutral | gray-100 | gray-400 | gray-700 | gray-600 |
| info | green-100 | green-400 | green-700 | green-400 |
| success | green-200 | green-600 | green-800 | green-700 |
| warning | amber-100 | amber-600 | amber-800 | amber-500 |
| danger | rose-100 | rose-400 | rose-600 | rose-500 |
| trade | gray-100 | gray-400 | gray-700 | gray-600 |

Every `*-fg` on its own `*-bg` clears 4.5:1 — info 5.10, success 6.28.

`trade` is the neutral trio. The name survives so the enum maps in
`lib/status.ts` keep compiling; retiring the union member is a type change, not
a colour one, and is still outstanding.

### The palette: five hues, and no more

The product uses **five colours**. Everything else is the green-tinted neutral
ramp, which carries text and surfaces and is not a colour decision.

| Hue | Step | Carries |
|---|---|---|
| Deep green | `green-600/700/800` | Brand, success, condition `New` |
| Light green | `green-100/400` | Info — "in progress" — and condition `Very Good` |
| Light amber | `amber-400` | Condition `Good` |
| Deep amber | `amber-600/700/800` | Warning, membership tier, condition `Acceptable` |
| Rose | `rose-400/500/600` | Danger, condition `Worn` |

Blue, violet and gold were **retired**. Info moved to the light green, trade to
neutral, membership to amber. The ramps are deleted from the primitives, not
merely unused — a sixth hue must replace one of these five, not join them.

Two consequences to know about:

- **Info and success share the green.** Six tones over five hues means a pair
  must share, and "on the way" and "arrived" are the pair that share best. Their
  washes are 1.14:1 apart, so the border and the icon do the separating; colour
  is never the only signal (§6).
- **A filled chip uses the 700 step, not the 600.** White on `green-600` is
  4.04:1 and on `amber-600` is 3.50:1 — both below AA for a normal-size label.
  `green-700` (5.87:1) and `amber-700` (5.19:1) carry it. Same hue, deeper. The
  600 steps stay legal for large text and for fills with dark text on them.

### What colour is for

Colour has exactly three jobs. Everything else is type, weight and space
(principle §3.5: "Type carries hierarchy. Do not rely on color alone to signal
importance").

| Role | Owns | Never |
|---|---|---|
| **Severity** — the tone system | Status. The weight is chosen by `variant="auto"`, not by the call site | A category, a type, a method |
| **Rarity** — the condition ramp | One edge per item, and the filter dots | Free-floating coloured text |
| **Brand** — green | The primary action, and identity | Neutral metadata |

**A category is not a severity.** Post type, allocation method and item status
are facts about *what a thing is*, not about whether something went wrong. They
get a wash at most, and where type can carry the distinction instead, no chip at
all. An audit found seven call sites forcing `variant="solid"` and every one of
them was a category — which meant the loudest treatment in the system was
reserved for the most routine facts on the screen.

**Colour is applied as a class, not as `style`.** Passing `rarity.fg` into
`style={{ color }}` is a token value smuggled past the class layer, and it is why
item condition once appeared in five different shapes across the product. The
ramp is exposed in `@theme` as `--color-rarity-*` and `--shadow-rarity`; where a
value genuinely has to vary at runtime, set a CSS custom property on the element
the way `inventory-slot.tsx` sets `--slot-edge`, and let the class read it.

### Severity contract

A tone is a severity, not a mood. The rule is written out in full at the top of
`lib/status.ts` and every table there is judged against it:

| Tone | Means |
|---|---|
| danger | Terminal failure, or a state that costs the viewer something |
| warning | Waiting on a human, or a clock running down |
| info | The system is moving and nobody is blocked |
| success | A good outcome that has actually happened |
| neutral | A no-op: archived, or ended by the viewer's own choice with nothing lost |
| trade | A category accent, never a severity |

Two consequences worth stating, because the first pass got both wrong:
availability is not success (an open giveaway has achieved nothing yet), and
money returned is not failure (a refunded deal is simply over).

`StatusBadge` defaults to `variant="auto"`, which paints **danger solid and every
other tone as a wash**. When all six tones washed, a cancelled deal and a
completed one were the same weight of pastel and severity did not survive a
glance down a list. There is now exactly one loud thing on a screen: the thing
that went wrong.

### Mapping implemented in `lib/status.ts`

Derived from `DatabaseSchema.pdf`. Each status also gets a plain-language sentence and
an icon — never colour alone (research principle 4, WCAG 1.4.1).

| Enum | Value | Tone | Label |
|---|---|---|---|
| `transaction.status` | `Pending` | warning | Awaiting payment |
| | `Processing` | info | In progress |
| | `Completed` | success | Completed |
| | `Cancelled` | danger | Cancelled |
| | `Pending Refund` | warning | Awaiting refund |
| | `Refunded` | neutral | Refunded |
| `offer.status` | `Pending` | warning | Awaiting response |
| | `Accepted` | success | Accepted |
| | `Rejected` | danger | Declined |
| | `Cancelled` / `Withdrawn` | neutral | Offer withdrawn *(collapsed — risk R6)* |
| `item.status` | `Unlisted` | neutral | Unlisted |
| | `Listed` | info | Listed |
| | `Transferred` | success | Handed over |
| `post_type` | `SellOnly` | success | For sale |
| | `TradeOnly` | trade | For trade |
| | `Both` | trade + success | Sale or trade |
| `ticket.status` | `Registered` | info | Registered |
| | `Waiting` | warning | Ready to collect |
| | `Received` | success | Collected |
| | `Not_Selected` | danger | Not selected |
| | `Expired` | danger | Pickup window closed |
| `giveaway.status` | `Active` | info | Open for entries |
| | `Closed` | warning | Entries closed |
| | `Completed` | success | Finished |
| `user.status` | `Active` | success | Active |
| | `Suspended` | danger | Suspended |
| | `Banned` | danger | Banned |
| | `Deleted` | neutral | Closed |
| `subscription.status` | `Active` | success | Active |
| | `Expired` | warning | Expired |
| | `Cancelled` | neutral | Cancelled |
| `report.status` | `Pending` | warning | Awaiting review |
| | `Under_Investigation` | info | Under investigation |
| | `Violation_Confirmed` | danger | Violation confirmed |
| | `Report_Dismissed` | neutral | Dismissed |
| `appeal.status` | `Not_Appealed` | neutral | Not appealed |
| | `Appeal_Submitted` | warning | Appeal submitted |
| | `Appeal_Under_Review` | info | Appeal under review |
| | `Appeal_Upheld` | success | Appeal upheld |
| | `Appeal_Rejected` | danger | Appeal rejected |

`StatusBadge` additionally renders **whose turn it is** (risk R4) — the label above is
the state, the badge's second line is the actor.

---

## 6. Rarity — `Item.condition` as a game signal

Research P3 and principle "game DNA, modern execution". The inventory slot border
colour *is* the condition, at a glance.

**One ramp, green to red, strictly monotonic** — all five grades the seed
actually stores, in order:

| Condition | Edge | Glow | Text |
|---|---|---|---|
| `New` | green-600 `#2E8F5A` | 32% green | green-700 (5.88) |
| `Very Good` | green-400 `#6BCA96` | 30% green | green-700 (5.88) |
| `Good` | amber-400 `#F7B63E` | 26% amber | amber-700 (5.20) |
| `Acceptable` | amber-600 `#BD7B00` | 24% amber | amber-800 (7.46) |
| `Poor` | rose-500 `#BE324B` | 26% rose | rose-600 (7.93) |

The first pass put `New` on gold and `Poor` on amber, and had `Very Good`
lighter than `Good` — so the worse grade looked better, the worst grade read as
"caution" rather than "worn", and the top grade sat off the axis entirely. Hue
now carries the grade and nothing else does.

`New` and `Very Good` share green-700 as their text colour; the edge and the
word differ, which is enough because the colour is never the only signal.

The edges below green-600 do not clear 3:1 as standalone graphical objects —
green-400 is 2.00 and amber-400 is around 2.2. That is deliberate: forcing every
step above 3:1 collapses the ramp into three visually adjacent darks and the
five grades stop being separable from each other, which is the whole job. The
edge is decorative reinforcement, not the carrier — the condition is always
also present as the word, in the slot's accessible name, and in the condition
chip on every detail screen.

Applied as `--slot-edge` / `--slot-glow` on the slot element, consumed by
`--shadow-rarity` layered over `--shadow-sunken`.

---

## 7. Type — Prompt, tuned for Thai

**The interface is English. The content is not.** Item names, descriptions, chat
messages, and student names are all typed in Thai, so the type scale is still tuned
for Thai and the font still loads the Thai subset.

Thai tone marks and ascenders stack vertically. A Latin-tuned 1.5 line-height clips
them. Body leading is **1.65–1.75** throughout, and must not be reduced on the
grounds that the labels are now English.

| Token | Size | Leading | Weight | Tracking |
|---|---|---|---|---|
| `display-lg` | clamp 32→48px | 1.10 | 700 | -0.022em |
| `display` | clamp 28→38px | 1.15 | 700 | -0.020em |
| `h1` | clamp 24→30px | 1.25 | 700 | -0.016em |
| `h2` | clamp 20→24px | 1.30 | 600 | -0.012em |
| `h3` | 18px | 1.40 | 600 | -0.006em |
| `body-lg` | 17px | 1.75 | 400 | — |
| `body` | 15px | 1.70 | 400 | — |
| `body-sm` | 14px | 1.65 | 400 | — |
| `caption` | 13px | 1.50 | 500 | — |
| `overline` | 11px | 1.40 | 600 | +0.09em |
| `numeric` | 15px | 1.40 | 600 | tabular |

Display sizes use `clamp()` — mobile is the base value, not a shrunk desktop
(principle 8). Negative tracking at display sizes is what gives headings weight; this
is a large part of why the old UI read as generic.

`font-variant-numeric: tabular-nums` is applied to `output`, `time`, and
`[data-numeric]` so countdowns (risk R2) do not jitter as digits change.

---

## 8. Shape — radius varies by role

One radius across a whole system reads as a template. Five roles, five radii:

| Token | px | Applies to |
|---|---|---|
| `--radius-chip` | 8 | small badge |
| `--radius-slot` | 10 | inventory slot |
| `--radius-control` | 12 | button, input, select |
| `--radius-card` | 20 | post card, list card |
| `--radius-panel` | 24 | game panel, sheet, dialog |
| `--radius-pill` | ∞ | status pill, avatar, filter chip |

---

## 9. Elevation — three layers plus a lit edge

The missing ingredient in the old UI. Every raised surface gets
`inset 0 1px 0 rgb(255 255 255 / .75)` — a 1px highlight along its top edge that reads
as light catching the lip of the surface. Shadows are tinted with the ink colour
(`18 43 29`), never pure black, so they sit in the same colour world as the page.

| Token | Use |
|---|---|
| `--shadow-flat` | inline chips, list rows |
| `--shadow-raised` | cards, panels, the default |
| `--shadow-floating` | hover state, popovers, sticky bars |
| `--shadow-overlay` | dialogs, sheets |
| `--shadow-sunken` | inventory slots, drop targets, the trade bench well |
| `--shadow-rarity` | rarity edge + glow, layered over sunken |
| `--shadow-focus` | 2px offset ring + 2px brand ring |

---

## 10. Motion

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 90ms | hover, press |
| `--dur-fast` | 140ms | tooltip, chip toggle |
| `--dur-base` | 220ms | card lift, panel open |
| `--dur-slow` | 340ms | route transition, stepper advance |
| `--ease-out` | `cubic-bezier(.22,.8,.24,1)` | default |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` | reversible |
| `--ease-spring` | `cubic-bezier(.34,1.42,.58,1)` | item drops into a slot, QR ring |

`prefers-reduced-motion: reduce` collapses everything to 0.01ms globally.

---

## 11. Texture

| Class | Where |
|---|---|
| `.texture-noise` | game panels, the trade bench. Requires `position: relative`. |
| `.texture-grid` | hero and empty-state backgrounds |
| `.plate` | beveled game surface: vertical gradient + raised shadow |

Never behind body text.

---

## 12. Layers

`base 0 · card-overlay 10 · sticky 20 · header 50 · drag 80 · dialog 100 · toast 120`

A dragged inventory item sits at 80 so it clears the sticky header while being moved —
a real failure mode in drag UIs, and the reason this step exists.

---

## 13. Migration state

`app/globals.css` currently contains a **legacy alias block** (section 12) mapping the
old variable names (`--primary-dark`, `--surface-muted`, `--page-background`, the
`--sidebar-*` set, `--teal*`, `--warning*`, `--error*`) onto the new ramps, plus the
`shadcn/tailwind.css` and `tw-animate-css` imports.

This keeps 57 routes — including the login and register pages, which are
**deliberately not being redesigned** — rendering correctly while the rest of the
system is rebuilt.

**Delete the alias block and both imports at the end of Phase 4.** Nothing written
from now on may reference a legacy name.
