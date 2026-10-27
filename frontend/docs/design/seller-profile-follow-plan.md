# Seller profile and following implementation plan

Date: 2026-09-16
Status: Implemented locally on 2026-09-16. See [delivery and verification](seller-profile-delivery.md). The sections below preserve the approved planning baseline.

## 1. Objective and scope

Let a buyer open a seller's profile, browse all currently available sale/trade
listings, and follow that seller to find them again. The user explicitly requested
followers and excluded reviews and chat response-time metrics.

Core deliverables:

- Public seller profile at `/sellers/[sellerId]`.
- Public seller information, truthful KU email-verification badge, member-since
  date, available-listing count, and follower count.
- Available listings with search, category/type filters, sorting and pagination.
- Authenticated follow/unfollow, persisted across devices and login sessions.
- Private `/account/following` directory and account-navigation entry.
- Entry links from product detail and its "more from this seller" section.
- Existing user-report entry and account-owner controls.
- Backend contracts, schema migration, tests, documentation and release sequence.

No ratings/reviews, response-speed indicators, online-status tracking, follower
notifications, new-listing alerts, direct pre-transaction chat, or recommendation
feed are part of this delivery. Following saves a seller for later discovery;
it does not subscribe the user to notifications or grant transaction access.

Avatar upload, biography editing, shop names and banners were suggested earlier,
but not confirmed by the user. The core plan uses the existing name and initials
avatar. These profile-customisation features are optional subsequent scope, not
required dependencies of the profile/following feature.

## 2. Flow sources and reconciliation

Sources inspected:

- `fornewdesign/flow1.png`: inventory -> listing -> purchase/accepted offer ->
  transaction/chat -> fulfilment, cancellation and refunds.
- `fornewdesign/flow2.png`: reporting, admin decisions, sanctions and appeals.
- `fornewdesign/flow3.png`: giveaway allocation, recipient tickets and collection.
- `fornewdesign/flow4.png`: KU registration, sign-in, account/profile management,
  membership and entry into the other flows.
- `docs/activity diagram.pdf`: both upper and lower transaction/activity flows.
- `fornewdesign/API_Marketplace.pdf` and `DatabaseSchema.pdf`.
- Current controllers, services, Prisma schema, frontend adapters and product UI.
- Existing flow checklist and combined-diagram audit, treated as historical notes
  where they disagree with current code.

The diagrams do not specify a seller-following lifecycle. Following is a new
requirement from this conversation, not an existing diagram feature. There is no
basis for adding customer ratings or chat response metrics.

| Existing flow | Connection from this feature | Invariant |
| --- | --- | --- |
| Flow 1 | Profile listing -> `/market/:postId` -> existing buy/offer actions | Following never creates a transaction, reserves stock or changes an offer. |
| Flow 2 | Profile report menu -> existing User report flow | Sanctions hide public seller activity; successful appeals restore visibility according to current account state. |
| Flow 3 | No new entry in this delivery | Giveaway registrations, winner visibility and chat membership remain separate from following. |
| Flow 4 | Account -> public profile / followed sellers; login before following | The same account can buy, sell and follow; no new seller role or membership prerequisite. |

The legacy frontend-only API freeze does not describe what this new feature
requires. This plan explicitly identifies additive backend/schema work; it does
not assume endpoints already exist. Only this planning document is written now.

## 3. Current implementation and gaps

- Product detail displays `TrustBadge` and at most four other listings from the
  same seller. It loads all posts before filtering by seller.
- `GET /users/me` reads the caller's private account. There is no public seller
  profile endpoint. Do not reuse or expose its entire response publicly.
- Post responses already contain a seller ID/name and item data. The serializer
  hardcodes seller verification to true; replace that with `emailVerifiedAt`.
- User stores names, verification date and account creation date, but not an
  avatar URL or biography. There is no follow relation.
- The current global post query checks active/nondeleted posts but does not
  enforce every public seller-availability rule described below.
- Chat belongs to a transaction or an eligible giveaway group. A general "Chat
  with seller" action would require a separate feature.
- Login redirects to fixed role destinations. Returning to a seller profile after
  login needs a narrowly validated internal return destination.

## 4. Proposed product decisions

These are implementation defaults for review, not statements from the diagrams.

### Profile visibility and fields

Visitors may browse profiles and their public listings without signing in, matching
current public marketplace reads. Follow, unfollow, personal following state and
user reports require a signed-in, Active account.

Public fields: `user_id`, `name`, `is_verified`, `member_since`,
`active_listing_count`, `follower_count`. Use the existing English full-name
convention with a neutral fallback when empty; localise labels and dates for Thai
and English. Do not infer faculty, year, campus or a verification status.

Do not return email, phone, password hashes, isAdmin, private inventory, reports,
chat content or transaction history. The badge says "KU email verified"; it does
not promise seller reliability. Follower count is a count, not a trust rating.

Keep profiles visible when an Active seller has zero listings. Hide public
profiles/listings for Suspended, Banned and Deleted accounts with a generic
unavailable/404 presentation; do not publish the reason or moderation evidence.
The seller's private account and appeal routes retain existing permissions.

### Available-listing definition

A listing is eligible only when:

- `Post.status = Active`, `Post.deletedAt IS NULL`.
- `Post.quantityRemaining > 0`.
- Its Item is `Listed` and not soft-deleted.
- Its owner is the requested seller and has `User.status = Active`.

Header counts and the unfiltered listing query use the same predicate. Counts
represent posts, not inventory units. Filtered result count is shown separately.
Cancelled transactions may release stock and make a listing eligible again under
the existing rules. Completed returns do not automatically relist items.

Type filters: All = SellOnly/TradeOnly/Both; Sell = SellOnly/Both;
Trade = TradeOnly/Both. A Both listing appears once in All. Giveaways are not
mapped into these filters or the available-listing count.

### Follow lifecycle

- Any Active signed-in user may follow any other Active user, even if the target
  currently has zero listings. No new seller role is introduced.
- Self-follow is rejected on the server and has no UI button.
- Repeating follow produces one relationship. Repeating unfollow succeeds without
  creating errors or negative counts. Use desired-state operations, not a toggle.
- Two concurrent follow calls yield one row; server returns authoritative state
  and follower count. Concurrent opposite requests resolve to database order;
  re-fetch on focus/navigation so other tabs converge.
- Disable the local button while pending. On failure retain the last confirmed
  state and offer retry. Do not manufacture a successful count locally.
- Public counts include only followers whose account is Active. Derive counts
  from rows; do not add a separately mutable follower counter initially.
- Preserve relations across temporary sanctions. Unavailable sellers appear as a
  generic unavailable entry in the owner's private following list, without their
  profile details or listing previews, with an unfollow action available.
- Deleted accounts do not contribute to public counts. Existing soft deletion
  remains unchanged. The relation is not transaction or moderation evidence.
- Public follower identities and public following lists are not introduced.

## 5. Screens and interactions

### `/sellers/[sellerId]`

1. Back/breadcrumb to the relevant product or marketplace.
2. Compact profile header: initials avatar, seller name, verification badge,
   member-since date, follower count and available-listing count.
3. Actions: Follow/Following, Share, and a secondary report-user menu.
4. For the owner: replace Follow with Edit profile, and provide Manage listings.
5. Listing search scoped to this seller, type chips, category filter and sort.
6. Reuse existing PostCard styles and product-detail navigation.
7. Numbered pagination, 24 items by default. Preserve search/filter/page in URL.

Use latest first by default. Optional price ascending/descending puts TradeOnly
listings after priced listings, with an explicit "Trade" label rather than a
misleading zero price. Tie-break all sorts by post ID. A filter change resets
page to 1. Show the matching total and a clear-filters action.

Mobile: compact header and two product columns; filters wrap without page-level
horizontal scrolling. Desktop: horizontal header and three/four product columns.
Reuse current green tokens, surfaces, spacing, dark theme and Thai/English copy.

States: loading skeleton; empty seller inventory; no search matches; unavailable
seller; listings service error with retry; follow-state error without assuming
Not Following; button pending; signed-out follow prompt; copy/share feedback.
Counts that fail to load are not displayed as zero.

### `/account/following`

Private, paginated list ordered by most recently followed, with stable ID ties.
Each available entry shows initials, name, verification, available-listing count,
profile link and Unfollow. Do not fetch one profile per row. For no follows,
explain how following works and link to the marketplace. Handle unavailable
entries as specified above.

### Entry points and sign-in return

- Product seller name/avatar and explicit View seller profile action.
- View all action in the existing More from this seller section.
- Account links: View public profile and Following.
- Do not add a global navigation tab solely for profiles.
- Signed-out Follow leads to login with a validated `/sellers/<numeric-id>`
  return path. After login return there and let the user confirm Follow; do not
  silently create a follow merely by signing in. Reject external/protocol-relative
  redirects. Restricted accounts still go to appeals rather than the return path.
- Preserve existing admin/user default destinations when no return path exists.
- Share canonical profile URL without viewer-specific state or tokens; clipboard
  fallback when native sharing is unavailable.

## 6. Proposed API contract

All routes below are NEW proposals. Keep existing endpoints compatible.

| Method and route | Access | Result |
| --- | --- | --- |
| `GET /sellers/:sellerId` | Public | Allowlisted profile and counts; 404 if unavailable. |
| `GET /sellers/:sellerId/posts` | Public | Eligible seller posts and pagination metadata. |
| `GET /users/me/following` | Active account | Paginated private directory, including unavailable placeholders. |
| `GET /users/me/following/:sellerId` | Active account | Current viewer's `is_following` state. |
| `PUT /users/me/following/:sellerId` | Active account | Idempotently follow; return seller ID, state and current count. |
| `DELETE /users/me/following/:sellerId` | Active account | Idempotently unfollow, including unavailable targets; return 204. |

List query: `q`, `category`, `type=all|sell|trade`,
`sort=latest|price_asc|price_desc`, `page`, `limit`. Validate bounds (default 24,
maximum 48), query length and sort allowlist. Reuse the existing
`{ success, message, data, meta: { page, limit, total, totalPages } }` convention.

Separate public data from authenticated follow state to avoid leaking personalised
responses through caches. Start with no-store for personalised reads and current
counts. After mutations re-fetch the necessary summary/state and revalidate the
seller profile and private following directory.

Do not accept follower IDs from request bodies: derive identity from CurrentUser.
Reject invalid IDs, self-follow, unavailable targets and restricted actors using
consistent HTTP errors. Use existing session renewal and guards. No new auth layer.

## 7. Database and backend work

Add `UserFollow` / `User_Follow` with:

- `follower_id`: required FK -> User.
- `followed_id`: required FK -> User.
- `created_at`: required timestamp.
- Composite primary/unique key `(follower_id, followed_id)`.
- Database CHECK `follower_id <> followed_id`.
- Index `(followed_id, created_at)` for follower counts and
  `(follower_id, created_at, followed_id)` for the private directory.
- Named Prisma self-relations for followers/following.

Use additive SQL migration, matching fresh-install SQL, Prisma generation and
rollback notes. No fabricated followers or mass backfill. Avoid dropping/replacing
existing user or transaction data. Test both fresh install and upgrade from an
existing database, including the repository's repeated-migration convention.

Create focused seller read and following services/controllers. Share a public
listing-eligibility predicate and safe seller-summary serializer where applicable.
Use database uniqueness/upsert and deleteMany for idempotence. Perform account-state
checks and relationship writes in a transaction; use deterministic user-row locking
where needed to avoid follow/delete races. Public reads always recheck current
account status even if a relation predates a sanction.

Paginate in SQL; aggregate counts in bounded queries. Do not load every marketplace
post or every user's inventory and filter in the browser. Inspect representative
query plans before adding further indexes.

Audit the existing feed, post-detail and buy/offer entry paths for the same seller
availability rules so a hidden profile cannot be bypassed via a direct product
link. Keep any required adjustments focused on public visibility and eligibility;
preserve existing transaction-history and dispute-evidence access.

## 8. Frontend implementation map

New planned files/components (names may follow existing conventions):

- `app/(app)/sellers/[sellerId]/page.tsx`, `loading.tsx`, `error.tsx`.
- Seller header, FollowButton and seller-listing browser components.
- `app/(app)/account/following/page.tsx` and following-list UI.
- `lib/api/sellers.ts`, `lib/api/following.ts`, `lib/actions/following.ts`.
- Public seller/following types separated from private User/Profile types.
- Thai/English messages for all controls, states, counts and dates.

Update product-detail seller entry, More from seller, account links, and the login
return-path handling. Reuse PostCard, TrustBadge, Surface, existing form/filter
controls, ReportDialog and pagination response handling. Check actual verification
mapping in both seller profiles and existing post summaries.

No avatar uploads or biography schema fields are required by this baseline.

## 9. Ordered delivery phases

| Phase | Work | Exit criterion |
| --- | --- | --- |
| 1 | Finalise wireframes, visibility/follow rules, API schemas and source-flow mapping | Every screen/state and dependency is specified; optional customisation is separated. |
| 2 | Add follow model, fresh-install SQL, additive migration and rollback instructions | Fresh/upgrade tests pass without losing existing data. |
| 3 | Implement public seller reads, listing queries and follow APIs | API permission, idempotence, concurrency and filtering tests pass. |
| 4 | Build seller profile, browsing controls and product entry links | Real data works for visitor, buyer, owner and empty seller. |
| 5 | Add follow UI, private following directory and sign-in return | Follow -> reload -> another device/session -> unfollow works consistently. |
| 6 | Integrate report/sanction visibility, translations and responsive states | Existing flow transitions remain intact; no inaccessible or misleading controls. |
| 7 | Run regression, browser and migration checks; update API/flow docs | Acceptance matrix passes with recorded evidence and explicit remaining limits. |

Dependencies: phases 4-5 integrate only after phase 3's real contracts exist.
Do not ship simulated follow success as an intermediate product behavior.

## 10. Acceptance and regression matrix

- Anonymous visitor sees only public seller data; follow prompts sign-in and returns
  to the intended seller after login, without open redirects.
- Active buyer follows/unfollows; retries/double clicks/concurrent requests produce
  one row and correct counts; second tab reconciles on focus/navigation.
- Owner cannot follow self even through a direct HTTP call.
- Follows survive access-token refresh, logout/login and a different device.
- Password-reset/revoked sessions cannot follow using obsolete credentials.
- Available profile with zero posts remains accessible and followable.
- Draft/unlisted, deleted, hidden, transferred and zero-stock listings are excluded;
  seller restriction is enforced by profile/posts and purchase/offer entry paths.
- Both listings occur once in All and appear under Sell and Trade filters.
- Search/filter/sort/pagination never include another seller's listings; counts
  match predicates and ties have deterministic ordering.
- Cancelling a purchase releases stock under the existing flow; listings can
  reappear only when eligible. Following never changes quantities or post quota.
- Suspended/banned/deleted followers do not inflate public counts; unavailable
  followed sellers can be unfollowed; appeal restoration has defined visibility.
- User report action reaches the existing report flow; no public report evidence.
- No follow grants chat, giveaway-ticket or private inventory access.
- Both languages/themes at 360/768/1280px; keyboard and screen-reader checks;
  44px targets, visible focus, correct link/button nesting and no overflow.
- Loading/empty/error/retry states and unavailable images tested without invented
  profile data, zero counts or ratings.
- Backend tests/build, targeted real-database integration, frontend tests/lint/
  type-check/build, and diff checks pass.

## 11. Release and rollback

Deploy additive database migration first, compatible backend second, frontend last.
Regenerate Prisma and test with two real test accounts and a signed-out browser.
Do not reset the development or production database. New fields do not require
users to recreate accounts or change existing listings.

If the UI must be rolled back, leave the additive relation/table in place so users'
follow data is retained. Remove schema additions only through the documented
rollback after disabling dependent application code. Do not drop unrelated data.

Completion means a buyer can reach a seller from a product, browse every eligible
listing, follow them, find them later in Following, and unfollow, while the existing
purchase/trade/report/giveaway/account flows continue to behave as defined.
