"use client";

import { useState } from "react";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";

import type { RoomKind, RoomSummary } from "@/lib/rooms";
import { ROOM_KIND_TONE } from "@/lib/rooms";
import { cn } from "@/lib/utils";

import { EmptyState } from "./empty-state";
import { SegmentTab, TabList, Tabs } from "./tabs";
import { TONE_WASH } from "./tone";

/**
 * One inbox for every conversation.
 *
 * A sale, a trade, and a giveaway are the same object in the schema — a
 * `Chat_Room` with a nullable transaction and a nullable giveaway — and the
 * review asked for them to be the same thing to the student too. Splitting them
 * across three screens would have meant three places to check for a reply.
 *
 * Each row leads with the person, because that is what people remember, and
 * says underneath where the conversation came from.
 */
export function RoomList({
  rooms,
  activeRoomId,
  className,
}: {
  rooms: RoomSummary[];
  activeRoomId?: number;
  className?: string;
}) {
  const [filter, setFilter] = useState<"all" | RoomKind>("all");
  const shown = filter === "all" ? rooms : rooms.filter((r) => r.kind === filter);

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <Tabs
        selectedKey={filter}
        onSelectionChange={(k) => setFilter(k as "all" | RoomKind)}
      >
        <TabList aria-label="Conversation type" variant="segment">
          <SegmentTab id="all">All</SegmentTab>
          <SegmentTab id="Sale">Sale</SegmentTab>
          <SegmentTab id="Trade">Trade</SegmentTab>
          <SegmentTab id="Giveaway">Giveaway</SegmentTab>
        </TabList>
      </Tabs>

      {shown.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare className="size-6" />}
          title="No conversations here"
          description="A room opens by itself when you buy something, when an offer is accepted, or when you win a giveaway."
        />
      ) : (
        <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto">
          {shown.map((room) => (
            <li key={room.room_id}>
              <RoomRow room={room} isActive={room.room_id === activeRoomId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoomRow({
  room,
  isActive,
}: {
  room: RoomSummary;
  isActive: boolean;
}) {
  return (
    <Link
      href={room.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-start gap-3 rounded-card p-3 transition-colors duration-[--dur-fast]",
        isActive ? "bg-brand-subtle" : "hover:bg-gray-100",
      )}
    >
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-pill bg-brand-subtle text-[0.8125rem] font-semibold text-ink-brand"
      >
        {room.counterparty.name.slice(0, 2)}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">
            {room.counterparty.name}
          </span>
          {room.lastMessageAt ? (
            <time
              dateTime={room.lastMessageAt}
              className="shrink-0 text-[0.75rem] text-ink-muted"
            >
              {new Date(room.lastMessageAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </time>
          ) : null}
        </span>

        {/* Where this conversation came from — the review asked for this to sit
            directly under the name. */}
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "shrink-0 rounded-chip px-1.5 py-0.5 text-[0.6875rem] font-semibold",
              TONE_WASH[ROOM_KIND_TONE[room.kind]],
            )}
          >
            {room.kind}
          </span>
          <span className="min-w-0 truncate text-[0.75rem] text-ink-muted">
            {room.subject}
          </span>
        </span>

        {room.lastMessage ? (
          <span className="truncate text-[0.8125rem] text-ink-muted">
            {room.lastMessage}
          </span>
        ) : null}

        {room.needsYou ? (
          <span className="mt-0.5 w-fit rounded-pill bg-tone-warning-bg px-2 py-0.5 text-[0.6875rem] font-semibold text-tone-warning-fg">
            Your turn
          </span>
        ) : null}
      </span>
    </Link>
  );
}
