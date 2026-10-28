import { notFound, redirect } from "next/navigation";

import { getRoomSummaries } from "@/lib/api/rooms-query";
import { getCurrentUserId } from "@/lib/api/session";
import { getTransaction } from "@/lib/api/transactions";

export const metadata = { title: "Deal - KU Marketplace" };

/**
 * A deal and its chat room are the same conversation, so there is one screen
 * for them and it lives at `/chat/[roomId]`. This route stays because it was
 * the URL before the rooms were unified, and because `/history` links to a
 * transaction id rather than a room id.
 *
 * There is no "list my chat rooms" endpoint, so the room id is recovered the
 * same way the inbox builds itself (`rooms-query.ts`): from the viewer's
 * transactions, each read for its chat state.
 */
export default async function DealPage({
  params,
}: {
  params: Promise<{ txId: string }>;
}) {
  const { txId } = await params;
  const viewerId = await getCurrentUserId();
  if (!viewerId) redirect("/login");

  const tx = await getTransaction(Number(txId)).catch(() => undefined);
  if (!tx) notFound();

  const rooms = await getRoomSummaries(viewerId);
  const room = rooms.find(
    (r) => r.transaction?.transaction_id === tx.transaction_id,
  );
  if (!room) notFound();

  redirect(`/chat/${room.room_id}`);
}
