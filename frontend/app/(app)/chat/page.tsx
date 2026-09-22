import { redirect } from "next/navigation";

import { RoomList } from "@/components/kit/room-list";
import { EmptyState } from "@/components/kit/empty-state";
import { MessagesSquare } from "lucide-react";
import { getCopy } from "@/lib/copy";

import { getRoomDetail, getRoomSummaries } from "@/lib/api/rooms-query";
import { getAccessToken } from "@/lib/api/session";
import { getMe } from "@/lib/api/users";

import { RoomScreen } from "./[roomId]/room-screen";

export const metadata = { title: "Chat - KU Marketplace" };

/**
 * The inbox, and — on a wide screen — the conversation it is pointing at.
 *
 * This used to be a `max-w-2xl` list and nothing else, which measured 47% of a
 * 1440px window with the rest empty. A messaging app on a laptop shows the list
 * beside a thread, so it does: the room that opens is the first in
 * `buildRooms`' order, which sorts rooms waiting on the viewer ahead of
 * everything else and then by recency — "the one waiting on me, otherwise the
 * latest".
 *
 * Below `xl` it stays the plain list. That is the same breakpoint
 * `/chat/[roomId]` uses to show or hide the list beside a room, and on a phone
 * the inbox has to be the thing you land on.
 *
 * Built from real transactions/giveaways now (`rooms-query.ts`), so — same as
 * `/chat/[roomId]` — it needs to know who is actually asking.
 */
export default async function ChatInboxPage() {
  const t = await getCopy();
  if (!(await getAccessToken())) redirect("/login");
  const viewer = await getMe().catch(() => undefined);
  if (!viewer) redirect("/login");

  const rooms = await getRoomSummaries(viewer.userId);
  const first = rooms[0]
    ? await getRoomDetail(rooms[0].room_id, viewer.userId, rooms)
    : undefined;

  if (rooms.length === 0) {
    return (
      <EmptyState
        icon={<MessagesSquare className="size-6" />}
        title={t("chat.noConversations")}
        description={t("chat.emptyBody")}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex h-full w-full min-w-0 flex-col xl:w-96 xl:shrink-0 xl:border-r xl:border-line">
        <RoomList
          rooms={rooms}
          activeRoomId={first?.summary.room_id}
          viewerId={viewer.userId}
          heading={t("nav.chat")}
        />
      </div>

      {/* The preview, not a second route: opening a room from the list still
          navigates to /chat/[roomId], which renders exactly this. */}
      {first ? (
        <div className="hidden min-h-0 min-w-0 flex-1 xl:flex">
          <RoomScreen
            key={first.summary.room_id}
            summary={first.summary}
            viewerId={viewer.userId}
            transaction={first.transaction}
            giveaway={first.giveaway}
            appointment={first.appointment}
            appointmentCards={first.appointmentCards}
            entrants={first.entrants}
            messages={first.messages}
          />
        </div>
      ) : null}
    </div>
  );
}
