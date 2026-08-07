import { notFound, redirect } from "next/navigation";

import { getRooms, getTransaction } from "@/lib/api/fixtures";

/**
 * A deal and its chat room are the same conversation, so there is one screen
 * for them and it lives at `/chat/[roomId]`. This route stays because it was
 * the URL before the rooms were unified, and because `/deals` links to a
 * transaction id rather than a room id.
 */
export default async function DealPage({
  params,
}: {
  params: Promise<{ txId: string }>;
}) {
  const { txId } = await params;
  const tx = await getTransaction(Number(txId));
  if (!tx) notFound();

  const rooms = await getRooms();
  const room = rooms.find((r) => r.transaction_id === tx.transaction_id);
  if (!room) notFound();

  redirect(`/chat/${room.room_id}`);
}
