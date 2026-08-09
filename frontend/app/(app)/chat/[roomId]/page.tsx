import { notFound } from "next/navigation";

import { RoomList } from "@/components/kit/room-list";
import { VIEWER_ID } from "@/lib/api/fixtures";
import { getRoomDetail, getRoomSummaries } from "@/lib/api/rooms-query";

import { RoomScreen } from "./room-screen";

/**
 * One room, whatever it is attached to.
 *
 * `Chat_Room` keys on `room_id` and leaves both `transaction_id` and
 * `giveaway_id` nullable, so a sale, a trade, and a giveaway are the same
 * object. This route follows that: one implementation, one URL, and
 * `/history/[txId]` redirects here rather than rendering a second copy.
 */
export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const rooms = await getRoomSummaries();
  const detail = await getRoomDetail(Number(roomId), rooms);
  if (!detail) notFound();

  return (
    <div className="flex gap-6">
      {/* The inbox stays visible beside the room on desktop, the way every
          messaging app people already use behaves. */}
      <aside className="hidden w-80 shrink-0 xl:block">
        <RoomList rooms={rooms} activeRoomId={detail.summary.room_id} />
      </aside>

      <div className="min-w-0 flex-1">
        <RoomScreen
          summary={detail.summary}
          viewerId={VIEWER_ID}
          transaction={detail.transaction}
          giveaway={detail.giveaway}
          appointment={detail.appointment}
          entrants={detail.entrants}
          messages={detail.messages}
        />
      </div>
    </div>
  );
}
