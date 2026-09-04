import { listPosts } from "@/lib/api/posts";

import { MarketFeed } from "./market-feed";

/**
 * Reads real listings now (`GET /posts`), so it cannot be prerendered once at
 * build time — a post made after the build would never appear, and a `next
 * build` without the backend reachable would fail outright.
 */
export const dynamic = "force-dynamic";

/**
 * Home is the marketplace. Nothing else.
 *
 * Revised 2026-08-07. The first build made `/` a task inbox (decision D2) and
 * put the feed on `/market`; that landed the product on a wall of admin rows
 * before a single item, so the inbox became a strip above the feed instead.
 *
 * The strip is gone too. A full-bleed green banner was the loudest thing above
 * the fold on the page whose whole job is to show items, and "what is waiting
 * on me" is already answered in four other places that the student is looking
 * at anyway: the nav badges on Offers and History, the "Your turn" chip on
 * every affected row in `/history` and in the chat inbox, and `/notifications`.
 * R4 and persona P2 are served without spending the top of the feed on it.
 */
export default async function HomePage() {
  const posts = await listPosts();

  return (
    <div className="flex flex-col gap-5">
      <MarketFeed posts={posts} />
    </div>
  );
}
