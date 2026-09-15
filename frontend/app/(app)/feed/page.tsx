import { listPosts } from "@/lib/api/posts";

import { MarketFeed } from "../market-feed";

/**
 * Reads real listings now (`GET /posts`), so it cannot be prerendered once at
 * build time — a post made after the build would never appear, and a `next
 * build` without the backend reachable would fail outright.
 */
export const dynamic = "force-dynamic";

/** The product feed shown immediately after authentication. */
export default async function FeedPage() {
  const posts = await listPosts();

  return (
    <div className="flex flex-col gap-5">
      <MarketFeed posts={posts} />
    </div>
  );
}
