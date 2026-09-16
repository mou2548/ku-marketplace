import { listPosts } from "@/lib/api/posts";
import { parseFeedParams, type RawSearchParams } from "@/lib/feed-filters";

import { MarketFeed } from "../market-feed";

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

  // Filtering itself is client-side over the full list, but the *initial* state
  // is read here so a shared link renders filtered on the server rather than
  // flashing the unfiltered feed and correcting itself after hydration.
  const { filters, sort } = parseFeedParams(params);

  return (
    <div className="flex flex-col gap-5">
      <MarketFeed posts={posts} initialFilters={filters} initialSort={sort} />
    </div>
  );
}
