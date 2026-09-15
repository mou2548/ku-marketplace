import { redirect } from "next/navigation";

import { getItemHistorySummary, getMyItems } from "@/lib/api/items";
import { listPosts } from "@/lib/api/posts";
import { getAccessToken } from "@/lib/api/session";

import { InventoryScreen } from "./inventory-screen";

/**
 * E5 — "my stuff".
 *
 * Research risk R9: no other marketplace makes you add an item to a personal
 * inventory before listing it, so students will not intuit the concept. The
 * fix is framing, not explanation — this is a **possession**, not a draft. The
 * page is named for what you own, and listing is an action performed on a
 * thing you already have.
 *
 * Persona P2 clears twelve items in a weekend, so bulk is the design: select
 * many, list many.
 */
export const metadata = { title: "My inventory - KU Marketplace" };

export default async function InventoryPage() {
  if (!(await getAccessToken())) {
    redirect("/login");
  }

  const [allItems, posts] = await Promise.all([getMyItems(), listPosts()]);

  // Transferred rows remain as read-only item history. Hiding them would make
  // the new sold/traded totals impossible to inspect from the inventory.
  const items = allItems;

  /**
   * Flow 1 moves an item Unlisted → Listed when a post is created. The badge
   * used to read `item.status` alone, which can disagree with the market it is
   * standing next to; the screen sees the posts as well and derives the state
   * from them.
   */
  const listedItemIds = posts.map((p) => p.item_id);
  const summaries = Object.fromEntries(
    await Promise.all(
      items.map(async (item) => [
        item.item_id,
        await getItemHistorySummary(item.item_id).catch(() => undefined),
      ] as const),
    ),
  );

  return (
    <InventoryScreen
      items={items}
      listedItemIds={listedItemIds}
      summaries={summaries}
    />
  );
}
