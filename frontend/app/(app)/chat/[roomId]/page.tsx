import { notFound, redirect } from "next/navigation";

import { RoomList } from "@/components/kit/room-list";
import { getRoomDetail, getRoomSummaries } from "@/lib/api/rooms-query";
import { getAccessToken } from "@/lib/api/session";
import { getMe } from "@/lib/api/users";

import { RoomScreen } from "./room-screen";

/**
 * One room, whatever it is attached to.
 *
 * `Chat_Room` keys on `room_id` and leaves both `transaction_id` and
 * `giveaway_id` nullable, so a sale, a trade, and a giveaway are the same
 * object. This route follows that: one implementation, one URL, and
 * `/history/[txId]` redirects here rather than rendering a second copy.
 *
 * The inbox is built from real transactions/giveaways now (`rooms-query.ts`),
 * so it needs to know who is actually asking — same `redirect("/login")`
 * pattern as `account/page.tsx`.
 */
export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  if (!(await getAccessToken())) redirect("/login");
  const viewer = await getMe().catch(() => undefined);
  if (!viewer) redirect("/login");

  const { roomId } = await params;
  const rooms = await getRoomSummaries(viewer.userId);
  const detail = await getRoomDetail(Number(roomId), viewer.userId, rooms);
  if (!detail) notFound();

  return (
    <div className="flex h-full min-h-0">
      {/* The inbox stays visible beside the room on desktop, the way every
          messaging app people already use behaves. One divider between the two
          columns, no gutter and no card — the room is the surface. */}
      <aside className="hidden h-full w-80 shrink-0 border-r border-line xl:block xl:w-96">
        <RoomList
          rooms={rooms}
          activeRoomId={detail.summary.room_id}
          viewerId={viewer.userId}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1">
        <RoomScreen
          key={detail.summary.room_id}
          summary={detail.summary}
          viewerId={viewer.userId}
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
