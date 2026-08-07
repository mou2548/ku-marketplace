import { notFound } from "next/navigation";

import { getMyItems } from "@/lib/api/fixtures";

import { ItemForm } from "../../item-form";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const items = await getMyItems();
  const item = items.find((i) => i.item_id === Number(itemId));
  if (!item) notFound();

  return <ItemForm mode="edit" item={item} />;
}
