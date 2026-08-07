import { getMyItems } from "@/lib/api/fixtures";

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
  const items = await getMyItems();
  return <InventoryScreen items={items} />;
}
