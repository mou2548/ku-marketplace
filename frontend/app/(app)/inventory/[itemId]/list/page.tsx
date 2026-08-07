import { notFound } from "next/navigation";

import { getMyItems } from "@/lib/api/fixtures";

import { ListItemForm } from "./list-form";

/**
 * E5 — put an owned item on the market.
 *
 * Separate from the item form on purpose (schema §2.4): an item is a thing you
 * own, a post is the terms you are offering it under. The same item can go up
 * for sale this month and for trade the next, so the terms cannot live on the
 * item.
 */
export default async function ListItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const items = await getMyItems();
  const item = items.find((i) => i.item_id === Number(itemId));
  if (!item) notFound();

  return <ListItemForm item={item} />;
}
