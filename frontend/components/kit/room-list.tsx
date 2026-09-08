"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";

import type { RoomKind, RoomSummary } from "@/lib/rooms";
import { ROOM_KIND_TONE } from "@/lib/rooms";
import { ENTRANT_STATUS, TICKET_STATUS, TRANSACTION_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

import { EmptyState } from "./empty-state";
import { PostImage } from "./post-image";
import { SearchField } from "./search-field";
import { StatusBadge } from "./status-badge";
import { TabList, Tabs, UnderlineTab } from "./tabs";
import { TONE_DOT, TONE_TEXT } from "./tone";

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
  const t = useTranslations();
  const [filter, setFilter] = useState<"all" | RoomKind>("all");
  const [query, setQuery] = useState("");
  const readMarkersSnapshot = useSyncExternalStore(
    subscribeToReadMarkers,
    getReadMarkersSnapshot,
    getServerReadMarkersSnapshot,
  );
  const readMarkers = useMemo(
    () => parseReadMarkers(readMarkersSnapshot),
    [readMarkersSnapshot],
  );

  useEffect(() => {
    if (activeRoomId !== undefined) markRoomRead(activeRoomId);
  }, [activeRoomId]);

  const byKind = filter === "all" ? rooms : rooms.filter((r) => r.kind === filter);
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

        <Tabs
          selectedKey={filter}
          onSelectionChange={(k) => setFilter(k as "all" | RoomKind)}
        >
          <TabList aria-label={t("chat.conversationType")} variant="underline">
            <UnderlineTab id="all">{t("history.all")}</UnderlineTab>
            <UnderlineTab id="Sale">{t("chat.sale")}</UnderlineTab>
            <UnderlineTab id="Trade">{t("chat.trade")}</UnderlineTab>
            <UnderlineTab id="Giveaway">{t("chat.giveaway")}</UnderlineTab>
          </TabList>
        </Tabs>
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
  const t = useTranslations();
  const locale = useLocale();
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
              {new Date(room.lastMessageAt).toLocaleDateString(
                locale === "th" ? "th-TH" : "en-GB",
                {
                day: "numeric",
                month: "short",
                },
              )}
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
