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

Two consequences a real backend should close:

1. Message senders can only be named if they happen to be the giver or hold a
   ticket. Anyone else in the thread falls back to "Unknown member".
2. `buildRooms` in `lib/rooms.ts` still admits only the giver to a giveaway
   room, so recipients cannot open the group chat they are in. That is
   membership logic rather than a missing endpoint, and is deliberately left
   alone here.

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
- **No giver/entrant profile.** Same root cause as §3 — no `GET /users/{id}`.
  `giveaways.ts`'s `placeholderUser` renders every giver and every entrant as
  `User #<id>`. The Manual giver's "choose recipients" list (`ManageGiveaway`)
  is therefore a list of ids and verification badges, not names.
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
