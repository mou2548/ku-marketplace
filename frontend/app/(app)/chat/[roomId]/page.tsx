import { notFound } from "next/navigation";

import { RoomList } from "@/components/kit/room-list";
import {
  getGiveaway,
  getRoom,
  getRoomMessages,
  getTransaction,
  VIEWER_ID,
} from "@/lib/api/fixtures";
import { getRoomSummaries } from "@/lib/api/rooms-query";

import { RoomScreen } from "./room-screen";

/**
 * One room, whatever it is attached to.
 *
 * `Chat_Room` keys on `room_id` and leaves both `transaction_id` and
 * `giveaway_id` nullable, so a sale, a trade, and a giveaway are the same
 * object. This route follows that: one implementation, one URL, and
 * `/deals/[txId]` redirects here rather than rendering a second copy.
 */
export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const room = await getRoom(Number(roomId));
  if (!room) notFound();

  const [rooms, messages] = await Promise.all([
    getRoomSummaries(),
    getRoomMessages(room.room_id),
  ]);

  const summary = rooms.find((r) => r.room_id === room.room_id);
  if (!summary) notFound();

  const transaction = room.transaction_id
    ? await getTransaction(room.transaction_id)
    : undefined;
  const giveaway = room.giveaway_id
    ? await getGiveaway(room.giveaway_id)
    : undefined;

  return (
    <div className="flex gap-6">
      {/* The inbox stays visible beside the room on desktop, the way every
          messaging app people already use behaves. */}
      <aside className="hidden w-80 shrink-0 xl:block">
        <RoomList rooms={rooms} activeRoomId={room.room_id} />
      </aside>

      <div className="min-w-0 flex-1">
        <RoomScreen
          summary={summary}
          viewerId={VIEWER_ID}
          transaction={transaction}
          giveaway={giveaway}
          messages={messages.map((m) => ({
            message_id: m.message_id,
            sender_id: m.sender_id,
            content: m.content,
            created_at: m.created_at,
          }))}
        />
      </div>
    </div>
  );
}
