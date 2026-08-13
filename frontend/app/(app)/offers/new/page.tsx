import { notFound } from "next/navigation";

import { getMyItems, getPost } from "@/lib/api/fixtures";

import { OfferComposer } from "./offer-composer";

/**
 * E4 — composing a trade offer. The screen the brief asked to feel like a game
 * inventory: drag items out of your own stash and onto the table.
 */
export default async function NewOfferPage({
  searchParams,
}: {
  searchParams: Promise<{ post?: string }>;
}) {
  const { post: postParam } = await searchParams;
  const post = postParam ? await getPost(Number(postParam)) : undefined;
  if (!post) notFound();

  const items = await getMyItems();
  return <OfferComposer post={post} inventory={items} />;
}
