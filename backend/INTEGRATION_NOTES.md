# Integration notes — 2026-09-02/03

What was done to bring the redesigned frontend onto the real backend, on the
`develop` branch. **Not pushed.** 25 commits ahead of `origin/develop`
(`git log origin/develop..develop`).

The flow source of truth is now `frontend/docs/activity diagram.pdf`.

---

## 1. Branch merge

Nine branches merged into `develop`, in this order (`--no-ff`):

1. `origin/frontend-main`
2. `origin/frontend/(backend)--Authentication-&-Identity-Management`
3. `origin/frontend/(backend)--User-Inventory-System`
4. `origin/frontend/(backend)--Posts`
5. `origin/frontend/(backend)--Transactions`
6. `origin/frontend/(backend)--Membership-(Revenue)`
7. `origin/frontend/(backend)--Report-And-Moderation`
8. `origin/frontend/(backend)--Chat-And-Image-System` (came in free with 7)
9. `origin/frontend/(backend)--Giveaway-Allocation-System` (came in free with 7)

Each `frontend/(backend)--*` branch carried its own slice of `backend/` plus an
independent rewrite of `init.sql`, so the merges conflicted heavily in
`init.sql`, `backend/src/**` and the shared frontend auth/account files.
Conflicts were resolved per file at merge time.

---

## 2. Bug fixes

| Commit | Fix |
|---|---|
| `474ab82` | `frontend/lib/api/client.ts` — reconcile the `apiFetch` call style (`RequestInit` vs options object) that the merge left inconsistent; frontend build was failing with ~42 errors. |
| `3c16626` | `init.sql` — add the missing `Post.deleted_at` column (see §4). `GET /posts` was throwing `PrismaClientKnownRequestError: The column Post.deleted_at does not exist`. |

---

## 3. Backend changes

### 3.1 `GET /posts` and `GET /posts/:id` enriched — `54d6a1d`

`backend/src/posts/posts.service.ts`:

- `serializePost()` now emits, **in addition to** the existing flat fields
  (`item_name`, `description`, `price`, `quantity_available`, …):
  - a nested **`item`** object: `item_id`, `owner_id`, `name`, `quantity`,
    `category`, `condition`, `description`, `status`, `course_name`,
    `brand_model`, `warranty_expiry`, `size`, `images[]`
  - a **`seller`** summary: `{ user_id, name, isVerified: true }`
    (`isVerified` is hard-coded true — every account is a verified `@ku.th`
    address and the schema has no separate flag; `faculty`/`year` are not in
    the schema, so they are omitted)
  - `quantity_remaining` alias alongside `quantity_available`
- The post lookups in `findAllPosts`, `getPostById`, `buyPost` and
  `createOffer` gained
  `include: { item: { include: { images: { where: { status: 'Active' }, orderBy: { displayOrder: 'asc' } }, owner: { select: { userId, firstNameEn, lastNameEn } } } } }`.
- Backward compatible: callers that only read the flat fields (inventory,
  post composer, close-account) are unaffected.

### 3.2 New `GET /offers` — `be223b9`

- New `backend/src/posts/offers.controller.ts` (`@Controller('offers')`,
  `@Get()` guarded by `JwtAuthGuard`).
- New `posts.service` method returning **every offer the signed-in user
  proposed or received**, with the full join (post, item, proposer,
  proposed items) and the `transaction_id` once the offer has been accepted.
  There was previously no way to list a user's offers across posts — only
  `GET /posts/:id/offers` per post.
- `backend/src/posts/posts.module.ts` registers the new controller.

### 3.3 Trade is meetup-only — `d17e052`

Per the activity diagram, a swap is always handed over in person; there is no
shipping branch for a trade.

- `posts.service.acceptOffer()` ignores `payload.delivery_method` and always
  creates the transaction with `deliveryMethod = 'Meetup'`.
- (Frontend: the Meetup/Shipping radio is gone from the accept overlay; the
  accepted panel reads "handed over in person".)

### 3.4 Merge conflict resolution in `backend/src/main.ts` — `c1aadfc`

CORS + listen port reconciled. The server listens on `process.env.PORT`
(see §5).

### 3.5 Not changed

- **No notifications endpoint or table.** The notifications screen derives its
  log client-side (see §4 frontend / `bd50aab`).
- No `GET /users/:id` (public profile). The feed shows the seller inline from
  the `seller` summary in §3.1.
- No `Pending_refund` / `Refunded` transaction states, no 7-day post-Completed
  refund window, no return-goods QR. The activity diagram has these; the code
  does not. Left as-is (flagged, not implemented).

---

## 4. Database

- `init.sql` gained `Post.deleted_at TIMESTAMP` (`3c16626`). `schema.prisma`
  already declared it (`Post.deletedAt`) and `posts.service` filters
  `where: { deletedAt: null }`; the merged `init.sql` came from the
  domain-branch lineage, which forked before soft-delete landed on `develop`.
  Verified by diffing `schema.prisma` against a live `prisma db pull` —
  `Post.deleted_at` was the only column the code expected and the DB lacked.
- The local dev database was dropped and recreated from the merged `init.sql`
  once, because the running container still held the pre-merge schema
  (`Item.quantity` etc. missing).

---

## 5. Local run setup

| File | Added |
|---|---|
| `backend/.env` | `PORT=4000` |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:4000`, `API_URL=http://localhost:4000` |

- Backend on `:4000`, frontend on `:3000`, Postgres + Redis via
  `docker compose up -d postgres redis`.
- Frontend SSR reads a `session` cookie whose value is the access token
  (`lib/api/session.ts`). The dev login server action still sets a stub
  cookie; a real end-to-end sign-in goes through `/auth/register` →
  `/auth/otp/verify` → token.
- `POST /uploads/image` uses the Cloudinary credentials already in
  `backend/.env`.

---

## 6. Frontend — every screen now on the real API

`lib/api/fixtures.ts` (1601 lines of mock rows) was **deleted** (`0c6c320`);
nothing imported it any more.

### Group A — clean import swaps (`2df2317` … `96868eb`)

inventory (3 pages), history (3), giveaway browse, account + close-account,
admin shell, the `(app)` nav shell, post composer. Pattern: swap
`@/lib/api/fixtures` → `@/lib/api/{items,transactions,giveaways,users,membership,posts}`;
viewer id from the session token; lists with no bulk endpoint (my tickets, my
offers) rebuilt with a bounded N+1, the same tradeoff `lib/api/rooms-query.ts`
already makes.

### Group B — the screens the API could not feed

| Commit | Screen | How |
|---|---|---|
| `54d6a1d` | feed (`/`) + market detail (`/market/[postId]`) | backend §3.1 + `lib/api/posts.ts` `toPost()` adapter mapping the wire post to the rich `Post` type with numeric ids |
| `be223b9` | offer inbox (`/offers`, `/offers/[offerId]`, `/offers/new`) | backend §3.2 + `lib/api/offers.ts` `getMyOffers()`; accepted-offer "Open chat" now links `/history/:transaction_id` |
| `bd50aab` | notifications (`/notifications`) | no backend change — `lib/api/notifications.ts` `getNotifications()` derives the log each load from `/offers` + `/transactions` + `/reports` + `/appeals` + giveaway tickets; "read" is a heuristic (terminal state ⇒ read) |
| `e8c3671` | — | `Membership` / `MembershipTier` types moved from `fixtures.ts` into `lib/api/membership.ts` |

`next.config.ts` image `remotePatterns` trimmed to `r2.ku-market.com` (seed
placeholder, does not resolve) and `res.cloudinary.com` (real uploads).

---

## 7. Add-item / add-image → database

Confirmed end to end. `item-form.tsx` `save()` uploads each photo `File` via
`POST /uploads/image` (Cloudinary), then `POST /items` with
`images: [{ image_url, is_primary, display_order }]`. `items.service.create()`
does a nested Prisma write — one `Item` row plus one `Item_Image` row per
photo (`status: 'Active'`). Live test: creating an item with two images wrote
`Item` id 22 and `Item_Image` ids 8 + 9. Edit uses the same path; delete is a
soft delete (`deleted_at`).

---

## 8. Verification

- `tsc --noEmit` clean (frontend and backend) after every commit.
- `next build` exit 0.
- Manual smoke against the live stack: register → OTP → token → `/users/me`,
  `/membership/status`, `/transactions`, `POST /items` (+ images, DB-verified),
  `/posts` (enriched shape), `/offers` (both directions), `/giveaways/1`,
  buy flow (`POST /posts/:id/buy` → `/history` → redirect to `/chat` room →
  `/history/:id/qr`), admin queues with a real admin user, non-admin redirect,
  signed-out shell does not crash.

---

## 9. Still open

- Group B notifications has no persistence — no unread state survives a
  reload beyond the terminal-state heuristic.
- Refund / return flow does not match the activity diagram (no dedicated
  states, no timers, no return QR).
- Seed image URLs (`r2.ku-market.com/...`) do not resolve, so seeded items
  render a broken image; real uploads are fine.
- Nothing pushed to `origin`.
