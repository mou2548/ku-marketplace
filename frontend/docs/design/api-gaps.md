# API gaps

Things a screen needs that the API does not return. The backend is fixed
(CLAUDE.md §0), so each entry records what the UI does instead — never an
invented endpoint.

## 1. A giveaway cannot point at an inventory item

`Giveaway_Post` carries `item_name: string` and has no `item_id`. Posting a
giveaway now happens in the same composer as a sale or a trade
(`app/(app)/post/post-composer.tsx`), where the giver picks something they
already own, so the composer copies `name`, `description` and the primary image
across at publish time.

Consequences accepted:

- The item's row is not marked as gone when the giveaway completes. An item that
  has been given away still reads `Listed` or `Unlisted` in the inventory.
- Editing the item afterwards does not update the giveaway.

## 2. Giveaway capacity is explicit

Resolved. `quantity` is the maximum recipient count and the API returns
participant count, remaining places, and registration-open state. The create,
browse, detail, and management screens all expose that same value.

## 3. Public seller profiles and following

Resolved by the seller-profile delivery. `GET /sellers/:sellerId` exposes a public
allowlist, `/sellers/:sellerId/posts` provides scoped pagination, and authenticated
`/users/me/following` routes persist follow state. Product detail and Account link
to `/sellers/:sellerId`; the private directory is `/account/following`.
Verification comes from `emailVerifiedAt`. Faculty/year, uploaded avatars, shop
banners and biography editing remain outside the available public data.
See [delivery and API details](seller-profile-delivery.md).

## 4. The category list is hardcoded

`GET /items/categories` exists and is not called. `lib/categories.ts` holds ten
readable names matching the seed, because the per-category extra fields
(`course_name`, `brand_model`, `warranty_expiry`, `size`) have to be keyed by
something known at build time. If the endpoint ever returns a category not in
that map, it simply gets no extra fields, which is the correct fallback.

## 5. Entrant allocation state is explicit

Resolved by the capacity and ticket-outcome contract. Recipient rows now carry
both a plain-language outcome and the stored ticket status, while giveaway rows
carry quantity, participant count, remaining places, and registration-open state.
The frontend no longer derives winners or queue capacity from timestamps.

## 6. A chat room has no members

`Chat_Room` is `(room_id, transaction_id?, giveaway_id?, created_at)` and
`Chat_Message` carries a bare `sender_id`. There is no membership table, no
`GET /rooms/{id}/members`, and nothing anywhere that maps a room to the set of
people entitled to read it — membership is inferred from the transaction's two
party columns, or from the giveaway's giver.

This is fine for a deal room, which has exactly two people. It is not fine for a
giveaway room, which is a group chat: `init.sql:374` comments room 3 as
"ห้องแชตกลุ่ม" and seeds it with a giver plus two recipients, and until now the
UI had no way to name any of them, so every bubble that was not the viewer's
rendered as the same anonymous grey.

Worked around in `getRoomDetail` (`lib/api/rooms-query.ts`), which attaches
`entrants` for giveaway rooms by calling `getEntrants(giveaway_id)`. That roster
is keyed on the **giveaway**, not the room, so it is only correct while a
giveaway has at most one room. `RoomScreen` feeds it to `ChatThread` as the
sender map and renders it in the rail.

One consequence closed, one remaining:

1. **Closed.** `giveaways.service.ts` now has its own `GET/POST
   /giveaways/{id}/message` (mirroring `transactions.service.ts`'s chat, same
   `serializeUserSummary`/7-day-expiry shape), gated by `assertGiveawayMember`
   — the giver, or anyone who ever held a ticket, not just the giver. Message
   senders now carry a real `sender` summary. `RoomScreen`'s `onSend`/
   `onAttach` are wired to this for real (`lib/actions/giveaways.ts`'s
   `sendGiveawayMessage`/`fetchGiveawayMessages`); posting itself is still
   giver-only (`giveawayReadOnly` in `room-screen.tsx`), but that's Flow 3's
   own product rule, not a backend limit.
2. **Still open.** `buildRooms`'s inputs now come from `lib/api/rooms-query.ts`'s
   `myGiveaways()`, which admits both the giver and any ticket holder — but it
   discovers "ticket holder" via `getMyTicket`, which (like
   `GET /giveaways/{id}/recipients`) only ever sees `Waiting`/`Received`
   tickets. Someone whose ticket expired or was forfeited drops out of their
   own inbox, even though `assertGiveawayMember` (any ticket, any status)
   still lets them open the room by URL. Would need either a
   status-unfiltered "my tickets" endpoint or dropping the status filter on
   `recipients` for this specific check.

**Closed too.** The roster (`entrants`) now reads real data —
`lib/api/giveaways.ts`'s `getEntrants(giveawayId, giveaway)` calls the real
`GET /giveaways/{id}/recipients` and re-expands its flattened
`"selected"|"received"` status through the same `deriveTicketStatus`
pending-draw heuristic `getMyTicket` already used, then folds it down to the
roster's `Registered | Selected`. `Not_Selected` is unreachable through this
path (only a real `Expired` raw status produces it, and `getRecipients` drops
those tickets before they get here) — the roster can still be shorter than a
giveaway's full history, same limit as `getMyTicket` above.

## 6a. Chat images have no storage-level expiry

§6.2 asks for a 7-day *display* lifetime on chat images, "to control long-term
storage cost." There is no column anywhere (`Chat_Message.image_urls` is a
bare `JSONB` array) that marks a row as cleaned up, and adding one would mean
touching `init.sql`/`schema.prisma`, which is off limits here. What exists
instead: `transactions.service.ts`'s `serializeMessage` (and
`giveaways.service.ts`'s `serializeGiveawayMessage`, same logic, duplicated
rather than shared — matches this codebase's existing per-module convention,
see `serializeUserSummary`) computes `Date.now() - created_at > 7 days` on
every read and returns `image_urls: null` plus `images_expired: true` once
that's true — the row and the underlying Cloudinary asset are both left
alone. This satisfies the *display* half of §6.2 (`ChatThread` shows a notice
instead of the image grid) but not the *storage cost* half — nothing ever
actually deletes the Cloudinary asset, so the stated cost saving doesn't
happen yet. A real fix needs either a schema field to mark a row as
reclaimed, or a scheduled job that re-derives the same age check and calls
Cloudinary's `destroy` on the public id parsed back out of the stored URL (no
new column needed for that part) — out of scope here.

## 6b. Appointment "pinned" is derived, not stored

`Appointment_Card` has no boolean column for "this is the one pinned to the
top" — §6.3's pin is computed client-side by `deriveAppointmentView`
(`lib/appointment.ts`) from the full history `GET
/transactions/{id}/appointment-cards` already returns: the most recent
`Confirmed` card is the pin, and it survives a later `Rejected` re-proposal
(the spec pins a confirmed card "until a new [appointment] replaces it", not
until one is merely proposed again). A backend that wants to expose this
directly would need either a `pinned` boolean toggled on confirm/superseded,
or a dedicated "current appointment" endpoint — neither exists today.

## 6c. There is no "list my chat rooms" endpoint

Nothing anywhere returns "every `Chat_Room` this user is in" — a room is only
ever created lazily, the first time its messages are read or written (see
`getOrCreateChatRoom`/`getOrCreateGiveawayChatRoom`). So `getRoomSummaries`
(`lib/api/rooms-query.ts`) builds the inbox from the other direction: it reads
"my transactions" (`GET /transactions`, real) and "my giveaways"
(`getGiveaways()` filtered client-side to giver-or-ticket-holder), then calls
each one's message endpoint just to learn its `room_id` and last message.
That's an N+1 fetch — fine at seed-data scale, not something a real inbox at
scale should keep doing. A dedicated `GET /me/chat-rooms` (or similar) would
let this collapse into one call; nothing invented here in its place.

## 6d. `Transaction` responses were raw rows, not the documented shape

`transaction.service.ts`'s `findAllForUser`/`findOneForUser` used to return
the bare Prisma row — no `post`, no `item`, no `buyer`/`seller` summary — so
nothing that actually needed `lib/api/types.ts`'s `Transaction` shape (chat
chief among them) could be built from it. Both now `include` the full join
(post → item → images, offer, buyer, seller) and serialize to the documented
snake_case shape, including `final_amount` — not a stored column; derived as
`post.price × quantity` for a straight purchase (`offer_id` null) or the
offer's `additional_money` for a trade, matching `requiresPayment` in
`lib/status.ts`. Every other method on that service (`ship`, `confirmDelivery`,
the cancellation/refund flow, …) still reads through the original
unincluded `findOneOrThrow` — they only ever touch scalar columns, so they
were left alone.

One real bug fell out of building this: `schema.prisma`'s `Post.deletedAt`
(and `posts.service.ts`'s soft-delete queries against it) had no matching
`deleted_at` column in the live database at all — every query touching `Post`
failed outright, including this new one. The column now exists on the
running database (added directly, since `init.sql` is off-limits to edit in
this pass), but `init.sql` itself was **not** updated — a fresh
`docker-compose up` from a clean volume will hit the same failure until
someone adds `"deleted_at" TIMESTAMP` to `Post` there too.

## 7. Auth session renewal (resolved)

A later backend pass (`origin/backend/main` commit `b232f58`) added everything
§7 used to list as missing: `POST /auth/otp/resend`, `POST /auth/logout`,
`POST /auth/password/forgot`, `POST /auth/password/reset`, and
`GET`/`PATCH`/`DELETE /users/me`. All of it is wired now. Two decisions from
that pass are permanent product shape, not workarounds, and are worth recording
here so nobody tries to "fix" them back:

- **Register is email + password in one step**, not email-then-password. The
  real `POST /auth/register` requires `password` before any OTP exists, so
  `app/(auth)/auth-panel.tsx`'s `RegisterForm` asks for both up front. `phone`
  stays out of the signup flow entirely — it was always optional on the DTO,
  and asking for it there bought nothing once profile fields moved to
  `/account/edit`.
- **Password reset is email + a 6-digit code**, not a magic link.
  `POST /auth/password/reset` takes `{ email, otp, newPassword }` — the same
  OTP mechanism as registration, on its own Redis namespace. `app/(auth)/reset`
  reads `?email=` now, not `?token=`.

`POST /auth/refresh` now rotates a Redis-backed session family. Access tokens
remain valid for 15 minutes, and the absolute session lifetime is seven days
from login. Next.js Proxy renews before page rendering and Server Actions and
forwards refreshed cookies to both the current request and the browser.
See [session renewal](../session-renewal.md) for the contract and failure behavior.

## 8. Giveaway Allocation System — remaining adapter boundaries

Capacity, registration deadline, pickup deadline, and ticket outcomes are now
explicit API values. `Registered`, `Waiting`, `NotSelected`, `Received`,
`Forfeited`, and `Expired` are preserved directly; the frontend no longer uses a
timestamp heuristic. First Come closes atomically at capacity, and Random selects
up to the configured quantity (including the under-capacity all-win case).

The remaining gaps are narrower:

- There is no standalone `GET /users/{id}`. Giveaway responses include compact
  giver/receiver summaries, but the UI cannot link those names to a full public
  profile or query everything else that person is offering.
- There is no `GET /giveaway-tickets/me` or single-ticket read endpoint. "My
  entries", history, and the ticket route rebuild the viewer's ticket by querying
  the full recipient roster of each giveaway. This is correct but produces a
  bounded N+1 request pattern.
- Random allocation still requires the giver to press "Run the draw"; no scheduled
  worker runs automatically when `register_deadline` passes.
- Pickup expiry is reconciled when the recipient roster or QR endpoints are read.
  There is no background worker that updates untouched tickets exactly at the
  deadline.
- `GET /giveaways` remains an application endpoint outside the original endpoint
  table. It returns all statuses; the browser uses the explicit
  `registration_open` field for its Open tab.

## 9. Report & Moderation (§7) — what adapts around real gaps

`report`/`appeal.service.ts` were already a real, working backend
implementation before this pass — the frontend was the fixture-driven half.
Closed in this pass: §7.3's rate limit (Redis, 5/10 min), §7.1's sanctions
(`User.status` → `Suspended`/`Banned`, reversed automatically when an appeal
is later approved), a `Post` report confirmed as a violation now actually
hides the post (and `restore` un-hides it), 3 new `GET /admin/transactions/...`
routes so an admin can read a Transaction report's chat/appointment evidence
without being a party to it, and the missing `GET /appeals`/`GET
/admin/appeals` list routes the frontend needed. None of it touched
`init.sql`/`schema.prisma` — `Suspended`/`Banned`/`Active`/`Inactive` all
already existed.

What's still adapted around rather than built:

- **A "temporary" suspension has no stored end date.** There is no column for
  one (would mean a schema change), so `suspend_temporary` and
  `suspend_permanent` differ only by which `User.status` value they set
  (`Suspended` vs `Banned`) — an admin lifts a temporary one manually later.
  Matches §7.1's "no fixed criteria, case-by-case judgment" framing, but a
  real deadline-driven unsuspend would need a new column and a scheduled job.
- **A warning has no record beyond that one report's `resolution_note`.**
  There is no running "warning count" on `User` — an admin deciding a new
  case sees that account's own report history via `GET /admin/reports`
  filtered by eye, not a computed strike count.
- **Reporting a Post or a User sends a `target_id` from whatever page is
  already showing that post/user** — `market/[postId]/page.tsx` and the whole
  `/history` section are still on `fixtures.ts` (a separate, larger gap; see
  their own screens), so a report filed from there only lands on a *real*
  target when the fixture's id happens to coincide with a real seeded row.
  The report submission itself (`POST /reports`) is real; the id feeding it
  is only as real as the page it was opened from. The transaction-report flow
  (`/history/[txId]/report`) has the same caveat for the same reason.
- **No admin `GET /admin/reports/{id}`.** `admin/reports/[reportId]/page.tsx`
  fetches the full list (`GET /admin/reports`) and finds the one it needs
  client-side, same as the fixture version did — fine at seed-data scale, an
  N-report fetch to open one report at real scale.
- **The evidence panel for a Transaction report is assembled by hand**, not a
  single endpoint: 3 separate `GET /admin/transactions/...` calls bundled by
  `lib/api/reports.ts`'s `adminGetTransactionEvidence`. It shows confirmation
  timestamps, the slip image, appointment cards, and a plain-text chat
  transcript — not the full interactive `ChatThread` component, since this is
  a read-only case file, not a conversation.
- **§7.5.3's table arrived and is wired in `report-form.tsx`'s `REASONS`** —
  5 reasons, each with an `eligible(transaction)` predicate re-checking the
  table's own "occurs when" column against the real transaction (a fake-slip
  report only becomes selectable once `sellerConfirmDeadline` has actually
  passed, "item not as described" only once `status === "Completed"`, etc.)
  rather than trusting the reporter to self-select correctly. An ineligible
  reason is disabled, not hidden, with the precondition shown as the reason
  it is greyed out. Needed extending `transaction.service.ts`'s
  `serializeTransaction` (and the frontend `Transaction` type) with the
  cancellation/refund columns — `cancellation_response`,
  `cancellation_requested_at`, `refund_slip_url`,
  `refund_confirmed_by_buyer` — none of which had ever been exposed past the
  raw Prisma row before, for either of the two "went to Pending Refund"
  reasons. One precondition is only approximate: "didn't ship or come to pick
  up" has no dedicated meetup-pickup deadline anywhere in the codebase
  (`lib/status.ts`'s `deadlineFor` only computes one for `Shipping`), so a
  stuck `Meetup` transaction in `Processing` is treated as eligible
  immediately rather than after some specific overdue window — matching how
  `deadlineFor` already leaves Meetup with no deadline at all (see the report
  button's own overall `allowed` gate, which is `false` for a stuck Meetup
  deal today for the same underlying reason — a pre-existing gap, not
  introduced here).

## Trade terms and the listing description are not stored

Recorded 2026-09-03 while wiring `list-form.tsx` to `POST /posts`
(UX-REVISION-PLAN.md step 2.0.1).

`CreatePostPayload` is `{ item_id, post_type, price, quantity_total }`. The
list form also collects **"What do you want in trade"** and **"Listing
description"** (`list-form.tsx:129-146`), and the endpoint has nowhere to put
either. Both were being discarded silently by the placeholder that preceded
this wiring, so nothing regressed — but nothing is saved either.

What the UI does: the two fields stay on screen and are sent nowhere. They are
not removed, because the brief asked for the sell/trade choice to be explicit
and "what do you want in trade" is the question a trade-only post exists to
ask. A post whose trade terms vanish is a worse answer than one that never
asked, so this needs an owner decision rather than a quiet deletion:

- add the columns to the backend (outside this scope, `CLAUDE.md` 0), or
- fold both into `Item.description` at publish time, which mixes an item fact
  with a listing fact and will read wrong on the next listing of the same
  item, or
- remove the fields and let the seller say it in chat.

Also noted: a trade-only post has no meaningful asking price, and `price` is
required. The wiring sends `0` for `TradeOnly`. If the API treats `0` as a
real price, a trade-only listing may render as "free" somewhere.

## A seller cannot reject a payment slip

Recorded 2026-09-03 while wiring the deal screen's transitions
(UX-REVISION-PLAN.md step 2.0.5).

`API_Marketplace.pdf`, "Transactions, Fulfillment & Payment", gives the seller
exactly one slip verb: `POST /transactions/{id}/confirm-payment-received`.
There is no reject. `SlipReviewer` offers both, and the reject button was a
placeholder that toasted "Told the buyer the amount does not match" without
telling anyone anything.

The only contract route out of a bad slip is
`POST /transactions/{id}/cancel-request`, which is a different act with
different consequences: it starts a 72h clock, and a rejection by the other
side flips `dispute_status` to `under_review`. Wiring the reject button to it
would be inventing product behaviour, so it is not wired.

What the UI does now: the button stays, and says the action is not supported
yet, pointing at chat or a cancellation request. It asserts nothing false.
Needs an owner decision:

- route reject to `cancel-request` with a canned reason, or
- remove the button and leave chat as the channel, or
- add the endpoint (outside this scope, `CLAUDE.md` 0).

## Chat unread state is local to one browser

Recorded 2026-09-06 while redesigning the conversation list.

The API returns messages and timestamps but has no read receipt, last-read
timestamp, or unread count. The sidebar therefore records the time a room was
opened in browser storage and shows an unread dot only when a newer message
from someone else exists. This is truthful for future messages on that browser,
but it cannot synchronize read state between devices or recover historical
read state from before the marker was created.

A cross-device unread badge requires a backend field or endpoint that records
the viewer's last-read message per room. The frontend must not infer that state
from transaction workflow ownership (`needsYou`), because whose turn it is and
whether a message was read are different facts.
