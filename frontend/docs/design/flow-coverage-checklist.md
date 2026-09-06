# Flow coverage checklist

Checked against `fornewdesign/flow1.png` through `flow4.png` on 2026-09-06.
This is the presentation gate for Phase 5.1 F7. A route existing is not enough:
each row must finish as `Pass` or as an owner-approved `Blocked` item.

## Result vocabulary

| Result | Meaning |
|---|---|
| `Pass` | Exercised against the live stack and the expected transition and UI state were observed. |
| `Mapped` | A real route, component, and API call exist, but the branch still needs live verification. |
| `Blocked` | The current backend contract or persisted state cannot represent the branch truthfully. |

## Flow 1 — inventory, sale, trade, fulfilment, cancellation, and refund

| ID | Actor and branch | Backend state / endpoint | Screen and action | Expected next state | Loading / empty / error | Result |
|---|---|---|---|---|---|---|
| 1.1 | Owner adds an item | `POST /items` → `Unlisted` | `/inventory/new`, item form | Item appears in `/inventory` | Submit busy, validation, upload error | Mapped |
| 1.2 | Owner keeps an item unlisted | `Item.item_status = Unlisted` | `/inventory`, no listing action taken | Item remains private inventory | Empty inventory and image fallback | Mapped |
| 1.3 | Owner lists for sale, trade, or both | `POST /posts` → item `Listed` | `/inventory/:itemId/list` | Active post appears in feed | Submit busy and API error | Mapped |
| 1.4 | Buyer buys available quantity | `POST /posts/:id/buy` | `/market/:postId` | Transaction `Pending`; stock reserved | Sold-out, quantity validation, API error | Mapped |
| 1.5 | Trader sends an offer | `POST /posts/:id/offers` | `/offers/new?postId=…` | Offer `Pending` in sent inbox | Empty inventory, split rollback, API error | Mapped |
| 1.6 | Owner rejects an offer | `POST /posts/:postId/offers/:offerId/reject` | `/offers/:offerId` | Offer `Rejected` | Busy and toast error | Mapped |
| 1.7 | Owner accepts an offer | `POST /posts/:postId/offers/:offerId/accept` | `/offers/:offerId` | Chosen offer accepted, others rejected, transaction `Pending` | Busy and toast error | Mapped |
| 1.8 | Buyer uploads payment evidence | `POST /transactions/:id/payment-slip` | `/history/:txId`, inline slip action | Transaction `Processing` | Upload ghost/progress and error | Mapped |
| 1.9 | Seller confirms payment in 24 hours | `POST /transactions/:id/confirm-payment-received` | `/history/:txId` or chat action card | Fulfilment action unlocks | Deadline and API error | Mapped |
| 1.10 | Seller does not confirm in time | 24-hour rule; report endpoint | `/history/:txId/report` | Report `Pending` | Ineligible reason disabled; submit error | Mapped |
| 1.11 | Shipping seller dispatches | `POST /transactions/:id/ship` | `/history/:txId` or chat delivery card | Tracking visible; buyer waits | Missing tracking/date and API error | Mapped |
| 1.12 | Shipping buyer confirms delivery | `POST /transactions/:id/confirm-delivery` | `/history/:txId` | Transaction `Completed`; item transferred | Estimated-date state and API error | Mapped |
| 1.13 | Meetup party proposes time/place | `POST /transactions/:id/appointment-cards` | Chat appointment action card | Appointment `Pending` | No-card state, form busy/error | Mapped |
| 1.14 | Other party accepts/rejects meetup | `POST /appointment-cards/:id/respond` | Chat pinned appointment card | Confirmed card pins, or a new proposal can be made | Busy/error and rejected state | Mapped |
| 1.15 | Meetup buyer scans seller QR | QR generate/scan endpoints | `/history/:txId/qr`, `/history/:txId/scan` | Transaction `Completed`; item transferred | Camera/manual fallback and invalid token | Mapped |
| 1.16 | Either party requests cancellation | `POST /transactions/:id/cancel-request` | `/history/:txId` or chat action card | Cancellation `Pending` | Confirmation, reason, busy/error | Mapped |
| 1.17 | Counterparty accepts/rejects cancellation | `POST /transactions/:id/cancel-request/respond` | Chat cancellation action card | Accepted → refund path; rejected → transaction continues/report | Busy/error and 72-hour deadline | Mapped |
| 1.18 | Cancellation receives no response | 72-hour escalation rule | Report action from the transaction | Report `Pending` | Deadline-gated action | Mapped |
| 1.19 | Buyer requests refund after completion | No dedicated transition exists | No truthful entry action | Transaction `Pending Refund` | Cannot represent | Blocked |
| 1.20 | Seller uploads refund evidence | `POST /transactions/:id/refund-slip` | `/history/:txId` or chat action card | Buyer can confirm refund | Upload busy/error | Mapped |
| 1.21 | Buyer confirms refund | `POST /transactions/:id/confirm-refund` | `/history/:txId` or chat action card | Transaction `Refunded` | Busy/error | Mapped |
| 1.22 | Owner reads item outcome totals | `GET /items/:itemId/history-summary` | `/inventory` and `/inventory/:itemId` | Listed, sold, and traded unit totals | Ghost, zero, endpoint error | Pass |

## Flow 2 — report, sanction, and appeal

| ID | Actor and branch | Backend state / endpoint | Screen and action | Expected next state | Loading / empty / error | Result |
|---|---|---|---|---|---|---|
| 2.1 | User files an eligible report | `POST /reports` → `Pending` | Context report dialog or `/history/:txId/report` | Report enters admin queue | Eligibility, rate limit, submit error | Mapped |
| 2.2 | Admin opens pending report | `GET /admin/reports` | `/admin/reports`, `/admin/reports/:reportId` | Report evidence is readable | Queue empty/error; evidence partial/error | Mapped |
| 2.3 | Admin dismisses report | `POST /admin/reports/:id/restore` | Report verdict form | `Report_Dismissed`; hidden post restored | Decision busy/error | Mapped |
| 2.4 | Admin confirms violation | `POST /admin/reports/:id/resolve` | Report verdict form | `Violation_Confirmed`; sanction applied | Sanction validation and error | Mapped |
| 2.5 | Sanctioned user does not appeal | No transition required | `/account/appeals` | Sanction remains | Empty list | Mapped |
| 2.6 | Sanctioned user appeals in time | `POST /appeals` | `/account/appeals/new` | Appeal `Pending` | Eligibility and submit error | Mapped |
| 2.7 | Different admin reviews appeal | `GET /admin/appeals` | `/admin/appeals` | Appeal `Under_Review`/decision-ready | Same-admin denial and empty queue | Mapped |
| 2.8 | Admin rejects appeal | `POST /admin/appeals/:id/decide` | Appeal decision panel | `Appeal_Rejected`; sanction remains | Busy/error | Mapped |
| 2.9 | Admin upholds appeal | `POST /admin/appeals/:id/decide` | Appeal decision panel | `Appeal_Upheld`; sanction reversed | Busy/error | Mapped |

## Flow 3 — giveaway allocation and collection

| ID | Actor and branch | Backend state / endpoint | Screen and action | Expected next state | Loading / empty / error | Result |
|---|---|---|---|---|---|---|
| 3.1 | Giver creates a giveaway | `POST /giveaways` | `/post?type=giveaway` | Active giveaway appears in browse | Upload, validation, submit error | Mapped |
| 3.2 | Recipient registers | `POST /giveaways/:id/join` | `/giveaway/:giveawayId` | Registration/ticket created | Duplicate, closed, busy/error | Mapped |
| 3.3 | Capacity is visible before joining | Quantity/deadlines/progress in giveaway responses | Browse/detail/create/manage | Student sees registered/max and remaining places | Ghost/zero/error | Pass |
| 3.4 | First Come fills available places | Row-locked join and unique entrant constraint | Detail join action | Final place closes registration immediately | Unit boundary and isolated-schema concurrent DB tests pass | Pass |
| 3.5 | Underfilled Random guarantees everyone | Multi-recipient draw up to `quantity` | Detail draw action | All entrants selected when entrants ≤ capacity | 0/fewer/equal unit cases | Pass |
| 3.6 | Oversubscribed Random draws winners | Unique shuffled selection capped at `quantity` | Detail draw action | Exactly `quantity` unique winners | More-than-capacity unit case | Pass |
| 3.7 | Manual giver chooses recipients | `POST /giveaways/:id/select` | `/giveaway/:id/manage` | Selected recipients receive collection state | Empty/picked-count/API error | Mapped |
| 3.8 | Winner opens collection ticket | QR generation endpoint | `/giveaway/:id/ticket/:ticketId` | Rotating/refreshable QR is visible | Invalid/expired/no-ticket | Mapped |
| 3.9 | Giver scans winner QR | QR scan endpoint | `/giveaway/:id/manage` | Ticket `Received` | Invalid token and camera fallback | Mapped |
| 3.10 | Winner voluntarily forfeits | Forfeit persists `Forfeited` owner-only | Ticket confirmation action | Distinct forfeited history | Busy/error | Pass |
| 3.11 | Winner misses pickup deadline | Scheduled sweep plus read/QR reconciliation persists `Expired` | Ticket/history | Distinct expired history | Startup sweep and 15-second background interval | Pass |
| 3.12 | Entrant is not selected | Draw/select persists `NotSelected` | Ticket/history/management | Distinct not-selected history | Full roster preserved | Pass |

## Flow 4 — auth, account, membership, and destinations

| ID | Actor and branch | Backend state / endpoint | Screen and action | Expected next state | Loading / empty / error | Result |
|---|---|---|---|---|---|---|
| 4.1 | New user submits KU email/password | `POST /auth/register` | Register tab on `/login` | OTP pending | Domain/password validation and error | Mapped |
| 4.2 | New user verifies OTP | `POST /auth/otp/verify` | `/verify` | Account created and session opens | Resend, invalid/expired OTP | Mapped |
| 4.3 | Existing user signs in | `POST /auth/login` | Login tab on `/login` | Authenticated feed | Invalid credentials and server error | Pass |
| 4.4 | User edits profile | `PATCH /users/me` | `/account/edit` | Updated account summary | Validation, busy/error | Mapped |
| 4.5 | User closes account | `DELETE /users/me` | `/account/delete` | Session cleared and login shown | Confirmation, busy/error | Mapped |
| 4.6 | User submits membership payment | `POST /membership/subscribe` | `/account/membership` | Payment `Pending` | Upload, pending-review, API error | Mapped |
| 4.7 | Admin approves/rejects membership | Admin membership endpoint | `/admin/memberships` | Tier changes or rejection is recorded | Empty queue, busy/error | Mapped |
| 4.8 | User enters market flow | Existing post/item endpoints | `/`, `/inventory`, `/offers`, `/history`, `/chat` | Flow 1 | Per-screen states above | Mapped |
| 4.9 | User enters giveaway flow | Existing giveaway endpoints | `/giveaway` | Flow 3 | Per-screen states above | Mapped |
| 4.10 | User enters report flow | Existing report endpoints | Context report entry | Flow 2 | Per-screen states above | Mapped |

## Verification matrix

The following checks apply to every `Mapped` row before it becomes `Pass`:

- Actor: correct owner/buyer/seller/trader/giver/recipient/admin and a forbidden actor.
- Theme and width: light and dark at 360, 768, and 1280 CSS pixels.
- Async states: initial ghost, disabled/busy action, success, backend rejection,
  unavailable image, empty collection, and long translated text where applicable.
- Accessibility: visible focus, logical keyboard order, named controls, status icon plus
  text, 44px touch target, and no color-only meaning.
- Engineering: focused backend tests when available, frontend lint, TypeScript,
  production build, and `git diff --check`.

## Visual route audit — 6 September 2026

The consumer and admin route surfaces were rendered from live seeded data in both
themes at 360, 768, and 1280 CSS pixels. The audit covered all 33 authenticated
screens represented by the routes above, plus the login, forgot-password,
reset-password, and email-verification screens. Dynamic routes used real seeded IDs
and actor-specific sessions; the offer composer was also rechecked with its canonical
`?post=` query.

- No route crash, horizontal overflow, clipped primary action, or bottom-navigation
  collision was visible in the six viewport/theme matrices.
- The audit found and fixed inverted light surfaces in the dark-theme admin header,
  QR scanner, forgot-password card, and reset-password card.
- `/posts` is a raw diagnostic data route rather than a consumer screen; it is excluded
  from visual acceptance and should not be linked from product navigation.
- This is visual route coverage, not proof of every async and permission branch.
  Rows remain `Mapped` until keyboard behavior and their loading, empty, success, and
  backend-rejection states have been exercised as required by the matrix above.

Production lint, type-check, and build results are recorded with the implementation
commit rather than promoted to `Pass` here.

## Current blockers requiring backend scope

| Blocker | Required contract work |
|---|---|
| Completed-deal refund entry | Add or confirm a transition from `Completed` to `Pending Refund`. |

Frontend code must not fabricate successful states for the remaining rows.
