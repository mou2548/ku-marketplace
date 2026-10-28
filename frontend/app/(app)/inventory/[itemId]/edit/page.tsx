import { notFound, redirect } from "next/navigation";

import { getItem, getMyItems } from "@/lib/api/items";
import { getAccessToken } from "@/lib/api/session";

import { ItemForm } from "../../item-form";

export const metadata = { title: "Edit item - KU Marketplace" };

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  if (!(await getAccessToken())) {
    redirect("/login");
  }

  const { itemId } = await params;

  const [item, items] = await Promise.all([
    getItem(Number(itemId)).catch(() => undefined),
    getMyItems(),
  ]);
  if (!item || !items.some((i) => i.item_id === item.item_id)) notFound();

  return <ItemForm mode="edit" item={item} />;
}
