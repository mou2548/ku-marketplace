# Information Architecture

Phase 3 deliverable. Plan only — no code in this phase.
Inputs: [`../ux/research.md`](../ux/research.md), [`../PLAN.md`](../PLAN.md), `fornewdesign/flow1-4.png`.

---

## 1. What is wrong with the current structure

57 routes, flat, no shell, no home.

The worst of it is one transaction spread across **twelve** sibling routes:

```
/trade/[id]                       /trade/[id]/qr
/trade/[id]/payment               /trade/[id]/scan
/trade/[id]/payment/review        /trade/[id]/cancel
/trade/[id]/shipping              /trade/[id]/cancel/request
/trade/[id]/shipping/confirm      /trade/[id]/cancel/respond
/trade/[id]/success               /chat/[id]
```

A user in the middle of a deal has to *navigate* to find out what to do next, and the
chat — which the schema binds one-to-one to the transaction — lives somewhere else
entirely. This is the structural cause of risks **R3** (four terminal paths) and
**R4** (whose turn is it).

There is also no answer to "what do I owe someone right now" (persona P2), no
destination for offers after they are sent (**R6**), and `/` is the login page, so the
product has no home.

---

## 2. Three structural decisions

### D1 — One deal is one screen

`/deals/[txId]` becomes the whole transaction: stepper at the top, chat as the body,
and every flow action rendered as a **card inside the chat** at the moment it becomes
available. Upload a slip, review a slip, enter a tracking number, open the QR, propose
an appointment, request a cancellation — all inline. Confirmations that need focus use
a sheet on mobile and a dialog on desktop, over the same screen.

Twelve routes collapse to one plus two full-screen camera/QR views.

*Why:* the schema already says a chat is a transaction (`Chat_Room.transaction_id`).
The flow is a conversation punctuated by commitments. Splitting it into routes was
modelling the state machine instead of the user (R3, R4, T2, T3).

### D2 — Home is "what is waiting on you"

`/` inside the app shell is not a feed. It is the list of things waiting on the user,
assembled client-side from `/transactions`, `/posts/{id}/offers`, and the timestamp
columns — **no new endpoint**.

Sections, in order: needs your action now · waiting on the other person, with the
clock running · offers to answer · giveaway results · then a short feed teaser.

*Why:* R4 is the most-asked question in any two-party flow, P2 needs an aggregate
obligation view, and R2's four clocks need somewhere to live where they are seen
before they expire.

### D3 — Buyer / seller is a filter, not an app mode

The brief asked to split the marketplace into a buyer side and a seller side. Research
says the same student is both, often in the same week (P2 sells twelve things while
buying a textbook). A global mode toggle would make half the user's obligations
invisible at any moment — directly against D2.

So the split is kept, but as a **filter inside Deals and Offers** ("Buying" /
"Selling"), not as a global mode. Home always shows both. Posting flows already
imply the seller role without needing a switch.

---

## 3. Route tree

```
app/
├── (auth)/                          ← design frozen, port only
│   ├── layout.tsx                     brand panel + form column
│   ├── login/page.tsx                 ← was app/page.tsx
│   ├── register/page.tsx
│   ├── verify/page.tsx                OTP, 10 min
│   ├── forgot/page.tsx
│   └── reset/page.tsx
│
├── (app)/
│   ├── layout.tsx                     AppShell
│   ├── page.tsx                       HOME - what is waiting on you  [D2]
│   │
│   ├── market/
│   │   ├── page.tsx                   feed: buy-sell / trade / giveaway
│   │   └── [postId]/page.tsx          post detail + buy + offer entry
│   │
│   ├── inventory/
│   │   ├── page.tsx                   "my stuff" slot grid, multi-select [R9,P2]
│   │   ├── new/page.tsx               add item
│   │   └── [itemId]/
│   │       ├── page.tsx               item detail
│   │       ├── edit/page.tsx
│   │       └── list/page.tsx          list to market (Sell / Trade / Both)
│   │
│   ├── offers/
│   │   ├── page.tsx                   inbox: my offers | offers to me   [R6]
│   │   └── [offerId]/page.tsx         offer detail on the bench
│   │
│   ├── deals/
│   │   ├── page.tsx                   active + history, all statuses     [R1]
│   │   └── [txId]/
│   │       ├── page.tsx               THE DEAL — stepper + chat + actions [D1]
│   │       ├── qr/page.tsx            full-screen QR display
│   │       ├── scan/page.tsx          full-screen camera
│   │       └── report/page.tsx        report, gated on flow conditions
│   │
│   ├── giveaway/
│   │   ├── page.tsx                   browse + my entries
│   │   ├── new/page.tsx               create: window, method, details
│   │   ├── [giveawayId]/
│   │   │   ├── page.tsx               detail, join, result             [R7]
│   │   │   └── manage/page.tsx        giver: recipients, draw, select
│   │   └── ticket/[ticketId]/
│   │       ├── page.tsx               rotating QR ticket               [R8]
│   │       └── scan/page.tsx          giver scans
│   │
│   ├── notifications/page.tsx
│   └── account/
│       ├── page.tsx                   profile, KU verification, trust  [T1]
│       ├── edit/page.tsx
│       ├── membership/page.tsx        Silver / Gold / Diamond
│       ├── appeals/page.tsx           my appeals
│       ├── appeals/new/page.tsx
│       └── delete/page.tsx
│
└── (admin)/
    ├── layout.tsx
    ├── reports/page.tsx
    ├── reports/[reportId]/page.tsx
    ├── appeals/page.tsx
    └── memberships/page.tsx
```

Route count: **57 → 36**, with more of the product visible.

---

## 4. Navigation

> **Revised 2026-08-07.** An earlier draft specified a persistent left sidebar on
> desktop. The team preferred keeping the **sticky top navbar** from the previous
> build, and that is what shipped. This section describes what is built.

### Desktop (>= 1024px) — sticky top navbar

The shape people already know, restyled onto the new tokens: brand on the left,
horizontal links across the middle, search, bell, and account avatar on the right.

```
KU Marketplace   Home (1) · Market · Offers (3) · Deals (1) · Inventory · Giveaway     [search] [bell] [avatar]
```

What changed from the old header, and why:

| Old | New | Reason |
|---|---|---|
| Active state = 2px bottom border | Active state = brand-tinted pill | A bottom border on a bar that already has a bottom border reads as noise |
| Hairline `border-b` only | `--shadow-flat` with a lit top edge | Depth over outline, design principle 9 |
| Badge on Offers only, computed at module scope | Badges on Home, Offers, and Deals from one derived count | Research R4 — the count of what is waiting on you is the product's most important number, and one source means Home and Deals cannot disagree |
| Home / Giveaway / Inventory / Offers / Messages / History | Home / Market / Offers / Deals / Inventory / Giveaway | Messages and History collapse into Deals (decision D1); Home becomes a real home rather than the feed |

The bar is **opaque, not translucent**: content ghosting through a blurred bar
was a real legibility problem in the previous build.

Content max-width 1280px. Below it, the deal screen goes two-column — chat left,
stepper and summary rail right — and Market gets the filter rail beside the grid.

### Mobile — hamburger opens a left drawer

The same behaviour as the previous build, chosen by the team over a bottom tab
bar. The top bar keeps the hamburger, brand, search, bell, and avatar; the six
destinations live in the drawer.

Drawer contents, in order:

1. **Post an item** — a full-width primary button at the top, not a list row.
   It is the only item in the drawer that *creates* something, and burying a
   create action among six navigations is how it stops being used.
2. The six destinations, each with its icon and its badge
3. Notifications and Account, separated by a rule at the bottom

Rows are 48px, comfortably over the 44px minimum, and the drawer is
safe-area padded at the bottom.

**The cost, stated plainly.** Home exists to show a visible count of what is
waiting on you (research R4, persona P2), and a badge inside a closed drawer is
a badge nobody sees until they open it. The drawer keeps the counts on each row
so they are visible the moment it opens, but a student who never opens it never
sees them. If that turns out to hurt in the validation session
(`../ux/research.md` §8), a persistent count on the hamburger itself is the
cheapest fix — the derived number already exists.

### Tablet (768–1023px)

The navbar collapses to the hamburger arrangement below 1024px. Market drops to 2
masonry columns. The deal screen stays single-column with the summary above the
thread.

---

## 5. Screen-level layout rules

| Screen | Mobile | Desktop |
|---|---|---|
| Home | stacked sections, horizontal scroll rails | 2-column: actions left, activity right |
| Market | 2 masonry columns, filters in a sheet | 3–4 columns + persistent filter rail |
| Post detail | full-bleed gallery, sticky action bar | 2-column: gallery / details + actions |
| Inventory | 3-column slot grid | 5–6 column slot grid + detail panel |
| Offer / bench | stacked stacks, swipe between sides | true side-by-side bench |
| Deal | single column, actions inline | chat + right rail |
| Chat | full height, composer pinned | inside the deal screen |
| QR / scan | full screen, no chrome | full screen, no chrome |

The trade bench is the one place where mobile cannot mirror desktop: two stacks side
by side do not fit at 360px. Mobile stacks them vertically with a swap handle between,
and the cash gap sits in the middle where the handle is — the comparison (principle 6)
is preserved even though the geometry is not.

---

## 6. Redirect map

Every existing URL keeps working. Redirects are permanent except where a route is
being replaced by an in-page state.

| Old | New | Note |
|---|---|---|
| `/` | `/login` when signed out, Home when signed in | |
| `/auth/register` | `/register` | |
| `/auth/otp/verify` | `/verify` | |
| `/auth/forgot` | `/forgot` | |
| `/auth/reset` | `/reset` | |
| `/marketplace` | `/market` | |
| `/marketplace/[productId]` | `/market/[postId]` | |
| `/inventory` | `/inventory` | unchanged |
| `/inventory/add` | `/inventory/new` | |
| `/inventory/[id]/edit` | `/inventory/[id]/edit` | unchanged |
| `/inventory/[id]/post` | `/inventory/[id]/list` | |
| `/inventory/[id]/post/edit` | `/inventory/[id]/list` | edit is a state of the same form |
| `/offers` | `/offers` | unchanged |
| `/offers/[offerId]` | `/offers/[offerId]` | unchanged |
| `/chat` | `/deals` | |
| `/chat/[tradeId]/target` | `/deals/[txId]` | |
| `/history` | `/deals` | history is a filter, not a place |
| `/trade/[id]` | `/deals/[txId]` | |
| `/trade/[id]/payment` | `/deals/[txId]` | inline action card [D1] |
| `/trade/[id]/payment/review` | `/deals/[txId]` | inline action card |
| `/trade/[id]/shipping` | `/deals/[txId]` | inline action card |
| `/trade/[id]/shipping/confirm` | `/deals/[txId]` | inline action card |
| `/trade/[id]/cancel` | `/deals/[txId]` | sheet / dialog |
| `/trade/[id]/cancel/request` | `/deals/[txId]` | sheet / dialog |
| `/trade/[id]/cancel/respond` | `/deals/[txId]` | sheet / dialog |
| `/trade/[id]/success` | `/deals/[txId]` | terminal state of the same screen |
| `/trade/[id]/qr` | `/deals/[txId]/qr` | |
| `/trade/[id]/scan` | `/deals/[txId]/scan` | |
| `/trade/qr` | `/deals` | orphan route, no id |
| `/disputes` | `/deals/[txId]/report` | |
| `/appeals/new` | `/account/appeals/new` | |
| `/giveaway` | `/giveaway` | unchanged |
| `/giveaway/new` | `/giveaway/new` | unchanged |
| `/giveaway/[itemId]` | `/giveaway/[giveawayId]` | |
| `/giveaway/manager` | `/giveaway/[giveawayId]/manage` | was not scoped to a giveaway |
| `/giveaway/ticket/[id]` | `/giveaway/ticket/[id]` | unchanged |
| `/giveaway/ticket/[id]/scan` | `/giveaway/ticket/[id]/scan` | unchanged |
| `/account/*` | `/account/*` | unchanged |
| `/account/premium` | `/account/membership` | |
| `/notifications` | `/notifications` | unchanged |
| `/admin/*` | `/admin/*` | unchanged, moved into `(admin)` |

Implement in `next.config.ts` `redirects()`. **Read `node_modules/next/dist/docs/`
before writing them — this is Next 16, not the Next in training data.**

---

## 7. What the shell must provide

- `AppShell` — sticky top navbar, hamburger drawer on mobile, notification bell,
  avatar link
- **Action count** — one derived selector feeding the Home badge and the Deals badge,
  computed from transaction status + timestamp columns. Single source, no duplication.
- Deep-link safety: `/deals/[txId]` must render correctly for any of the six
  transaction statuses and both delivery methods, including terminal ones
- Scroll restoration on the masonry feed when returning from a post
- Route-level loading skeletons that match final dimensions (CLS ≤ 0.05)

---

## 8. Open question for Phase 5

Whether Home or Market should be the default landing screen. D2 argues Home; a user
with zero active deals sees an empty screen, which argues Market.

**Proposed rule:** land on Home when the action count is greater than zero, otherwise
land on Market. Confirm with the intercept test in `../ux/research.md` §8.
