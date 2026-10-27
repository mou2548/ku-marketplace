import { notFound, redirect } from "next/navigation";

import { getMyItems } from "@/lib/api/items";
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
  return <OfferComposer post={post} inventory={items} />;
}
