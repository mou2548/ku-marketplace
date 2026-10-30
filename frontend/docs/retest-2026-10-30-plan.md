# Retest 2026-10-30: bug fix plan and Pinterest feed

Date: 2026-10-30, on `develop` at `95df630`.

## Progress

| Phase | Status |
| --- | --- |
| A (R01) | On hold, owner decision 2026-10-30. |
| B (R02, R03, R06, R07) | Done 2026-10-30. R03 keeps the sideways scroll (team choice 2026-10-27) and adds the `scroll-fade-x` edge shade plus scrolling the current section into view; no "More" tab. R06 keeps the words and drops to 11px under 380px. `verify-bc.mjs` passes at 360/390/768/1280. |
| C (R04, R08) | Done 2026-10-30. Failed slips show the shared `ImagePlate` and nothing to open; closed registration reads "Registration closed". |
| D (R09) | Open, needs a decision. |
| Pinterest feed (R05) | Done 2026-10-30, under owner testing. `/feed` reads each photo's size on the server (`lib/image-size.ts`, `lib/image-ratio.ts`, hosts from `lib/image-hosts.ts`), clamps it to 2:3..4:3 and packs cards into the shortest column (`lib/masonry.ts`). `verify-r05.mjs` with 28 listings passes at 360/390/768/1024/1280/1920: 2/2/3/4/5/5 columns, 19-22 distinct card heights, first row newest left to right, CLS 0, no overflow, column ends within the tallest card. `/feed` server time 0.31s cold, 0.02s warm. Giveaway feed and seller profile grid unchanged. |

`code-review` (medium) findings on B and C were fixed: the chat name keeps
truncating with `touch-link`, the failed slip hides "View full slip", the tab
bar uses the existing CSS shade instead of a ResizeObserver, the plate is
shared with `PostImage`, the pill hides its label from its own clock, and
"Registration closed" comes from `lib/copy.ts`. Not changed: `min-w-11` on the
admin "#id" link only applies on touch, which is where it is needed.

Correction to R07: the "Back to ..." links did **not** use `touch-target`
(the note in the table below was wrong). Twelve back links now carry
`touch-link` and measure 44px tall at 360. History row titles stay 25px
because the 64px photo beside them opens the same listing.

## How it was tested

- Production build (`next build && next start`) against the local backend
  (`DATABASE_URL` pointed at the docker Postgres, since the Supabase tenant in
  `backend/.env` no longer resolves). Seed accounts, password `KuDemo123!`.
- Playwright 1.62, Chromium, one browser context per account.
- **Route sweep:** every route in `app/` for `anon`, `user1`, `user2`, `admin1`
  and `user8` at 360, 390, 768 (touch), 1024, 1280 and 1920. 528 page loads.
  Each load checks horizontal overflow, elements past the viewport, tap targets
  under 32px on phones, error boundary, broken images, console and page errors,
  failed and 5xx requests, and saves a full-page screenshot.
- **Journeys** at 390 and 1280: wrong and empty login, feed search with no
  results, filter sheet, sort, open a listing and Back (scroll restore), mobile
  menu, chat list and send a message, giveaway detail, inventory form, post
  composer, Buy now, trade offer composer, session loss mid-use, admin pages and
  the admin mobile menu, dark scheme.

Scripts and screenshots (not committed):
`/private/tmp/claude-501/-Users-krittiphong-Desktop-Ku-Work-KU-Market-Place-ku-marketplace/4731352b-047c-486f-8e95-e2bd16e6e039/scratchpad/pw/`
(`sweep.mjs`, `journeys.mjs`, `extra.mjs`, `buy.mjs`, `out/`).

## What passed

- No horizontal overflow on any of the 528 loads, phone to 1920.
- No page errors, no 5xx, no error boundary.
- Wrong password shows "Wrong email or password."; empty search shows the
  empty state and puts `?q=` in the URL; sort writes `?sort=priceAsc`.
- Back from a listing restores the feed scroll position (390 and 1280).
- Clearing cookies mid-use sends `/offers` to `/login?returnTo=%2Foffers`.
- Chat sends on desktop; the composer stays above the fold on both sizes.
- Filter sheet, mobile menu (with Sign out), trade offer composer render
  correctly at 390.

## Findings

| ID | Sev | Where | What the user sees | Evidence |
| --- | --- | --- | --- | --- |
| R01 | High | `/market/:id` Buy now | The buyer picks a delivery method and presses Confirm purchase, and only then a toast says the seller has no PromptPay. The toast sits behind the sheet's scrim. This is B14 from the UI audit, still open. | `m390_buy-after.png` |
| R02 | Medium | `/chat/:id`, `/history/:id` at 360-390 | Header is one cramped row: the counterpart's name is cut with a stray "(" (the verified badge clipped), the item title shrinks to 11-38px ("เสื้...", or gone), "View details" and "Show the current step" are 28px tall. | `user1_m390__chat_2.png`, sweep SMALL_TAP |
| R03 | Medium | Admin bottom nav under `lg` | Seven tabs in a horizontal scroll strip with no hint: at 390 "Appeals" is cut at the edge and Memberships is off-screen. | `admin1_m390__admin_memberships.png` |
| R04 | Medium | `Slip` (`components/kit/slip.tsx`) in admin memberships and chat slips | A slip that fails to load shows the browser's broken-image icon and the alt text "Transfer slip" in an empty box. `PostImage` and chat photos already have a failure plate; `SlipImage` has none. | `admin1_m390__admin_memberships.png` |
| R05 | Medium | `/feed` | Not a Pinterest feed any more: every card is a 4:5 crop, so cards are the same height and on desktop the feed reads as a grid. See [Pinterest feed](#pinterest-feed). | `d1280_feed.png`, `user2_t768__feed.png` |
| R06 | Low | Bottom nav at 360 | "Invento…" and "Giveaw…" are truncated. | `user1_m360__giveaway_1_manage.png` |
| R07 | Low | `/history` filter, `/post` "Add", `/admin/users/:id` "#1" | Tap targets 25×44, 48×22 and 16×44 without `touch-target`. (Back links measured 22px but already use `touch-target`; not counted.) | sweep SMALL_TAP |
| R08 | Low | `/giveaway/:id/manage` | Closed registration reads "Registration closes **Past due**". Should say "Registration closed". | `user1_m360__giveaway_1_manage.png` |
| R09 | Question | Theme | The app starts light even when the OS is dark; only the toggle switches. Intended? | `m390_feed-dark.png` |

### Test data gaps (not UI bugs, but they block testing)

- **Suspended user untestable.** `user8` is seeded `Suspended` without a
  `Violation_Confirmed` report, so the backend lifts it on login
  (`liftExpiredSuspension`) and the restricted shell never shows. Create the
  suspension through the admin flow (report, confirm with a sanction) before
  retesting.
- **Only 4 active listings, all 600×600 crops.** The feed cannot show a
  masonry layout with this data. Needs 20+ listings with mixed portrait,
  square and landscape photos (local DB only).
- **`placehold.co` slips are SVG**, which `next/image` refuses (400). Useful as
  a broken-image case for R04, but seed real PNG/JPG slips for the happy path.

## Fix plan

Each phase: change inside `frontend/` only, `code-review`, rerun the matching
Playwright scripts against a production build, then commit. No push without
permission.

### Phase A: flows (R01)

1. Add the gap to `docs/design/api-gaps.md`: `GET /posts/:id` does not say
   whether the seller can receive PromptPay (`seller` has only id, name,
   verified, avatar). Ask the backend for `seller.has_promptpay`.
2. Until then, in the Buy now sheet: show the API error **inside the sheet**,
   above Confirm, instead of a toast behind the scrim, and keep the sheet
   open so the buyer can switch to "Offer a trade" from there.
3. When `has_promptpay` exists: disable Buy now with the reason on the
   listing, before any dialog.
4. Retest: `buy.mjs` at 390 and 1280; error readable, no toast under scrim.

### Phase B: mobile layout (R02, R03, R06, R07)

1. **Chat header** (`app/(app)/chat/[roomId]/room-screen.tsx`): two rows under
   `sm`. Row 1: back, avatar and name (truncate the name, never the badge),
   Details. Row 2: deal type chip and item title on one truncating line.
   Details and the step toggle get `min-h-11`.
2. **Admin bottom nav** (`components/admin/admin-navigation.tsx`): show the
   four busiest sections (Dashboard, Reports, Appeals, Memberships) plus a
   "More" tab that opens a sheet with Deals, Users, Items. No horizontal
   scrolling.
3. **Bottom nav labels at 360:** shorter labels that fit 6 tabs at 60px
   ("Items" for Inventory, "Gifts" for Giveaway), checked in the copy file.
4. **Tap targets:** `touch-target` or `min-h-11` on the history filter tabs,
   the composer's "Add" link and the admin "#1" report link.
5. Retest: full sweep at 360/390/768; SMALL_TAP list empty except inline text
   links; screenshots of chat header at 360 with a long Thai name and title.

### Phase C: images and copy (R04, R08)

1. `SlipImage`: same three states as `PostImage` (loading ghost, failed plate
   with `ImageOff` and "This slip could not be loaded", keep the reserved box).
2. Giveaway manage: "Registration closed" when the close date has passed
   (reuse `lib/giveaway-phase`).
3. Retest: admin memberships and `/chat/2` with the SVG slips; no broken icon.

### Phase D: R09

Decide: follow `prefers-color-scheme` until the user picks a theme, or keep
light as the default. Only code if the answer is "follow the OS".

## Pinterest feed

### What happened

| Commit | Feed layout |
| --- | --- |
| `fe34d69` redesign | `MasonryGrid` (CSS columns): column-major, staggered. |
| `24e6ba4` | Plain row-major grid, every sort. Masonry gone. |
| `7815858` | `MasonryRows`: item *i* goes to column *i % n*, per-column stacks. |
| `b1272b0` (P02) | Same, pre-rendered per breakpoint to remove CLS. |

So the masonry component is still there, but nothing makes the cards differ
in height: `PostCard` always passes `aspectRatio = 0.8` (the feed never sets
it, the API gives no image size, `Item_Image` has no width/height), and the
seed photos are all square. Only the text block varies, a few pixels, so the
columns line up like a grid, and with 4 listings at 4-5 columns there is a
single row.

### Plan

1. **Real image ratios, on the server.** In `app/(app)/feed/page.tsx`, read
   the size of each listing's primary image before rendering:
   - `lib/image-size.ts`: fetch the first bytes of the image (Range request),
     parse width/height for JPEG, PNG and WebP; Cloudinary URLs can ask for
     `fl_getinfo` instead. Cache per URL with Next's `use cache`
     (`cacheLife("max")`, image URLs never change content).
   - Clamp to Pinterest's range, 2:3 to 4:3 (0.667-1.333); unknown or failed
     falls back to 0.8. Pass it to `PostCard` as `aspectRatio`.
   - Because the ratio is known in the server HTML, the image box is reserved
     before paint, so this keeps the P02 CLS budget (≤ 0.05).
2. **Shortest-column packing.** With real heights, `i % n` leaves ragged
   column bottoms. In `MasonryRows`, deal each item to the column with the
   lowest estimated height: `columnWidth / ratio` + a text estimate (title
   lines, course chip, description, "wants" line). Deterministic from data,
   so server and client produce the same layout and the per-breakpoint
   pre-render from P02 still works. Ties go left, so the first row still
   reads newest left to right.
3. **Giveaway feed** (`giveaway-browser.tsx`) uses the old CSS-column
   `MasonryGrid`; move it to the same `MasonryRows` so both feeds match, then
   delete `MasonryGrid`/`MasonryItem` if unused.
4. **Test data** (local DB, not committed): 24 listings with portrait,
   square and landscape photos and mixed text lengths.
5. **Tests**
   - `tests/masonry.test.mjs`: packing puts items in the shortest column, ties
     go left, first row is items 0..n-1 when heights are equal, same input
     gives same output.
   - `tests/image-size.test.mjs`: JPEG/PNG/WebP headers, clamp, fallback.
   - Playwright on `/feed` at 360/390/768/1024/1280/1920: columns 2/2/3/4/5/5,
     several distinct card heights, column bottoms within one card of each
     other, CLS ≤ 0.05, no overflow, first row is the newest listings; plus a
     filter and a sort change keep the layout tight.
6. **Risk:** the image fetch adds server time on a cold cache (up to one
   request per listing). Mitigate with parallel fetches, a 1.5s timeout per
   image falling back to 0.8, and the long cache. If that is still too slow,
   the alternative is to store width/height at upload, which needs a backend
   change.

Order: Pinterest feed after Phase A, since both touch the listing pages and
the feed needs the new seed data anyway.
