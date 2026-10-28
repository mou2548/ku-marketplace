import { notFound, redirect } from "next/navigation";

import { getItemHistorySummary, getMyItems } from "@/lib/api/items";
import { getPost } from "@/lib/api/posts";
import { getAccessToken } from "@/lib/api/session";

import { OfferComposer } from "./offer-composer";

/**
 * E4 — composing a trade offer. The screen the brief asked to feel like a game
 * inventory: tap items in your own stash to place them on the table.
 */
export default async function NewOfferPage({
  searchParams,
}: {
  searchParams: Promise<{ post?: string }>;
}) {
  const { post: postParam } = await searchParams;
  const token = await getAccessToken();
  if (!token) redirect("/login");

  const post = postParam
    ? await getPost(Number(postParam), { token }).catch(() => undefined)
    : undefined;
  if (!post) notFound();

  const items = await getMyItems({ token });
  // Same per-item summary the inventory and /post read, so the stash marks
  // the same items unavailable those screens do (lib/item-availability.ts).
  const summaries = Object.fromEntries(
    await Promise.all(
      items.map(async (item) => [
        item.item_id,
        await getItemHistorySummary(item.item_id).catch(() => undefined),
      ] as const),
    ),
  );
  return <OfferComposer post={post} inventory={items} summaries={summaries} />;
}
