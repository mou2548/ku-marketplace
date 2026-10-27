# Combined activity diagram audit

Source: `frontend/docs/activity diagram.pdf`. On 2026-09-09 the user confirmed
that **both** the upper "เจนทำ" and lower "เนตรทำ" flows are required. Neither
set is discarded. These instructions supersede older notes that described
refunds as evidence-only or treated the API as immutable.

## Combined behavior and fixes

| Area | Combined flow behavior | Implementation / verification |
| --- | --- | --- |
| Purchase | Create Pending transaction and private chat; payment evidence leads to Processing; seller confirms before shipping/handover | Chat is created with the transaction. Fixed frontend Processing prompt to review the payment before shipping or scanning. |
| Trade | Accept one offer, reject alternatives; no additional money means no fictitious payment slip | Payment-free handover accepts Pending trades with a confirmed meetup; offered items are marked Transferred on completion. Database test covers handover and return. |
| Appointments | Propose, accept/reject, pin, and propose another time | The chat permits a replacement proposal even when an earlier card exists. Shipping purchases can arrange a meetup when returning goods. |
| Shipping | Tracking number and expected delivery date; receipt confirmation after handover | Added the required estimated-date field missing from the UI. Deadline uses estimate plus three days, followed by daily reminders. |
| Cancellation before payment | Either participant can cancel and release the reservation | Row lock prevents two simultaneous requests releasing stock twice. |
| Cancellation after payment | Counterparty responds; rejection enters reports; approval requires refund evidence and recipient confirmation | Fixed frontend enum mapping and added response controls. Pending Refund ends as Refunded after required steps. |
| Completed return | Request within seven days; counterparty responds within 24 hours; accepted purchase returns arrange a new meetup | Backend enforces the window and new confirmed purchase-return appointment. Existing completion receipt supplies the window start. |
| Return with money | Money acknowledgement and item-return QR are independent requirements | Progress is recorded under a database lock and completes only when both required conditions hold. |
| Return without money | Item-return QR completes the return | Distinct, expiring, single-use return tokens; only the requester scans the counterparty's code. |
| Giveaways | First Come preserves registration order; Random selects automatically after closing; Manual is chosen by giver after closing | Added scheduled Random allocation, prevented early allocation, closed empty draws, and created the winners' shared room. Losing/unselected registrants cannot read that room. |
| Ticket expiry | Uncollected Waiting tickets expire at pickup deadline | Existing expiry job remains; allocation runs before expiry. |
| Timers | Payment review 24h; cancellation response 72h/every 8h; completed-return response 24h/every 3h; return-refund confirmation 72h/every 8h | Added persisted in-app reminders and automatic Pending reports on applicable deadlines. Cancellation refund confirmation uses the 24h branch. Timers start at the triggering event. |
| Report / appeal | Pending report, admin investigation/verdict, appeal and sanction reversal | Existing report/appeal handlers retained. New timeout reports enter Pending. Hidden posts no longer appear in the public feed; suspended/banned accounts retain profile and appeal access, while marketplace mutations and deleted-account sessions remain blocked. |
| Missed meetup | Participant can enter the report flow when the confirmed appointment is missed | Report action becomes available after the confirmed meetup time. The system does not infer physical attendance. |

## Explicit reconciliation of conflicting labels

The lower purchase diagram labels an item Transferred immediately after
cancellation before handover, while the upper diagram restores its prior state.
Cancellation before handover releases the reservation and preserves marketplace
availability; it does not claim that goods have changed hands. Completed returns
do not automatically relist evidence-linked goods.

The diagrams use variations such as Cancel/Cancelled, Pending_refund and
Transferred/Transfer. Persisted values remain `Cancelled`, `Pending Refund`,
`Refunded` and `Transferred`, matching database constraints and frontend labels.

## Validation and limits

Regression coverage includes fresh schema/model compatibility, demo passwords,
post ownership, last-unit purchases, duplicate cancellation requests, payment
review prompts, enum mapping, paid cancellation refunds, completed purchase
returns, seven-day eligibility, payment-free trades and returns, automatic draws,
and deadline boundary/concurrent-worker escalation.

Notifications added in this change are persisted in-app records. They are not
email, device push or SMS delivery. Meetup QR and OTP integration tests now also use real Redis; completed-return QR cases still use a Redis substitute.
Physical camera scanning and external uploads/email remain unverified. See
[the execution report](../verification-report.md) for the browser and integration results. Passing tests is not a claim that every diagram
branch has been exercised end to end.

Existing databases must apply all three new 20260909 migrations listed in the root
README and regenerate Prisma before running the changed backend. Test schemas
are isolated; the development database is not migrated or reset by the tests.
