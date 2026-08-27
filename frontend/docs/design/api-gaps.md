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
