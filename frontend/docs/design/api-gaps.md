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

## 2. A giveaway has no capacity

There is no column for how many places a giveaway has. `FirstCome` therefore
cannot show "3 of 5 taken", which is the one number that method exists to
communicate, and the giver cannot state up front how many people will be
chosen.

The UI shows `registered_count` alone, and the allocation-method hint explains
how places are handed out without promising a number.

## 3. There is no profile endpoint, so a person is not a destination

`GET /users/{id}` does not exist, and neither does anything that returns a
public profile. Every name in the app — a seller, a proposer, a giver — is
therefore text or a `TrustBadge`, never a link, and "what else is this person
selling?" cannot be answered. The trust signals a name would carry are shown
inline instead: verified badge, faculty, year.

## 4. The category list is hardcoded

`GET /items/categories` exists and is not called. `lib/categories.ts` holds ten
readable names matching the seed, because the per-category extra fields
(`course_name`, `brand_model`, `warranty_expiry`, `size`) have to be keyed by
something known at build time. If the endpoint ever returns a category not in
that map, it simply gets no extra fields, which is the correct fallback.

## 5. Entrant allocation state is derived, not returned

There is no endpoint that says which entrants were selected. `getEntrants` in
`lib/api/fixtures.ts` derives it from each entrant's ticket status —
`Waiting`/`Received`/`Expired` mean the place was theirs, `Not_Selected` means it
was not. A real client will have to do the same join over the ticket list.

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

## 7. Auth has no `/auth/refresh` endpoint

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

What's still genuinely missing: **no `POST /auth/refresh`**, despite `login`
and `otp/verify` both setting a `refreshToken` httpOnly cookie — nothing
anywhere consumes it. The access token is 15 minutes
(`token.service.ts`); the frontend session cookie (`lib/api/session.ts`) is set
to match that lifetime and simply expires with it. No silent-refresh logic
exists to write, and there is nothing to build it against.

## 8. Giveaway Allocation System — what `lib/api/giveaways.ts` adapts around

The 9 endpoints in the spec's "Giveaway Allocation System" table are all wired
now (`giveaway-detail.tsx`, `manage-giveaway.tsx`,
`giveaway/[giveawayId]/ticket/[ticketId]/ticket-screen.tsx`,
`post-composer.tsx`'s giveaway branch). Two of them — `POST /giveaways` and
`POST /giveaways/{id}/join` — used to require `giver_id`/`receiver_id` in the
body; the backend now reads both from the JWT (`@CurrentUser()`), matching the
spec's request examples (empty body for `join`, no `giver_id` for `create`).
What is still adapted around, not fixed, because it would mean inventing a
backend capability rather than reading one that exists:

- **One deadline field, not two.** `GiveawayPost` has `pickup_deadline` only.
  The UI's "registration closes" countdown and "collect by" date are the same
  timestamp shown twice — there is no separate signup window and pickup
  window. `pickup_start_date`/`pickup_end_date` on the frontend `GiveawayPost`
  type are always `null` from the real API; `post-composer.tsx` still collects
  a pickup-open/pickup-close range from the giver, but only `closeAt` is ever
  sent, because there is nowhere to send the rest.
- **No standalone profile endpoint, but names are no longer fabricated.**
  There is still no `GET /users/{id}` (§3 still applies for "what else is this
  person selling?" and for a name-as-link), but `giveaways.service.ts` now
  includes the `giver`/`receiver` relation and returns a `{ user_id, name,
  isVerified }` summary alongside every id it names — `create`, `findAll`,
  `detail`, `join`, `draw`, `select`, and `recipients` all carry it.
  `giveaways.ts`'s `toUserSummary` reads that summary and only falls back to
  `placeholderUser`'s `User #<id>` if it is missing. The Manual giver's
  "choose recipients" list (`ManageGiveaway`) shows real names now, not ids.
- **`ticket_status` is `Waiting | Received | Expired`, nothing else.**
  `Waiting` means "pending the draw" before a Random/Manual giveaway closes
  and "ready to collect" after — `deriveTicketStatus` in `giveaways.ts` tells
  them apart using the giveaway's own `status`/`allocation_method`, not the
  ticket alone. Worse, `Expired` is written for three different real events —
  lost the draw, forfeited voluntarily, and timed out uncollected (spec
  §5.4/§5.5 want these as separate, auditable states) — with no field that
  says which. The best available signal is whether the status changed before
  or after `pickup_deadline`; `deriveTicketStatus` uses that as a heuristic
  (`Not_Selected` before, `Expired` after) and forfeited tickets are
  indistinguishable from lost-the-draw ones under it.
- **No automatic timeout.** Spec §5.4 says a ticket "changes to timed-out
  automatically" past the pickup deadline. Nothing server-side does this —
  `ticket_status` only ever changes on an explicit `select`/`draw`/`forfeit`/
  `qr/scan` call. A ticket that is never scanned and never forfeited stays
  `Waiting` forever; the heuristic above only fires once *something* has
  written `Expired` to that row.
- **`GET /giveaways/{id}/recipients` only returns live tickets.** Filtered to
  `Waiting`/`Received` server-side, so a forfeited or expired ticket
  disappears from it entirely rather than showing up with that status. This
  is also the endpoint `getMyTicket` and the giveaway ticket route reuse to
  answer "does the viewer hold a ticket for this giveaway" — once that ticket
  expires or is forfeited, the answer silently reverts to "no", and the
  ticket page 404s instead of showing why.
- **Nobody calls `POST /giveaways/{id}/draw` unless a person does.** The
  backend does not run the draw when the deadline passes. `giveaway-detail.tsx`
  now shows the Random giver a "Run the draw" button (not in the spec's
  screens, but without it a Random giveaway can never resolve); FirstCome has
  no equivalent because a `Waiting` ticket already *is* the win — `join()`
  never rejects on capacity, so first-come-first-served currently has no
  capacity limit either (no column for one).
- **`GET /giveaways` (list) was added, outside the spec table.** The "Open"
  tab in `giveaway/page.tsx` (`GiveawayBrowser`) now reads real data via
  `getGiveaways()` in `lib/api/giveaways.ts` — a newly created giveaway used
  to be invisible everywhere (the create call succeeded, but nothing linked
  to it) because this endpoint didn't exist yet and the browse tab still read
  `lib/api/fixtures.ts`. `giveaways.service.ts`'s `findAll()` returns every
  giveaway regardless of status, same as `detail()`; the frontend still does
  the `status === "Active"` filtering for the tab.
- **"My tickets" still has no endpoint and is still mock.** The "My entries"
  tab is the one piece of `giveaway/page.tsx` still on `lib/api/fixtures.ts`
  — there is no reverse lookup from a user to their tickets anywhere in the
  spec. The standalone ticket route moved from `/giveaway/ticket/[id]` to
  `/giveaway/[giveawayId]/ticket/[ticketId]` for the same root cause: there
  is no `GET` for a single ticket by its own id, only by giveaway id via
  `recipients`, so the route now carries both.

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
