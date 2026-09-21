/**
 * Everything the market feed does to a list of posts before it renders one:
 * the filter predicate, the sort comparators, and the URL round-trip that makes
 * a filtered feed a shareable link.
 *
 * It lives in `lib/` rather than beside the screen (CLAUDE.md §8: domain logic
 * is not JSX) mostly so it can be tested without a DOM — every rule in here has
 * a silent failure mode, and `tests/market-sort.test.mjs` pins them.
 */

import type { ItemCategory, Post } from "@/lib/api/types";
import type { ItemCondition } from "@/lib/status";

export type Segment = "all" | "sell" | "trade";

export const SEGMENTS: Array<{ id: Segment; labelKey: string }> = [
  { id: "all", labelKey: "feed.all" },
  { id: "sell", labelKey: "feed.sale" },
  { id: "trade", labelKey: "feed.trade" },
];

export const CONDITIONS: ItemCondition[] = ["New", "Good", "Acceptable", "Poor"];

export type SortKey =
  | "newest"
  | "oldest"
  | "priceAsc"
  | "priceDesc"
  | "nameAsc"
  | "nameDesc";

/**
 * Both directions of all three keys, flat. A key picker plus a separate
 * direction toggle is two taps for something people do in one, and the labels
 * ("Price, low to high") say the whole thing anyway.
 *
 * `newest` is first because it is the default — it is the order the backend
 * already sends (`findAllPosts` orders by `createdAt desc`), so the initial
 * render is not a re-sort of what arrived.
 */
export const SORTS: Array<{ id: SortKey; labelKey: string }> = [
  { id: "newest", labelKey: "feed.sortNewest" },
  { id: "oldest", labelKey: "feed.sortOldest" },
  { id: "priceAsc", labelKey: "feed.sortPriceAsc" },
  { id: "priceDesc", labelKey: "feed.sortPriceDesc" },
  { id: "nameAsc", labelKey: "feed.sortNameAsc" },
  { id: "nameDesc", labelKey: "feed.sortNameDesc" },
];

export interface FeedFilters {
  segment: Segment;
  query: string;
  categories: Set<ItemCategory>;
  conditions: Set<ItemCondition>;
  /** Inclusive, in baht. `null` means the bound is not set. */
  minPrice: number | null;
  maxPrice: number | null;
  inStockOnly: boolean;
  verifiedOnly: boolean;
}

export const EMPTY_FILTERS: FeedFilters = {
  segment: "all",
  query: "",
  categories: new Set(),
  conditions: new Set(),
  minPrice: null,
  maxPrice: null,
  inStockOnly: false,
  verifiedOnly: false,
};

/** A fresh object every call — `EMPTY_FILTERS` holds Sets, which are mutable. */
export function emptyFilters(): FeedFilters {
  return {
    ...EMPTY_FILTERS,
    categories: new Set(),
    conditions: new Set(),
  };
}

export function hasPriceBound(filters: FeedFilters) {
  return filters.minPrice !== null || filters.maxPrice !== null;
}

/**
 * How many filters the user has actually set. Drives the badge on the filter
 * button, so a price range counts once whether one bound is set or both — it is
 * one decision on screen.
 */
export function activeFilterCount(filters: FeedFilters) {
  return (
    filters.categories.size +
    filters.conditions.size +
    (filters.segment === "all" ? 0 : 1) +
    (filters.query.trim() ? 1 : 0) +
    (hasPriceBound(filters) ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0)
  );
}

export function filterPosts(posts: Post[], filters: FeedFilters) {
  const q = filters.query.trim().toLowerCase();
  const byPrice = hasPriceBound(filters);

  return posts.filter((post) => {
    if (filters.segment === "sell" && post.post_type === "TradeOnly") return false;
    if (filters.segment === "trade" && post.post_type === "SellOnly") return false;

    if (filters.categories.size > 0 && !filters.categories.has(post.item.category)) {
      return false;
    }
    if (filters.conditions.size > 0 && !filters.conditions.has(post.item.condition)) {
      return false;
    }

    if (byPrice) {
      // A TradeOnly post is not for sale at any price — its `price` column is 0
      // only because the schema makes it non-null. Asking for "under 100 baht"
      // and being handed every trade listing on campus is the same bug the
      // price sort has to dodge, so the answer is the same: it is not a price.
      if (post.post_type === "TradeOnly") return false;
      if (filters.minPrice !== null && post.price < filters.minPrice) return false;
      if (filters.maxPrice !== null && post.price > filters.maxPrice) return false;
    }

    if (filters.inStockOnly && post.quantity_remaining <= 0) return false;
    if (filters.verifiedOnly && !post.seller.isVerified) return false;

    if (!q) return true;

    return Boolean(
      post.item.course_name?.toLowerCase().includes(q) ||
        post.item.name.toLowerCase().includes(q) ||
        post.description?.toLowerCase().includes(q) ||
        post.wanted_item_offer?.toLowerCase().includes(q),
    );
  });
}

/**
 * Thai cannot be sorted by code point. A leading vowel (เ แ โ ใ ไ) is written
 * before the consonant it is pronounced after, and its code point outranks
 * every consonant — so `<` files เกม after สมุด, while Thai files it under ก,
 * first. Built once at module scope: constructing a Collator costs far more
 * than the comparison it performs.
 */
const NAME_COLLATOR = new Intl.Collator("th", {
  numeric: true,
  sensitivity: "base",
});

/**
 * `created_at` is `""` whenever the backend omitted it (see `toPost` in
 * lib/api/posts.ts). `Date.parse("")` is NaN, and a comparator that returns NaN
 * leaves the array in an arbitrary order rather than failing loudly — so undated
 * posts are pinned to epoch and land at the old end.
 */
function postTime(post: Post) {
  const parsed = Date.parse(post.created_at);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Every branch falls back to `post_id` so equal keys keep a stable order:
 * Array.prototype.sort is stable, but the *input* here is a fresh filter result,
 * and without the tiebreak two same-priced cards can swap places on a rerender.
 */
export function sortPosts(posts: Post[], sort: SortKey) {
  const sorted = [...posts];

  switch (sort) {
    case "oldest":
      return sorted.sort(
        (a, b) => postTime(a) - postTime(b) || a.post_id - b.post_id,
      );

    case "priceAsc":
    case "priceDesc": {
      const direction = sort === "priceAsc" ? 1 : -1;

      return sorted.sort((a, b) => {
        // Same reasoning as the price filter above: 0 is the absence of a
        // price, not the cheapest one.
        const aTrade = a.post_type === "TradeOnly";
        const bTrade = b.post_type === "TradeOnly";
        if (aTrade !== bTrade) return aTrade ? 1 : -1;
        if (aTrade) return a.post_id - b.post_id;

        return (a.price - b.price) * direction || a.post_id - b.post_id;
      });
    }

    case "nameAsc":
    case "nameDesc": {
      const direction = sort === "nameAsc" ? 1 : -1;

      return sorted.sort(
        (a, b) =>
          NAME_COLLATOR.compare(a.item.name, b.item.name) * direction ||
          a.post_id - b.post_id,
      );
    }

    case "newest":
    default:
      return sorted.sort(
        (a, b) => postTime(b) - postTime(a) || b.post_id - a.post_id,
      );
  }
}

/* ------------------------------------------------------------ URL round-trip */

/**
 * The feed's whole state fits in the query string, which is what makes "here,
 * look at this" a link rather than a list of instructions. Reading it back has
 * to survive anything a person can type into an address bar, so every parse
 * falls back to the default rather than throwing.
 */
export const FILTER_PARAMS = {
  query: "q",
  segment: "type",
  categories: "cat",
  conditions: "cond",
  minPrice: "min",
  maxPrice: "max",
  inStockOnly: "stock",
  verifiedOnly: "verified",
  sort: "sort",
} as const;

/** What a Server Component gets in `searchParams`. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function one(params: RawSearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** `"a,b"` and repeated `?cat=a&cat=b` both work; blanks are dropped. */
function list(params: RawSearchParams, key: string) {
  const value = params[key];
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Non-negative integers only. A price of "-5" or "abc" is no bound at all. */
function price(params: RawSearchParams, key: string) {
  const raw = one(params, key);
  if (raw === undefined || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

export function parseFeedParams(params: RawSearchParams): {
  filters: FeedFilters;
  sort: SortKey;
} {
  const segment = one(params, FILTER_PARAMS.segment);
  const sort = one(params, FILTER_PARAMS.sort);
  const conditions = new Set(
    list(params, FILTER_PARAMS.conditions).filter((c): c is ItemCondition =>
      (CONDITIONS as string[]).includes(c),
    ),
  );

  let minPrice = price(params, FILTER_PARAMS.minPrice);
  let maxPrice = price(params, FILTER_PARAMS.maxPrice);
  // A reversed range matches nothing and reads as a typo rather than a choice.
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return {
    filters: {
      segment: segment === "sell" || segment === "trade" ? segment : "all",
      query: one(params, FILTER_PARAMS.query) ?? "",
      // Categories stay an open string on purpose (see lib/categories.ts), so
      // there is no list to validate against — an unknown one simply matches
      // nothing, which is the honest outcome.
      categories: new Set(list(params, FILTER_PARAMS.categories)),
      conditions,
      minPrice,
      maxPrice,
      inStockOnly: one(params, FILTER_PARAMS.inStockOnly) === "1",
      verifiedOnly: one(params, FILTER_PARAMS.verifiedOnly) === "1",
    },
    sort: SORTS.some((s) => s.id === sort) ? (sort as SortKey) : "newest",
  };
}

/** Defaults are omitted, so an untouched feed has a bare URL. */
export function feedParamsToString(filters: FeedFilters, sort: SortKey) {
  const params = new URLSearchParams();
  const query = filters.query.trim();

  if (query) params.set(FILTER_PARAMS.query, query);
  if (filters.segment !== "all") params.set(FILTER_PARAMS.segment, filters.segment);
  if (filters.categories.size > 0) {
    params.set(FILTER_PARAMS.categories, [...filters.categories].join(","));
  }
  if (filters.conditions.size > 0) {
    params.set(FILTER_PARAMS.conditions, [...filters.conditions].join(","));
  }
  if (filters.minPrice !== null) {
    params.set(FILTER_PARAMS.minPrice, String(filters.minPrice));
  }
  if (filters.maxPrice !== null) {
    params.set(FILTER_PARAMS.maxPrice, String(filters.maxPrice));
  }
  if (filters.inStockOnly) params.set(FILTER_PARAMS.inStockOnly, "1");
  if (filters.verifiedOnly) params.set(FILTER_PARAMS.verifiedOnly, "1");
  if (sort !== "newest") params.set(FILTER_PARAMS.sort, sort);

  return params.toString();
}
