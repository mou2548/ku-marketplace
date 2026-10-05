# Seller profile and following delivery

## Scope

Public seller pages at `/sellers/:sellerId`, seller-scoped listing browsing,
persisted follow/unfollow, and a private `/account/following` directory. Product
detail and Account link to these pages. There are no ratings, reviews, response
metrics, direct chat, or follow notifications.

The implementation follows `seller-profile-follow-plan.md`. It uses existing
names and initials rather than adding avatar uploads or shop settings.

## API

| Route | Access | Response |
| --- | --- | --- |
| GET /sellers/:sellerId | Public | Public profile, current follower and listing counts |
| GET /sellers/:sellerId/posts | Public | Paginated posts |
| GET /users/me/following | Active account | Private paginated directory |
| GET /users/me/following/:sellerId | Active account | Following state and follower count |
| PUT /users/me/following/:sellerId | Active account | Idempotent follow; authoritative state/count |
| DELETE /users/me/following/:sellerId | Active account | Idempotent unfollow; 204 |

Public profile fields: `user_id`, `name`, `is_verified`, `member_since`,
`active_listing_count`, `follower_count`. An unavailable private directory entry
contains only `seller_id` and `profile: null`. No public follower identities.

Post queries accept `q` (150 characters), `category` (50 characters),
`type=all|sell|trade`, `sort=latest|price_asc|price_desc`, `page` (1..100000), and
`limit` (1..48; default 24). Results use the existing `{data, meta}` envelope.
Price ordering puts trade-only posts last, including across page boundaries.
Stable ID ordering resolves ties. Filters submit without `page`, resetting to 1.

Follow identity comes only from the authenticated session. Composite uniqueness,
a database self-follow CHECK, and deterministic account-row locks protect writes.
Counts include only active followers. Relations survive sanctions, and unavailable
targets can still be unfollowed. SQL performs pagination and filtered aggregates;
no per-entry profile requests are needed.

## Visibility and existing flows

Only active, nondeleted, in-stock posts on listed, nondeleted items owned by active
users are publicly discoverable. The feed, detail and new purchase/offer entry
checks now apply these rules. Existing transaction history and evidence access are
unchanged. Seller verification now reads the actual email verification timestamp.

Following grants no transaction, chat, inventory, membership, or giveaway rights.
The report button uses the existing User report dialog, now translated. Active
accounts with zero available listings retain their public profile.

Login accepts only `/sellers/<positive-int32>` as a return destination. Restricted
accounts still go to appeals, and default admin/user destinations are preserved.
No follow is automatically created by logging in. Follow controls disable pending
requests, retain confirmed state on failure, and refresh on navigation/focus.

## Migration and deployment

Deploy database first, backend second, frontend last. Regenerate Prisma before
building the backend. This repository has a legacy SQL migration convention;
do not reset the database or assume it has a Prisma migrate deployment history.

From `backend/`, with `DATABASE_URL` pointing to the intended database:

```sh
npx prisma db execute --file prisma/migrations/20260916010000_seller_following/migration.sql
npm run prisma:generate
npm run build
```

Fresh installations use the matching `User_Follow` DDL in root `init.sql`.
The additive migration can be applied repeatedly. It does not backfill followers
or alter existing user/listing data.

Rollback: deploy the previous UI/backend while retaining `User_Follow`, preserving
follow data. Only after disabling all dependent code and explicitly approving
removal of that data, export the table and drop `User_Follow`. Do not reset the
database or drop User/Item/Post/transaction tables.

## Verification

- Real PostgreSQL integration: public allowlist, verification accuracy, seller
  scoping, filters, trade-last price pagination, follow authentication/self-follow,
  concurrent idempotence, spoofed actor rejection, sanction visibility, private
  placeholders, restoration, empty profiles and stock release, database constraints.
- Fresh install and repeated legacy upgrade tests run in isolated schemas; the
  existing purchase/trade regression suite remains part of the checks.
- Frontend action tests cover authenticated desired-state requests, invalid input,
  missing sessions, error responses and mutation completion. Login tests include
  valid seller returns and malicious/invalid return destinations.
- Backend build/unit tests, frontend tests/lint/type checking/production build.

### Recorded results (2026-09-16)

- Backend unit tests: 20 passed across 8 suites; backend build passed.
- Seller/fresh-install/upgrade integration: 33 passed across 3 suites. The seller
  suite was rerun after adding direct new-offer/offer-acceptance sanction checks.
- Frontend: 11 test files passed; lint, TypeScript and production build passed.
- Targeted backend lint for the new services/controllers/public predicate passed.
- Chromium: 12 combinations (Thai/English x light/dark x 360/768/1280px), with no
  horizontal overflow or browser exceptions. Verified keyboard follow, authoritative
  follower-count update, sign-in return, follow persistence after reload, private
  directory/unfollow, mutation failure/retry, report dialog, filters/reset,
  pagination, unknown follow-state handling, owner controls and unavailable seller.
- Browser tests use an isolated fixture HTTP API; backend tests separately exercise
  the real PostgreSQL schema and Nest guards/routes. This is not a claim that a
  production deployment or a physical second device was tested.
- Applied the additive migration to the configured local development database
  (local host only); existing accounts/listings were not reset. Production has
  not been migrated or deployed.

The browser regression found a pending transition that could leave a successful
follow displaying its previous state. Follow controls now use explicit request
pending/error handling. The mutation resolves before the client requests a fresh
server-rendered page; seller and following reads are no-store. This avoids coupling
the mutation response to a second rendered page tree. The final browser suite passed with that implementation.

Reproduce the browser run after `npm run build --prefix frontend`:

```sh
# Playwright must be installed in the test environment; no runtime dependency added.
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node frontend/tests/browser/sellers.mjs
```

The test starts an isolated Next server on port 4108 and a fixture API on 4109,
then closes both. It writes screenshots under `docs/verification-evidence/sellers/`:

- [Desktop, light](../verification-evidence/sellers/seller-light-1280.png)
- [Mobile, dark](../verification-evidence/sellers/seller-dark-360.png)

Remaining verification limits: no manual screen-reader audit, production-scale
load benchmark, or production deployment. The build emits the repository's
existing multiple-lockfile workspace-root warning; it still succeeds.


## Reference layout revision

Updated the seller page to follow the user-provided marketplace screenshots:
compact seller identity card on the left of the header, product/follower/joined
information on the right, a desktop category sidebar, and a sort toolbar above
the product grid with quick page arrows. Desktop shows five product columns;
mobile uses two columns and a category select. Search and sale/trade tabs retain
the active category/sort; changing any filter resets pagination.

Sorting remains backed by the existing API: newest, price ascending, and price
descending. Popularity/top-sales ranking is not fabricated. Reviews, response
times, online status and pre-transaction chat remain outside the agreed scope.

Verification includes the browser suite's URL assertions for category, listing
type and price sorting, along with both themes/languages at all three widths.

## Feed entry and follow-button correction

Product cards now have sibling product and seller links. The seller avatar/name
opens `/sellers/:sellerId` directly from the feed and related listing grids; the
product image/title retains `/market/:postId`. The seller target has a 44px touch
height and a full-name accessible label. No anchor is nested inside another.

The profile follow action uses a single white button with dark green text on the
green identity card, matching the user's final color preference. Removed the extra white background/padding wrapper that made it appear as
a button inside another control. Signed-out and signed-in controls share the same
profile appearance, while the private following directory retains its normal style.
Browser regression checks feed name/avatar clicks, independent product navigation,
link structure, touch height and the follow button's surrounding surface.

## Readable listing condition

Condition now appears in a labelled, softly tinted badge directly below the item
title, instead of small trailing text beside the seller. It uses the existing
five condition labels and theme-aware condition colors. The badge wraps at narrow
widths; the seller keeps a separate full-width click target. Browser fixtures
include all five condition grades for visual inspection in both languages/themes.

### Condition badge verification update

The condition badges use the existing success/warning/danger foreground and
background tokens so their text remains readable in both themes. Thai values
are shortened inside the labelled badge to avoid repeating the condition prefix.

The full browser regression was attempted twice during this change and did not
complete: its follow action persisted in the fixture, but the UI did not display
`Following` within 30 seconds. That follow-state refresh issue remains unresolved;
the historical successful full-suite runs above must not be read as a pass for
this latest run. No follow implementation was changed for the condition redesign.

Use `SELLER_VISUAL_ONLY=1` with the existing browser command for the explicitly
limited layout/condition check. This mode verifies both themes, all five grades,
and mobile/desktop overflow, and does not claim to test authentication or following.

Final condition-only verification passed: production build/type checking, targeted
lint, 12 seller layout combinations, and all five condition grades in the feed at
360/1280px in both themes. No horizontal overflow or browser exceptions were
reported in this visual run. Feed screenshots are stored as
`feed-conditions-{light,dark}-{360,1280}.png` alongside the seller evidence.
