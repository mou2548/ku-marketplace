import { getMyItems } from "@/lib/api/items";
import { listPosts } from "@/lib/api/posts";

import { PostComposer } from "./post-composer";

export const metadata = { title: "Post something - KU Marketplace" };

/**
 * What "Post" means.
 *
 * The button used to open a blank capture form, which is wrong for the common
 * case: most of the time you already own the thing and are deciding to put it
 * on the market. Sending an owner to an empty form asks them to type an item
 * they have already typed.
 *
 * Then the first fix only got halfway — it listed your items but bounced you
 * into a second screen to actually publish. So this is one page: pick what you
 * own, set the terms, publish, done.
 *
 * Giveaways arrive here for the same reason. `/giveaway/new` was a third form
 * that ignored the inventory entirely; `?type=giveaway` now opens this screen
 * with that kind preselected. Read on the server, so no client hook and no
 * Suspense boundary is needed for a query string.
 */
export default async function PostPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ type }, items, posts] = await Promise.all([
    searchParams,
    getMyItems(),
    listPosts(),
  ]);
  const listedItemIds = new Set(posts.map((p) => p.item_id));

  return (
    <PostComposer
      items={items.filter((i) => i.status !== "Transferred")}
      listedItemIds={[...listedItemIds]}
      initialKind={type === "giveaway" ? "Giveaway" : "SellOnly"}
    />
  );
}
