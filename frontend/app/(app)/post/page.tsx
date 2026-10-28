import { getItemHistorySummaries, getMyItems } from "@/lib/api/items";
import { getMe } from "@/lib/api/users";

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
 *
 * `?item=1,2,3` preselects items — used by the inventory screen's "Select"
 * bulk action (multiple ids) and by the listing form's "Give away" option,
 * which hands off a single already-chosen item rather than asking the owner
 * to find it again in the picker.
 */
export default async function PostPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; item?: string }>;
}) {
  const [{ type, item: itemParam }, items, me] = await Promise.all([
    searchParams,
    getMyItems(),
    // Only decides whether to show the PromptPay notice; the API has the
    // final say, so a failed lookup leaves the form as it was.
    getMe().catch(() => undefined),
  ]);
  const initialPicked = (itemParam ?? "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);

  const summaries = await getItemHistorySummaries(items);

  // The composer reads free units through lib/item-availability.ts, which
  // also honours `item_status` Transferred: a traded-away item still reports
  // every unit available in its summary, and must not show as listable.
  return (
    <PostComposer
      items={items}
      summaries={summaries}
      initialKind={type === "giveaway" ? "Giveaway" : "SellOnly"}
      initialPicked={initialPicked}
      hasPromptPay={me ? !!me.promptpayId : true}
    />
  );
}
