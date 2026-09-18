import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

/**
 * Covers the feed's filter predicate, its sort comparators, and the URL round
 * trip. All three are worth pinning because their failure modes are silent:
 * Thai collated by code point looks merely "odd", a NaN date leaves the array
 * in an arbitrary order rather than throwing, a TradeOnly post's price of 0
 * reads as the cheapest thing on campus, and a query string typed by hand can
 * say anything at all.
 */
function loadFeedFilters() {
  const file = new URL('../lib/feed-filters.ts', import.meta.url);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const exports = {};
  vm.runInNewContext(code, { exports, Intl, Date, Number, URLSearchParams, Math });
  return exports;
}

const {
  sortPosts,
  filterPosts,
  emptyFilters,
  activeFilterCount,
  parseFeedParams,
  feedParamsToString,
} = loadFeedFilters();

const withFilters = (overrides = {}) => ({ ...emptyFilters(), ...overrides });



function post(id, overrides = {}) {
  const {
    name = `item ${id}`,
    created_at = '2026-01-01T00:00:00Z',
    category = 'Books',
    condition = 'Good',
    course_name = null,
    isVerified = true,
    ...rest
  } = overrides;

  return {
    post_id: id,
    item_id: id,
    post_type: 'SellOnly',
    price: 100,
    quantity_remaining: 1,
    description: null,
    wanted_item_offer: null,
    created_at,
    item: { name, category, condition, course_name },
    seller: { name: 'Seller', isVerified },
    ...rest,
  };
}

// Array.from, not .map: the sorted array is built inside the vm realm, so its
// prototype is not this realm's Array.prototype and deepEqual would reject it.
const ids = (posts) => Array.from(posts, (p) => p.post_id);

test('newest and oldest are exact reverses on distinct dates', () => {
  const posts = [
    post(1, { created_at: '2026-01-02T00:00:00Z' }),
    post(2, { created_at: '2026-01-03T00:00:00Z' }),
    post(3, { created_at: '2026-01-01T00:00:00Z' }),
  ];

  assert.deepEqual(ids(sortPosts(posts, 'newest')), [2, 1, 3]);
  assert.deepEqual(ids(sortPosts(posts, 'oldest')), [3, 1, 2]);
});

test('a post with no created_at sorts as oldest instead of scrambling the list', () => {
  const posts = [
    post(1, { created_at: '' }),
    post(2, { created_at: '2026-01-01T00:00:00Z' }),
    post(3, { created_at: '2026-01-02T00:00:00Z' }),
  ];

  assert.deepEqual(ids(sortPosts(posts, 'newest')), [3, 2, 1]);
  assert.deepEqual(ids(sortPosts(posts, 'oldest')), [1, 2, 3]);
});

test('sortPosts does not mutate its input', () => {
  const posts = [post(1), post(2, { price: 5 })];
  sortPosts(posts, 'priceAsc');

  assert.deepEqual(ids(posts), [1, 2]);
});

test('price sorts both ways', () => {
  const posts = [post(1, { price: 300 }), post(2, { price: 50 }), post(3, { price: 120 })];

  assert.deepEqual(ids(sortPosts(posts, 'priceAsc')), [2, 3, 1]);
  assert.deepEqual(ids(sortPosts(posts, 'priceDesc')), [1, 3, 2]);
});

test('TradeOnly posts stay at the end of a price sort in both directions', () => {
  // Their price column is 0 because it is non-null in the schema, not because
  // they are cheap — sorting that as a real price buries every item for sale.
  const posts = [
    post(1, { price: 300 }),
    post(2, { price: 0, post_type: 'TradeOnly' }),
    post(3, { price: 50 }),
    post(4, { price: 0, post_type: 'TradeOnly' }),
  ];

  assert.deepEqual(ids(sortPosts(posts, 'priceAsc')), [3, 1, 2, 4]);
  assert.deepEqual(ids(sortPosts(posts, 'priceDesc')), [1, 3, 2, 4]);
});

test('Thai names order by collation, not by code point', () => {
  // เกม is filed under its consonant ก, ahead of ปากกา and สมุด. A raw string
  // comparison files it under its leading vowel เ (U+0E40), which outranks
  // every consonant — so code-point order dumps it last instead of first.
  const posts = [
    post(1, { name: 'เกม' }),
    post(2, { name: 'ปากกา' }),
    post(3, { name: 'สมุด' }),
  ];

  assert.deepEqual(ids(sortPosts(posts, 'nameAsc')), [1, 2, 3]);
  assert.deepEqual(ids(sortPosts(posts, 'nameDesc')), [3, 2, 1]);
  assert.ok('เกม' > 'สมุด', 'code-point order would have agreed, proving nothing');
});

test('equal keys fall back to post_id so the order cannot shuffle between renders', () => {
  const same = { created_at: '2026-01-01T00:00:00Z', price: 100, name: 'same' };
  const posts = [post(3, same), post(1, same), post(2, same)];

  assert.deepEqual(ids(sortPosts(posts, 'priceAsc')), [1, 2, 3]);
  assert.deepEqual(ids(sortPosts(posts, 'nameAsc')), [1, 2, 3]);
  assert.deepEqual(ids(sortPosts(posts, 'newest')), [3, 2, 1]);
  assert.deepEqual(ids(sortPosts(posts, 'oldest')), [1, 2, 3]);
});

/* --------------------------------------------------------------- filtering */

test('a price bound drops TradeOnly posts instead of treating 0 as cheap', () => {
  const posts = [
    post(1, { price: 40 }),
    post(2, { price: 0, post_type: 'TradeOnly' }),
    post(3, { price: 900 }),
  ];

  assert.deepEqual(ids(filterPosts(posts, withFilters({ maxPrice: 100 }))), [1]);
  assert.deepEqual(ids(filterPosts(posts, withFilters({ minPrice: 0 }))), [1, 3]);
  // No bound set: trades are ordinary listings again.
  assert.deepEqual(ids(filterPosts(posts, withFilters())), [1, 2, 3]);
});

test('price bounds are inclusive at both ends', () => {
  const posts = [post(1, { price: 99 }), post(2, { price: 100 }), post(3, { price: 101 })];

  assert.deepEqual(
    ids(filterPosts(posts, withFilters({ minPrice: 100, maxPrice: 100 }))),
    [2],
  );
});

test('in-stock and verified-seller filters', () => {
  const posts = [
    post(1, { quantity_remaining: 0 }),
    post(2, { quantity_remaining: 2, isVerified: false }),
    post(3, { quantity_remaining: 1 }),
  ];

  assert.deepEqual(ids(filterPosts(posts, withFilters({ inStockOnly: true }))), [2, 3]);
  assert.deepEqual(ids(filterPosts(posts, withFilters({ verifiedOnly: true }))), [1, 3]);
});

test('category and condition filters are OR inside a facet, AND across facets', () => {
  const posts = [
    post(1, { category: 'Books', condition: 'New' }),
    post(2, { category: 'Bags', condition: 'New' }),
    post(3, { category: 'Books', condition: 'Poor' }),
  ];

  assert.deepEqual(
    ids(filterPosts(posts, withFilters({ categories: new Set(['Books', 'Bags']) }))),
    [1, 2, 3],
  );
  assert.deepEqual(
    ids(
      filterPosts(
        posts,
        withFilters({ categories: new Set(['Books']), conditions: new Set(['New']) }),
      ),
    ),
    [1],
  );
});

test('search matches course code as well as name, because P1 searches by course', () => {
  const posts = [
    post(1, { name: 'Calculus notes', course_name: '01417111' }),
    post(2, { name: 'Desk lamp' }),
  ];

  assert.deepEqual(ids(filterPosts(posts, withFilters({ query: ' 01417 ' }))), [1]);
  assert.deepEqual(ids(filterPosts(posts, withFilters({ query: 'LAMP' }))), [2]);
});

test('activeFilterCount counts a price range once, however many bounds are set', () => {
  assert.equal(activeFilterCount(withFilters()), 0);
  assert.equal(activeFilterCount(withFilters({ minPrice: 10 })), 1);
  assert.equal(activeFilterCount(withFilters({ minPrice: 10, maxPrice: 20 })), 1);
  assert.equal(activeFilterCount(withFilters({ query: '   ' })), 0);
  assert.equal(
    activeFilterCount(
      withFilters({ segment: 'sell', conditions: new Set(['New']), verifiedOnly: true }),
    ),
    3,
  );
});

/* ------------------------------------------------------------- URL round trip */

test('filters survive a round trip through the query string', () => {
  const filters = withFilters({
    segment: 'trade',
    query: 'notes',
    categories: new Set(['Books', 'Bags']),
    conditions: new Set(['New', 'Poor']),
    minPrice: 50,
    maxPrice: 500,
    inStockOnly: true,
    verifiedOnly: true,
  });

  const parsed = parseFeedParams(
    Object.fromEntries(new URLSearchParams(feedParamsToString(filters, 'priceAsc'))),
  );

  assert.equal(parsed.sort, 'priceAsc');
  assert.equal(parsed.filters.segment, 'trade');
  assert.equal(parsed.filters.query, 'notes');
  assert.deepEqual([...parsed.filters.categories], ['Books', 'Bags']);
  assert.deepEqual([...parsed.filters.conditions], ['New', 'Poor']);
  assert.equal(parsed.filters.minPrice, 50);
  assert.equal(parsed.filters.maxPrice, 500);
  assert.equal(parsed.filters.inStockOnly, true);
  assert.equal(parsed.filters.verifiedOnly, true);
});

test('an untouched feed serializes to an empty query string', () => {
  assert.equal(feedParamsToString(emptyFilters(), 'newest'), '');
});

test('junk in the query string falls back to defaults instead of throwing', () => {
  const { filters, sort } = parseFeedParams({
    type: 'sideways',
    sort: 'byVibes',
    cond: 'New,Pristine,Poor',
    min: 'abc',
    max: '-40',
    stock: 'yes',
  });

  assert.equal(sort, 'newest');
  assert.equal(filters.segment, 'all');
  assert.deepEqual([...filters.conditions], ['New', 'Poor']);
  assert.equal(filters.minPrice, null);
  assert.equal(filters.maxPrice, null);
  assert.equal(filters.inStockOnly, false, 'only "1" turns a flag on');
});

test('a reversed price range is read as a typo and swapped', () => {
  const { filters } = parseFeedParams({ min: '900', max: '100' });

  assert.equal(filters.minPrice, 100);
  assert.equal(filters.maxPrice, 900);
});

test('repeated params and comma lists both parse', () => {
  const { filters } = parseFeedParams({ cat: ['Books', 'Bags,Sports'] });

  assert.deepEqual([...filters.categories], ['Books', 'Bags', 'Sports']);
});

test('emptyFilters hands out fresh Sets, not shared ones', () => {
  const first = emptyFilters();
  first.categories.add('Books');

  assert.equal(emptyFilters().categories.size, 0);
});
