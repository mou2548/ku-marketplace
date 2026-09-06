"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import { MessagesSquare, Search } from "lucide-react";

import type { RoomKind, RoomSummary } from "@/lib/rooms";
import { ROOM_KIND_TONE } from "@/lib/rooms";
import { cn } from "@/lib/utils";

import { EmptyState } from "./empty-state";
import { PostImage } from "./post-image";
import { TabList, Tabs, UnderlineTab } from "./tabs";
import {
  TONE_DOT,
  TONE_RAIL_LEFT,
  TONE_TEXT,
} from "./tone";

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
  heading,
  className,
}: {
  rooms: RoomSummary[];
  activeRoomId?: number;
  /** Rendered as the column's own top edge. Omitted beside an open room. */
  heading?: string;
  className?: string;
}) {
  const t = useTranslations();
  const [filter, setFilter] = useState<"all" | RoomKind>("all");
  const [query, setQuery] = useState("");

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

        <div className="relative mb-3">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("chat.searchConversations")}
            placeholder={t("chat.search")}
            className="h-10 w-full rounded-pill bg-surface-sunken pr-4 pl-10 text-body-sm shadow-sunken"
          />
        </div>

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
  const t = useTranslations();
  const locale = useLocale();
  const tone = ROOM_KIND_TONE[room.kind];
  return (
    <Link
      href={room.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-start gap-3 rounded-card border-l-2 border-transparent p-3 transition-colors duration-[--dur-fast]",
        isActive
          ? cn("bg-surface-sunken", TONE_RAIL_LEFT[tone])
          : "hover:bg-gray-100",
      )}
    >
      <span className="block size-12 shrink-0 overflow-hidden rounded-slot bg-surface-sunken">
        <PostImage
          src={room.subjectImage}
          alt=""
          aspectRatio={1}
          sizes="48px"
        />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-body font-semibold">
            {room.subject}
          </span>
          {room.lastMessageAt ? (
            <time
              dateTime={room.lastMessageAt}
              className="shrink-0 text-meta text-ink-muted"
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
        </span>

        {/* Person and room kind support the item identity. A dot + coloured
            label stays light enough for a dense list. */}
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-meta text-ink-muted">
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
          <span className="truncate text-caption text-ink-muted">
            {room.lastMessage}
          </span>
        ) : null}

        {/* One of these per room that needs you, down a scannable list —
            solid amber turned the list into a column of alarms. Brand, and a
            chip: "you are up" is not a warning. */}
        {room.needsYou ? (
          <span className="mt-0.5 w-fit rounded-pill border border-brand-subtle-hover bg-brand-subtle px-2 py-0.5 text-meta font-medium text-ink-brand">
            {t("chat.yourTurn")}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
