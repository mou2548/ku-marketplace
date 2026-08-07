import { RoomList } from "@/components/kit/room-list";
import { getRoomSummaries } from "@/lib/api/rooms-query";

export const metadata = { title: "Chat - KU Marketplace" };

/**
 * The inbox on its own. On desktop a room renders this list beside itself, so
 * this route is what a phone sees first and what a desktop user lands on before
 * picking a conversation.
 */
export default async function ChatInboxPage() {
  const rooms = await getRoomSummaries();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
        Chat
      </h1>
      <RoomList rooms={rooms} />
    </div>
  );
}
