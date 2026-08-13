import { ItemForm } from "../item-form";

/**
 * E5 — add an item to the inventory.
 *
 * Kept deliberately short: photos, name, category, condition, quantity,
 * description. Price and exchange terms are *not* here — they live on the post
 * (schema §2.4), because the same item can go up under different terms each
 * time. Asking for a price at capture time would force a decision the student
 * has not made yet, which is exactly what makes bulk capture (persona P2) slow.
 */
export const metadata = { title: "Add an item - KU Marketplace" };

export default function NewItemPage() {
  return <ItemForm mode="create" />;
}
