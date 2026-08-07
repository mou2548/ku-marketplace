import { ActionStrip } from "@/components/kit/action-strip";
import { PostFab } from "@/components/kit/post-fab";
import {
  getOffers,
  getPosts,
  getTransactions,
  VIEWER_ID,
} from "@/lib/api/fixtures";
import { buildInbox } from "@/lib/inbox";

import { MarketFeed } from "./market-feed";

/**
 * Home is the marketplace.
 *
 * Revised 2026-08-07. The first build made `/` a task inbox (decision D2) and
 * put the feed on `/market`. Two problems showed up the moment it was on
 * screen: opening the product landed on a wall of admin rows before a single
 * item, and Home and Market were two routes doing overlapping jobs.
 *
 * The research finding behind D2 was right — R4 and persona P2 both need one
 * place that answers "what is waiting on me" — but it did not deserve the whole
 * page. It is a collapsible strip above the feed now, and it disappears when
 * there is nothing waiting.
 */
export default async function HomePage() {
  const [posts, transactions, offers] = await Promise.all([
    getPosts(),
    getTransactions(),
    getOffers(),
  ]);

  const inbox = buildInbox(transactions, offers, VIEWER_ID);

  return (
    <div className="flex flex-col gap-5">
      <ActionStrip entries={inbox.yours} />
      <MarketFeed posts={posts} />
      <PostFab />
    </div>
  );
}
