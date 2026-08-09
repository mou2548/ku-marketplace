# Flow audit — the built screens against `fornewdesign/`

Checked 2026-08-07 against `flow1.png`, `flow2.png`, `flow3.png`, `flow4.png`,
`API_Marketplace.pdf` and `DatabaseSchema.pdf`. `fornewdesign/` is git-ignored
and local, so this file is the record of what it says.

## flow1 — buy, trade, cancel, refund

| The flow says | The app does |
|---|---|
| Item enters the inventory `Unlisted`; a post makes it `Listed`; completion makes it `Transferred`; a cancellation returns it to its previous value | Matches. The inventory badge now derives `Listed` from whether a post exists rather than trusting the column, so it cannot contradict the market. |
| An offer is accepted → every other offer on the post is rejected → transaction `Pending` and a chat room opens | Matches — stated in the accept overlay. |
| Buyer transfers and uploads a slip → `Processing` | Matches (`SlipUploader`). |
| Seller confirms the slip within **24h**, reminded every 8h; past 24h the report action unlocks | `sellerConfirmDeadline` in `lib/status.ts`; `canReport` gates the button. The 8h reminder is a server job with no UI surface. |
| Shipping: seller enters a tracking number and an estimated date; buyer confirms by estimate **+ 3 days** | `shippingDeadline`, `DeliveryCard`. |
| Meetup: the two sides agree a date, time and place, one confirms, then they meet and the buyer scans the seller's QR | **Was missing.** The chat pinned a hardcoded "10 Aug, 13:00" on every Meetup deal. Now reads the `Appointment_Card` row, offers a Propose form when there is none, and the stepper carries an "Agree a time and place" step. |
| Cancellation: 72h to respond, reminders every 8h, then it escalates to a report | `cancelResponseDeadline`; the request overlay states the 72h. Accept/reject by the other side has no screen yet. |
| Completed → buyer asks for a refund → `Pending Refund` → seller transfers → `Refunded` | Statuses and the refund slip exist; there is no button that starts a refund from a completed deal. |

## flow2 — report and appeal

Matches. `REPORT_STATUS` and `APPEAL_STATUS` in `lib/status.ts` carry exactly the
states in the diagram, and the admin queues resolve and decide them.
`POST /admin/reports/{id}/restore` has **no screen**.

## flow3 — giveaways

Matches, including the part that was wrong before: allocation happens **when
registration closes**, by the method chosen up front, and only `Manual` leaves
the giver anything to do. FirstCome and Random therefore have no manage screen —
the route 404s for them. The system issues a QR to each recipient and opens one
shared chat room; the giver scans the QR at handover (`QrScanner` in the manage
screen); `Waiting → Received` or `Expired`.

`POST /giveaways/recipients/{id}/forfeit` — the giver marking a no-show — has
**no screen**.

## flow4 — auth, account, membership

| The flow says | The app does |
|---|---|
| Register with `ku.th` / `ku.ac.th` → system sends OTP → **user sets password and profile** → account opens | Was in the wrong order (password before the code). Now: `/login` Register tab takes the email only → `/verify` → `/register/details` sets the password, the Thai name and the optional phone. |
| Log in with email and password | `/login`, checked against `ADMIN_USERNAME` / `ADMIN_PASSWORD` while there is no API. Nothing is guarded by the cookie yet. |
| Edit profile, subscribe Silver/Gold/Diamond with an admin verifying the slip, close the account | `/account`, `/account/membership`, `/account/delete`, `/admin/memberships`. |

## Still missing

- `POST /giveaways/recipients/{id}/forfeit` — no screen.
- `POST /admin/reports/{id}/restore` — no screen.
- `POST /transactions/{id}/cancel-request/{req_id}` — the other side accepting or
  rejecting a cancellation has no screen; only the request does.
- Starting a refund from a completed deal has no entry point.
- `GET /items/categories` is not called; the list is hardcoded in
  `lib/categories.ts` (see `api-gaps.md`).
- There is no public profile route, so no name anywhere in the app is a link to
  a person.
