import { getMyItems, getPosts } from "@/lib/api/fixtures";

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
  const [allItems, posts] = await Promise.all([getMyItems(), getPosts()]);

  /**
   * The third state never belongs on this screen. `Transferred` means the item
   * has been handed to a buyer and is not the viewer's any more — it stayed
   * here only because a transfer never reassigns `owner_id`, so a thing they
   * had given away still sat in the grid and counted toward the item total.
   *
   * The inventory is now exactly the two states DatabaseSchema.pdf §2.2 names
   * for something you still own: Unlisted and Listed. What left is in /history.
   */
  const items = allItems.filter((i) => i.status !== "Transferred");

  /**
   * Flow 1 moves an item Unlisted → Listed when a post is created. The badge
   * used to read `item.status` alone, which can disagree with the market it is
   * standing next to; the screen sees the posts as well and derives the state
   * from them.
   */
  const listedItemIds = posts.map((p) => p.item_id);

  return <InventoryScreen items={items} listedItemIds={listedItemIds} />;
}
