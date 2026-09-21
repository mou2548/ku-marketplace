"use client";

import { formatDate } from "@/lib/date-format";


import { getCopy } from "@/lib/copy";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";

import type { RoomKind, RoomSortMode, RoomSummary } from "@/lib/rooms";
import { ROOM_KIND_TONE, sortRooms } from "@/lib/rooms";
import { fetchRoomSummaries } from "@/lib/actions/chat";
import {
  getChatActivitySnapshot,
  getServerChatActivitySnapshot,
  parseActivity,
  subscribeChatActivity,
} from "@/lib/chat-activity";
import { ENTRANT_STATUS, TICKET_STATUS, TRANSACTION_STATUS } from "@/lib/status";
import { usePolling } from "@/lib/use-polling";
import { cn } from "@/lib/utils";

import { SelectField, SelectOption } from "./choice";
import { EmptyState } from "./empty-state";
import { PostImage } from "./post-image";
import { SearchField } from "./search-field";
import { StatusBadge } from "./status-badge";
import { TabList, Tabs, UnderlineTab } from "./tabs";
import { TONE_DOT, TONE_TEXT } from "./tone";

/** The list is lighter to keep fresh than an open thread, so it polls slower
 * than the room's own 5s. Enough that a reply surfaces without a reload. */
const ROOM_LIST_POLL_INTERVAL_MS = 10000;

const SORT_MODES: RoomSortMode[] = ["recent", "name", "counterparty"];

const READ_MARKERS_KEY = "ku-marketplace:chat-read-at";
const READ_MARKERS_EVENT = "ku-marketplace:chat-read-at-change";

function parseReadMarkers(value: string): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

function subscribeToReadMarkers(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === READ_MARKERS_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(READ_MARKERS_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(READ_MARKERS_EVENT, onStoreChange);
  };
}

function getReadMarkersSnapshot() {
  return localStorage.getItem(READ_MARKERS_KEY) ?? "{}";
}

function getServerReadMarkersSnapshot() {
  return "{}";
}

function markRoomRead(roomId: number) {
  const markers = parseReadMarkers(getReadMarkersSnapshot());
  markers[String(roomId)] = Date.now();
  localStorage.setItem(READ_MARKERS_KEY, JSON.stringify(markers));
  window.dispatchEvent(new Event(READ_MARKERS_EVENT));
}

/**
 * One inbox for every conversation.
 *
 * A sale, a trade, and a giveaway are the same object in the schema — a
 * `Chat_Room` with a nullable transaction and a nullable giveaway — and the
 * review asked for them to be the same thing to the student too. Splitting them
 * across three screens would have meant three places to check for a reply.
 *
 * Each row leads with the item, because one counterparty can share several
 * transactions with the viewer. The person remains searchable and appears in
 * the supporting line.
 */
export function RoomList({
  rooms,
  activeRoomId,
  viewerId,
  heading,
  className,
}: {
  rooms: RoomSummary[];
  activeRoomId?: number;
  viewerId: number;
  /** Rendered as the column's own top edge. Omitted beside an open room. */
  heading?: string;
  className?: string;
}) {
  const t = getCopy();
  const [filter, setFilter] = useState<"all" | RoomKind>("all");
  const [sort, setSort] = useState<RoomSortMode>("recent");
  const [query, setQuery] = useState("");

  // The list arrives sorted from the server, but the inbox has to stay live: no
  // realtime transport exists (lib/use-polling.ts), so it polls the same action
  // the server render used and re-sorts, which floats the latest reply up. The
  // server value is the base — a navigation that re-renders with fresh props
  // must win over a stale poll, hence the resync on prop identity.
  const [liveRooms, setLiveRooms] = useState(rooms);
  // Resync to the server value when a re-render brings a fresh one (a
  // navigation), the recommended "reset state on prop change" pattern — done
  // during render, not in an effect. A poll in between still wins until then.
  const [serverRooms, setServerRooms] = useState(rooms);
  if (rooms !== serverRooms) {
    setServerRooms(rooms);
    setLiveRooms(rooms);
  }
  usePolling(() => {
    fetchRoomSummaries(viewerId).then(setLiveRooms).catch(() => {});
  }, ROOM_LIST_POLL_INTERVAL_MS);

  const readMarkersSnapshot = useSyncExternalStore(
    subscribeToReadMarkers,
    getReadMarkersSnapshot,
    getServerReadMarkersSnapshot,
  );
  const readMarkers = useMemo(
    () => parseReadMarkers(readMarkersSnapshot),
    [readMarkersSnapshot],
  );
  const activitySnapshot = useSyncExternalStore(
    subscribeChatActivity,
    getChatActivitySnapshot,
    getServerChatActivitySnapshot,
  );

  useEffect(() => {
    if (activeRoomId !== undefined) markRoomRead(activeRoomId);
  }, [activeRoomId]);

  // A room the viewer just acted in floats to the top at once, not on the next
  // poll: `markRoomActive` stamps it (lib/chat-activity.ts) and here that stamp
  // overrides `lastActivityAt` whenever it is newer, so recency-based sorting
  // lifts it immediately. The poll then replaces it with the server-derived
  // value. It deliberately does not touch `lastMessageAt`, which the row
  // renders as the preview's timestamp: approving a slip moves the
  // conversation, but it did not send a message, and the row must not claim
  // otherwise.
  const activity = useMemo(
    () => parseActivity(activitySnapshot),
    [activitySnapshot],
  );
  const withActivity = useMemo(
    () =>
      liveRooms.map((room) => {
        const stamped = activity[String(room.room_id)];
        if (!stamped) return room;
        const value = room.lastActivityAt ?? room.lastMessageAt;
        const current = value ? Date.parse(value) : 0;
        return stamped > current
          ? { ...room, lastActivityAt: new Date(stamped).toISOString() }
          : room;
      }),
    [liveRooms, activity],
  );
  const ordered = useMemo(
    () => sortRooms(withActivity, sort),
    [withActivity, sort],
  );
  const byKind =
    filter === "all" ? ordered : ordered.filter((r) => r.kind === filter);
  const q = query.trim().toLowerCase();
  const shown = q
    ? byKind.filter(
        (r) =>
          r.subject.toLowerCase().includes(q) ||
          r.counterparty.name.toLowerCase().includes(q),
      )
    : byKind;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {/* The column's own header. It stays put while the list scrolls under
          it — a list whose filters scroll away is a list you cannot refilter
          without going back to the top. */}
      <div className="shrink-0 border-b border-line px-4 pt-4">
        {heading ? (
          <div className="mb-4">
            <p className="text-overline font-semibold text-ink-brand uppercase">
              {t("chat.inbox")}
            </p>
            <h1 className="mt-1 text-h1">{heading}</h1>
          </div>
        ) : null}

        <SearchField
          value={query}
          onChange={setQuery}
          label={t("chat.searchConversations")}
          placeholder={t("chat.search")}
          className="mb-3"
        />

        {/* Filter tabs and the sort control share one bar: the tabs grow and
            scroll on a narrow screen, the sort select keeps its width on the
            right so it never gets pushed off. */}
        <div className="mb-3 flex items-end gap-3">
          <Tabs
            selectedKey={filter}
            onSelectionChange={(k) => setFilter(k as "all" | RoomKind)}
            className="min-w-0 flex-1"
          >
            {/* Fixed, non-scrolling bar: the four tabs share the width evenly
                (flex-1) and the row never scrolls sideways, so it stays put
                instead of sliding on a narrow column. */}
            <TabList
              aria-label={t("chat.conversationType")}
              variant="underline"
              className="w-full gap-1 overflow-x-clip"
            >
              {(["all", "Sale", "Trade", "Giveaway"] as const).map((id) => (
                <UnderlineTab
                  key={id}
                  id={id}
                  className="flex-1 justify-center whitespace-nowrap px-1 text-caption"
                >
                  {id === "all" ? t("history.all") : t(`chat.${id.toLowerCase()}`)}
                </UnderlineTab>
              ))}
            </TabList>
          </Tabs>

          <SelectField
            aria-label={t("chat.sortBy")}
            selectedKey={sort}
            onSelectionChange={(k) => setSort(k as RoomSortMode)}
            size="sm"
            className="w-[4.5rem] shrink-0"
          >
            {SORT_MODES.map((mode) => (
              <SelectOption key={mode} id={mode}>
                {t(`chat.sort_${mode}`)}
              </SelectOption>
            ))}
          </SelectField>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="p-3">
          <EmptyState
            icon={<MessagesSquare className="size-6" />}
            title={q ? t("chat.noMatches") : t("chat.noConversations")}
            description={
              q
                ? t("chat.noMatchingConversation", { query: query.trim() })
                : t("chat.emptyBody")
            }
          />
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {shown.map((room) => (
            <li key={room.room_id}>
              <RoomRow
                room={room}
                isActive={room.room_id === activeRoomId}
                isUnread={
                  room.room_id !== activeRoomId &&
                  room.lastMessageSenderId !== viewerId &&
                  !!room.lastMessageAt &&
                  Date.parse(room.lastMessageAt) >
                    (readMarkers[String(room.room_id)] ?? 0)
                }
                onOpen={() => markRoomRead(room.room_id)}
              />
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
  isUnread,
  onOpen,
}: {
  room: RoomSummary;
  isActive: boolean;
  isUnread: boolean;
  onOpen: () => void;
}) {
  const t = getCopy();
  const tone = ROOM_KIND_TONE[room.kind];
  const status = room.transaction
    ? TRANSACTION_STATUS[room.transaction.status]
    : room.giveawayTicketStatus === "Expired"
      ? ENTRANT_STATUS.Expired
      : room.giveawayTicketStatus
        ? TICKET_STATUS[room.giveawayTicketStatus]
        : undefined;
  return (
    <Link
      href={room.href}
      aria-current={isActive ? "page" : undefined}
      onClick={onOpen}
      className={cn(
        "group relative flex min-h-[4.75rem] items-start gap-3 overflow-hidden rounded-control py-3 pr-3 pl-4 transition-colors duration-[--dur-fast]",
        isActive
          ? "bg-brand-subtle/70"
          : "hover:bg-gray-100",
      )}
    >
      {isActive ? (
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-1 rounded-r-pill bg-brand"
        />
      ) : null}

      <span
        className={cn(
          "block size-12 shrink-0 overflow-hidden rounded-slot bg-surface-sunken transition-[opacity,filter] duration-[--dur-fast]",
          !isActive && !isUnread && "opacity-65 saturate-50",
        )}
      >
        <PostImage
          src={room.subjectImage}
          alt=""
          aspectRatio={1}
          sizes="48px"
        />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-body",
              isActive || isUnread
                ? "font-semibold text-ink"
                : "font-medium text-ink-secondary",
            )}
          >
            {room.subject}
          </span>
          {room.lastMessageAt ? (
            <time
              dateTime={room.lastMessageAt}
              className={cn(
                "shrink-0 text-meta",
                isUnread
                  ? "font-semibold text-tone-info-fg"
                  : "text-ink-muted",
              )}
            >
              {formatDate(new Date(room.lastMessageAt))}
            </time>
          ) : null}
          {isUnread ? (
            <span
              aria-label="Unread conversation"
              className="size-2.5 shrink-0 rounded-full bg-tone-info-solid ring-2 ring-surface"
            />
          ) : null}
        </span>

        {/* Person and room kind support the item identity. A dot + coloured
            label stays light enough for a dense list. */}
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "min-w-0 truncate text-meta",
              isActive || isUnread ? "text-ink-muted" : "text-ink-disabled",
            )}
          >
            {room.counterparty.name}
          </span>
          <span aria-hidden className="text-meta text-ink-muted">·</span>
          <span className="flex shrink-0 items-center gap-1">
            <span
              aria-hidden
              className={cn("size-1.5 rounded-full", TONE_DOT[ROOM_KIND_TONE[room.kind]])}
            />
            <span
              className={cn(
                "text-meta font-semibold",
                TONE_TEXT[tone],
              )}
            >
              {t(`chat.${room.kind.toLowerCase()}`)}
            </span>
          </span>
        </span>

        {room.lastMessage ? (
          <span
            className={cn(
              "truncate text-caption",
              isUnread
                ? "font-medium text-ink-secondary"
                : "text-ink-muted",
            )}
          >
            {room.lastMessage}
          </span>
        ) : null}

        {status || room.needsYou ? (
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {status ? <StatusBadge status={status} size="sm" /> : null}
            {room.needsYou ? (
              <span className="inline-flex h-6 items-center rounded-pill border border-brand-subtle-hover bg-brand-subtle px-2 text-meta font-medium text-ink-brand">
                {t("chat.yourTurn")}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
