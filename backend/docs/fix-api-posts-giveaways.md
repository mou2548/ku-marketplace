# fix_api: Post and Giveaway on schema v3

Branch `fix_api` starts from `origin/develop` and merges
`origin/feature/refactor-database`. The database models and migrations are from
the database branch. Prisma uses `prisma-client-js` to preserve the existing
backend's `@prisma/client` imports; this changes code generation, not the tables.

## API changes

- Giveaway creation requires `item_id`; names come from `Item.name`. An old
  `item_name` request property is ignored and never stored. Responses still
  contain `item_name` for existing frontend callers.
- Registration checks only live tickets (`Registered`, `Waiting`, `Received`).
  Historical tickets remain intact; a receiver may register again while the
  giveaway is Active. A Closed giveaway remains closed.
- Queue numbers use the highest historical queue plus one under the existing
  giveaway row lock. Capacity counts only live tickets. Public participant counts
  also retain unselected entrants, so an oversubscribed draw is not presented as
  guaranteed for everyone; forfeited and expired history is excluded.
- Active giveaways reserve their full capacity until registration closes, so
  repeated forfeits/re-registration cannot release stock into another listing.
  This required an update to the shared availability helper used by both APIs.
- Manual allocation reminders read the item name through the relation.
- TradeOnly posts may omit `price` or send `null`. SellOnly/Both require a price,
  including when changing listing type. Reads preserve a nullable price.
- Buying snapshots `price × quantity` into `Transaction.total_amount` with
  decimal arithmetic. Accepting an offer snapshots `additional_money` (zero for
  a pure trade). Both responses include `total_amount`.
- Post descriptions, wanted-item text, giveaway descriptions/locations/images,
  and giveaway chat text validate the new varchar limits before writing.
  Monetary input and purchase totals are bounded by decimal(10,2).

## Validation

From `backend`:

```sh
npm ci
npm run typecheck:posts-giveaways
npm run test:posts-giveaways
npx prisma validate
```

The focused typecheck includes controllers, services, tests, their imported
dependencies, and the giveaway concurrency integration test. Unit tests use
mocked database clients; they do not establish database integration correctness.

The updated concurrency test covers both the last available place and concurrent
re-registration with ticket history and the v3 partial unique index. Run against
a disposable PostgreSQL database that permits creating isolated schemas:

```sh
npm run test:e2e -- --runInBand giveaways-concurrency
```

It was not executed here: no `DATABASE_URL` is configured and the local Docker
daemon is unavailable. No database migrations were applied. Use the project's
Node 20.19+ environment (below 21); this machine currently has Node 24.

## Remaining migration work outside this scope

The full `npm run build` currently reports 101 type errors in the unchanged
appointment, item, membership and transaction services. These still use removed
Transaction columns, assume integer subscription payment amounts, or rely on an
Item.quantity default removed by v3. There are no build errors in the adapted
Post/Giveaway code. The full backend is therefore not ready to build/deploy until
those modules are migrated. Other integration fixtures also need updating before
running the entire e2e suite against v3.
