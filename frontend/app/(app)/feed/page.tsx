import { postCardImageUrl } from "@/components/kit/post-card";
import { listPosts } from "@/lib/api/posts";
import { cardRatios } from "@/lib/image-ratio";
import { parseFeedParams, type RawSearchParams } from "@/lib/feed-filters";

import { MarketFeed } from "../market-feed";

export const metadata = { title: "Market - KU Marketplace" };

/**
 * Reads real listings now (`GET /posts`), so it cannot be prerendered once at
 * build time — a post made after the build would never appear, and a `next
 * build` without the backend reachable would fail outright.
 */
export const dynamic = "force-dynamic";

/** The product feed shown immediately after authentication. */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [posts, params] = await Promise.all([listPosts(), searchParams]);

  // Each card's photo ratio, known before paint so the masonry can reserve
  // the box and pack by real heights (retest R05). Cached per URL; a slow or
  // unreadable photo falls back to 4:5.
  const ratios = await cardRatios(posts.map(postCardImageUrl));
  const imageRatios = Object.fromEntries(
    posts.map((post, index) => [post.post_id, ratios[index]]),
  );

  // Filtering itself is client-side over the full list, but the *initial* state
  // is read here so a shared link renders filtered on the server rather than
  // flashing the unfiltered feed and correcting itself after hydration.
  const { filters, sort } = parseFeedParams(params);

  return (
    <div className="flex flex-col gap-5">
      <MarketFeed
        posts={posts}
        imageRatios={imageRatios}
        initialFilters={filters}
        initialSort={sort}
      />
    </div>
  );
}
