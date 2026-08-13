# UX Research — KU Marketplace

**Phase 1 deliverable.** Scope: frontend only. Backend contract is fixed.
Ground truth: `fornewdesign/flow1-4.png`, `API_Marketplace.pdf`, `DatabaseSchema.pdf`.

> **Method note, stated honestly.** No primary research (interviews, diary studies,
> usability tests) was run for this document. Everything below is *proto*-research:
> personas synthesised from the flow diagrams and schema, plus a competitive teardown
> of the incumbent channels KU students actually use today. Proto-personas are a
> planning device, not evidence. Section 8 lists exactly what must be validated with
> real students and how — do that before treating any of this as settled.

---

## 1. Context

KU Marketplace replaces an informal market that already works: Facebook groups,
LINE OpenChats, and Instagram trading accounts where Kasetsart students buy, sell,
and swap textbooks, uniforms, lab coats, dorm furniture, and electronics.

Those channels have no structure. A deal is a comment thread, a DM, a bank transfer,
and a promise. The product's reason to exist is not discovery — Facebook already
does discovery well. It is **making the handover safe and legible**.

Three properties of the audience shape every design decision:

1. **Everyone is verifiable.** Accounts require a `@ku.th` / `@ku.ac.th` email. This
   is the single largest advantage over Facebook Marketplace, and the current UI does
   almost nothing with it.
2. **Everyone shares a campus.** Meetup is not a fallback — it is the default. The
   physical handover is the product's core moment, not an edge case.
3. **Everyone is on a phone.** Between classes, on 4G, one-handed, often walking.
4. **They read an English interface and write Thai content.** Course materials and
   university systems are already bilingual, so English chrome is familiar. What
   students type — item names, descriptions, chat — is Thai. Both facts constrain
   the type scale: see `design/tokens.md` §7.

---

## 2. Proto-personas

### P1 — "Ploy", the buyer in a hurry
2nd year, Faculty of Science. Needs a specific textbook before Monday's midterm.

- **Job:** *When I need a course book fast, I want to see who near me has it and know
  I will actually get it, so I am not stuck the night before an exam.*
- Searches by course code, not by product name. `item.course_name` exists in the
  schema and is currently invisible in the UI — this is a direct miss.
- Will pay a small premium for certainty. Will not pay anything for a stranger who
  might ghost.
- **Fails today when:** she cannot tell whether a post is still available, and there
  is no signal that the seller responds.

### P2 — "Beam", the end-of-semester dumper
4th year, moving out of the dorm. Twelve items to clear in one weekend.

- **Job:** *When I am clearing out, I want to list many things quickly and not babysit
  each conversation, so I can be done in one sitting.*
- Bulk is his whole experience. The Inventory → Post split in the schema
  (`Item.status: Unlisted → Listed`) is genuinely good for him, and the UI must make
  the batch path fast: photograph many, list many.
- Hates being pinged. Wants to see all pending obligations on one screen.
- **Fails today when:** every transaction is a separate chat with no aggregate view
  of "what do I owe someone right now".

### P3 — "Nut", the trader
3rd year. Rarely spends money. Trades a jersey for a lab coat, tops up with cash.

- **Job:** *When I have things I do not need, I want to swap them for things I do,
  so I get value without spending.*
- Trade is a fundamentally different mental model from buying. It is
  **two inventories negotiating** — the reason the game-inventory metaphor was chosen.
- `Offer` + `Offer_Item` + `additional_money` supports multi-item offers with a cash
  balance. The UI must make that legible in one glance: my stack, their stack, the
  gap in cash.
- **Fails today when:** the offer is a form, not a comparison. He cannot see both
  sides side by side and judge fairness.

### Secondary — "Fai", the giveaway receiver
1st year, tight budget. Watches for free items.

- **Job:** *When someone is giving something away, I want a fair shot and a clear
  answer, so I am not refreshing a page hoping.*
- Needs three states rendered unmistakably: **registered → result → collected**.
  `Giveaway_Ticket.status` has five values; today they read as text.

---

## 3. Competitive teardown

| Channel | What it does well | Where it breaks | What we take |
|---|---|---|---|
| **Facebook Marketplace / groups** | Zero onboarding, everyone is there, comments create social proof | No identity check, no transaction record, deals die in DMs, no dispute path | The frictionless *browse*. Kill the frictionless *deal*. |
| **Shopee / Lazada** | Escrow, tracking, clear order states, buyer protection | Not local, no meetup, shipping cost kills a ฿80 textbook, seller onboarding is heavy | The **order state machine** and its visible progress. Adapt to meetup. |
| **Instagram trading accounts** | Visual-first grid, trades feel like collecting, community identity | Entirely manual, no structure, scams routine | The **visual density** and the sense that browsing is enjoyable. |
| **LINE OpenChat** | Instant, everyone has it, easy to negotiate | Chaos — no history, no search, messages scroll away | Chat must be **per-transaction**, not one big room. The schema already does this (`Chat_Room.transaction_id`). |
| **Carousell / Kaidee** | Strong local marketplace patterns, meetup normalised | Generic trust model, no closed community | Meetup-first UI patterns. |

**Conclusion.** The gap none of them fill: *a verified, closed campus community with an
explicit, auditable handover*. That is the product. The UI must sell it on every screen.

---

## 4. Trust gaps — the real problem to design against

Money moves by bank transfer outside the platform. There is no escrow. Trust is
manufactured entirely by **visible process**. Five gaps, each with a UI answer:

| # | Gap | Design answer |
|---|---|---|
| T1 | "Is this person real?" | Surface KU verification everywhere a user appears — feed card, chat header, offer row. Not buried in a profile. Faculty + year as an identity anchor. |
| T2 | "Did they get my money?" | The slip is the receipt. Make upload → seller review → confirm a visible three-beat sequence with timestamps, not a silent flag. Schema already records `payment_confirmed_by_buyer_at` and `payment_confirmed_by_seller_at` — render both. |
| T3 | "Will they show up?" | The appointment card is a commitment device. Time, place, map, and an explicit accept from both sides. A declined or unanswered card must look different from an accepted one at a glance. |
| T4 | "What happens if it goes wrong?" | The report path must be discoverable *before* trouble, and the flow-mandated timers must be visible as countdowns — not appear as a surprise button. |
| T5 | "Is this a fair swap?" | Side-by-side offer comparison with item count, condition, and the cash gap made explicit. |

---

## 5. Usability risks in the current flows

Read directly off `flow1.png`–`flow4.png`. These are where users will get lost.

**R1 — Status vocabulary leaks to users.**
Six transaction statuses, five offer statuses, five ticket statuses, four report
statuses, four appeal statuses. `Pending` means something different in each. Raw enum
names in the UI will not survive contact with a stressed 19-year-old.
→ *Every status renders as a human sentence plus a colour plus an icon, and tells the
user **whose turn it is**. Never the bare enum.*

**R2 — Timers are invisible until they bite.**
Flow 1 runs at least four clocks: 24h for the seller to confirm payment, re-reminders
every 8h, 72h escalation on a cancellation dispute, and delivery deadline + 3 days.
None of these are surfaced today.
→ *A persistent countdown on the transaction, in history, and in chat. Show the
deadline before it matters, not after.*

**R3 — Two completion paths, one screen.**
Shipping ends with a tracking number; Meetup ends with a QR scan. Trade splits again
on whether `additional_money > 0`. Four terminal paths through one flow.
→ *Branch early and visibly. The moment a delivery method is chosen, the entire
transaction UI commits to that path and shows only its steps.*

**R4 — Whose turn is it?**
The most common question in any two-party flow and the schema answers it fully
through the timestamp columns.
→ *One "who acts next" line at the top of every transaction, phrased in second
person: "Waiting on the seller to check the slip" / "Your turn: enter the tracking
number".*

**R5 — The cancel / refund path is as complex as the happy path.**
`Pending Refund → Refunded` requires a refund slip and a confirmation, mirroring the
payment sequence. Cancellation needs mutual response with a 72h clock.
→ *Reuse the exact same slip-review and stepper components. A user who has done the
payment sequence already knows this one.*

**R6 — Offers are invisible after submission.**
Nut sends four offers and has no dashboard. `Offer.status` has five values, and
`Withdrawn` vs `Cancelled` is a distinction only a developer can love.
→ *Offer inbox split "My offers" / "Offers to me", grouped by status, with the
withdraw action inline. Collapse `Withdrawn`/`Cancelled` into one user-facing state.*

**R7 — Giveaway waiting has no shape.**
Register → wait → find out. Allocation method changes expectations completely: FCFS
rewards speed, Random rewards nothing, Manual depends on a human.
→ *State the method and the draw time on the card at registration. Give the waiting
state a real screen with a countdown, not a blank list row.*

**R8 — The 15-minute QR ticket will confuse people.**
A rotating token is a security control the receiver did not ask for. If it silently
expires mid-handover, it reads as a bug.
→ *Countdown ring on the QR, auto-refresh without user action, and one line saying
why it rotates. Never show a dead QR.*

**R9 — Inventory vs Post is a novel concept.**
No other marketplace makes you add an item to a personal inventory before listing it.
Students will not intuit it.
→ *Frame inventory as "my stuff" — a possession, not a draft. Make "List for sale" and
"Open to trades" two obvious actions on an owned item.*

---

## 6. Design principles

Every screen is checked against these ten.

1. **Whose turn is it — always answer, always first.** Every transaction surface opens
   with the next action and who owns it.
2. **Time is a first-class object.** Any deadline in the flow appears as a countdown
   before it expires. No surprise expiries.
3. **Verification is the product.** KU identity is visible wherever a person is.
4. **Status speaks plain language.** Enums become sentences with colour and icon.
   Never colour alone.
5. **One path per transaction.** Once a method is chosen, show only that path's steps.
6. **Trade is comparison, not a form.** Both stacks side by side, cash gap explicit.
7. **The handover is the climax.** QR scan and slip confirmation get the most visual
   weight on the screen — this is the moment the product exists for.
8. **Mobile is the design, desktop is the adaptation.** Thumb-reachable primaries,
   sheets over dialogs, 44px targets.
9. **Depth over outline.** Layered shadow and inner highlight, not hairline borders.
   Radius varies by role. This is what the previous UI lacked.
10. **Nothing is empty.** Every zero-state explains itself and offers one action.

---

## 7. What this changes in the build

Direct inputs to Phase 2–5, no new endpoints required:

- `item.course_name` becomes a **primary search axis** on the feed (P1)
- `item.condition` doubles as a **rarity colour** on inventory slots (P3, principle 9)
- Bulk-friendly inventory: multi-select, batch list (P2)
- A **"needs your action"** collection derived client-side from
  `/transactions` + timestamp columns (R4) — no new API
- Countdown components computed from existing timestamps (R2) — no new API
- Offer inbox as a first-class destination (R6)
- Trade bench as side-by-side comparison (R5, principle 6)

---

## 8. Validation plan — do this before trusting section 2

Everything above is a hypothesis. Cheapest path to evidence:

| Question | Method | Signal that we were wrong |
|---|---|---|
| Do students search by course code? | 5-minute intercept, 10 students, "find the book for [course]" | They search by book title or browse categories instead |
| Is the inventory→post split understood? | First-click test on a static screen, 8 students | Under 6/8 find "List it" without help |
| Does the trade bench read as fair? | Show a filled bench, ask "who is getting the better deal?", 8 students | They cannot answer without reading every label |
| Is meetup or shipping the default? | Ask 15 students what they would pick and why | Shipping wins — reprioritise E3 |
| Does the rotating QR alarm people? | Task test on the giveaway pickup screen | Anyone asks "did it break?" |

Total effort: roughly one afternoon on campus. Run it between Phase 3 and Phase 5.
