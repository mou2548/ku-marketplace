import type { ProductMode } from "@/lib/marketplace-products";

/**
 * Marketplace posts — proposal §3.1.
 *
 * A post is the *offer to the world*: price and exchange terms live here, not
 * on the item (§2.1). One post always binds exactly one item — §3.1 rules out
 * bundling several items into a single post.
 *
 * `ProductMode` is reused rather than redefined: the feed's buy/swap/both is
 * the same three-way choice as §3.1.1–3.1.3, and a second vocabulary for it
 * would drift the moment someone edits one of the two.
 */
export type PostMode = ProductMode;

export const POST_MODE_LABELS: Record<PostMode, { th: string; en: string }> = {
  buy: { th: "ขายอย่างเดียว", en: "Sell only" }, // §3.1.1 — buy-now button only
  swap: { th: "แลกเปลี่ยนอย่างเดียว", en: "Swap only" }, // §3.1.2 — offer button only
  both: { th: "เปิดทั้งสองทางเลือก", en: "Sell or swap" }, // §3.1.3 — both buttons
};

export interface Post {
  id: string;
  itemId: string;
  ownerId: string;
  mode: PostMode;
  /** Required for `buy` and `both`; must be absent for `swap` (§3.1.2). */
  price?: number;
  /** Free-text wants shown on the detail page. Only meaningful for swap/both. */
  wants: string[];
  createdAt: string;
  /** Withdrawn posts send the item back to `unlisted` (§2.3.2). */
  withdrawnAt?: string;
}

/** §3.1 — a price is exactly as valid as the mode says it is. */
export function isPostShapeValid(post: Post): boolean {
  if (post.mode === "swap") return post.price === undefined;
  return typeof post.price === "number" && post.price > 0;
}

/** §8 revenue 1.1 — free accounts post 5 at a time, members 20. */
export const POST_QUOTA = { free: 5, member: 20 } as const;

export function remainingPostQuota(
  activePostCount: number,
  isMember: boolean
): number {
  return Math.max(0, (isMember ? POST_QUOTA.member : POST_QUOTA.free) - activePostCount);
}

// TODO: replace with the real posts from the API
export const POSTS: Post[] = [
  {
    id: "post-1",
    itemId: "item-1",
    ownerId: "user-me",
    mode: "both",
    price: 650,
    wants: ["Casio fx-991EX", "Engineering textbooks"],
    createdAt: "2026-08-01T09:12:00+07:00",
  },
  {
    id: "post-2",
    itemId: "item-2",
    ownerId: "user-me",
    mode: "buy",
    price: 7200,
    wants: [],
    createdAt: "2026-08-03T18:40:00+07:00",
  },
];

export function getPostByItemId(itemId: string): Post | undefined {
  return POSTS.find((post) => post.itemId === itemId && !post.withdrawnAt);
}
