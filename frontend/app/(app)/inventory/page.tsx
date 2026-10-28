import { redirect } from "next/navigation";

import { getItemHistorySummaries, getMyItems } from "@/lib/api/items";
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

  const items = await getMyItems();

  // Transferred rows remain as read-only item history. Hiding them would make
  // the new sold/traded totals impossible to inspect from the inventory.

  const summaries = await getItemHistorySummaries(items);

  return <InventoryScreen items={items} summaries={summaries} />;
}
