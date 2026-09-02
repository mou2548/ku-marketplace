import { notFound } from "next/navigation";

import { getMyItems } from "@/lib/api/items";
import { getPost } from "@/lib/api/posts";

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
  const post = postParam
    ? await getPost(Number(postParam)).catch(() => undefined)
    : undefined;
  if (!post) notFound();

  const items = await getMyItems();
  return <OfferComposer post={post} inventory={items} />;
}
