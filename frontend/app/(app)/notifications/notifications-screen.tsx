"use client";

import { formatDate } from "@/lib/date-format";


import { getCopy } from "@/lib/copy";
import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Gift, Handshake, ShieldAlert, Wallet } from "lucide-react";

import { EmptyState } from "@/components/kit/empty-state";
import type { Notification } from "@/lib/api/notifications";
import { BADGE_PAINT, BADGE_SHAPE } from "@/components/kit/tone";
import { cn } from "@/lib/utils";
import {
  NOTIFICATIONS_SEEN_EVENT,
  feedKey,
  parseSeen,
  readSeen,
  writeSeen,
} from "@/lib/notification-seen";
import { usePolling } from "@/lib/use-polling";

const ICON: Record<Notification["kind"], typeof Bell> = {
  deal: Wallet,
  offer: Handshake,
  giveaway: Gift,
  moderation: ShieldAlert,
};

/** Fixed order so the rail does not reshuffle as notifications arrive. */
const KINDS: Notification["kind"][] = [
  "deal",
  "offer",
  "giveaway",
  "moderation",
];

type Filter = "all" | Notification["kind"];

/**
 * Deliberately thin. Home already answers "what needs me" with the deadlines
 * attached (decision D2); a notification list that repeats it in a different
 * order would split the user's attention between two competing inboxes.
 *
 * So this is a log: what happened, when, and a way back to the thing it
 * happened on. The rail beside it filters that log by kind and counts what is
 * unread — the two facts the rows already carry, in the ~380px the list was
 * leaving empty on a laptop.
 */
/**
 * Bucket by calendar day, newest first, preserving the order inside each day.
 * "Today"/"Yesterday" rather than a date, because that is how someone reads a
 * notification list — relative to now, not to the calendar.
 */
function groupByDay(
  items: Notification[],
  labels: { today: string; yesterday: string },
): Array<[string, Notification[]]> {
  const dayKey = (iso: string) => new Date(iso).toDateString();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();

  const label = (key: string) =>
    key === today
      ? labels.today
      : key === yesterday
        ? labels.yesterday
        : formatDate(new Date(key));

  const buckets = new Map<string, Notification[]>();
  for (const n of items) {
    const key = dayKey(n.created_at);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(n);
    else buckets.set(key, [n]);
  }
  return [...buckets].map(([key, group]) => [label(key), group]);
}

function subscribeRead(onChange: () => void) {
  window.addEventListener(NOTIFICATIONS_SEEN_EVENT, onChange);
  return () => window.removeEventListener(NOTIFICATIONS_SEEN_EVENT, onChange);
}

export function NotificationsScreen({
  notifications,
  readCookie,
  initialRead = "",
}: {
  notifications: Notification[];
  /** The cookie that remembers which rows were opened; per account. */
  readCookie?: string;
  /** Its value as the server read it, for the first paint. */
  initialRead?: string;
}) {
  const t = getCopy();
  const router = useRouter();

  /**
   * A row is read once it has been opened. The API has no read state, so the
   * ones it marks read (a finished deal, a decided offer) stay read, and any
   * other becomes read when its link is clicked. The key carries the title and
   * date, so the same deal at a new step is unread again.
   */
  const readRaw = useSyncExternalStore(
    subscribeRead,
    () => (readCookie ? readSeen(readCookie) : ""),
    () => initialRead,
  );
  const opened = useMemo(() => new Set(parseSeen(readRaw)), [readRaw]);
  const isRead = (n: Notification) => n.read || opened.has(feedKey(n));
  function markOpened(n: Notification) {
    if (!readCookie || isRead(n)) return;
    writeSeen(readCookie, [...parseSeen(readSeen(readCookie)), feedKey(n)]);
  }
  usePolling(() => {
    if (document.visibilityState === "visible") router.refresh();
  }, 10_000);
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const total = { all: notifications.length } as Record<Filter, number>;
    const unread = {
      all: notifications.filter((n) => !(n.read || opened.has(feedKey(n)))).length,
    } as Record<Filter, number>;
    for (const kind of KINDS) {
      const rows = notifications.filter((n) => n.kind === kind);
      total[kind] = rows.length;
      unread[kind] = rows.filter((n) => !(n.read || opened.has(feedKey(n)))).length;
    }
    return { total, unread };
  }, [notifications, opened]);

  const shown =
    filter === "all"
      ? notifications
      : notifications.filter((n) => n.kind === filter);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      {/* A log needs a name and a count, not a masthead. The overline and the
          subtitle described a list that describes itself. */}
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-h2">{t("notifications.title")}</h1>
        {counts.unread.all > 0 ? (
          <span
            data-numeric
            className={cn(BADGE_SHAPE, BADGE_PAINT.neutral)}
          >
            {t("notifications.unread", { count: counts.unread.all })}
          </span>
        ) : null}
      </header>

      <div className="flex gap-5 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterTab
          label={t("notifications.everything")}
          total={counts.total.all}
          unread={counts.unread.all}
          isActive={filter === "all"}
          onPress={() => setFilter("all")}
        />
        {KINDS.map((kind) => (
          <FilterTab
            key={kind}
            label={t(`notifications.${kind}`)}
            total={counts.total[kind]}
            unread={counts.unread[kind]}
            isActive={filter === kind}
            onPress={() => setFilter(kind)}
          />
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-6" />}
          title={t("notifications.emptyTitle")}
          description={t("notifications.emptyBody")}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groupByDay(
            shown,
            {
              today: t("notifications.today"),
              yesterday: t("notifications.yesterday"),
            },
          ).map(([day, items]) => (
            <section key={day} className="flex flex-col gap-1">
              <h2 className="text-overline text-ink-muted uppercase">{day}</h2>
              <ul className="flex flex-col divide-y divide-line border-t border-line">
              {items.map((n) => {
                const Icon = ICON[n.kind];
                const read = isRead(n);
                return (
                  <li key={n.notification_id}>
                    <Link
                      href={n.href}
                      onClick={() => markOpened(n)}
                      className={cn(
                        "-mx-2 flex items-start gap-3 rounded-control px-2 py-3",
                        "transition-colors duration-[--dur-fast] hover:bg-surface-sunken",
                      )}
                    >
                      <Icon
                        aria-hidden
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          read ? "text-ink-muted" : "text-ink-secondary",
                        )}
                      />

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-body",
                            read ? "text-ink-secondary" : "font-semibold text-ink",
                          )}
                        >
                          {n.title}
                        </p>
                        <p className="text-body-sm text-ink-muted">{n.body}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 pt-0.5">
                        <time
                          dateTime={n.created_at}
                          className="text-meta text-ink-muted"
                        >
                          {formatDate(new Date(n.created_at))}
                        </time>
                        {!read ? (
                          <>
                            <span
                              aria-hidden
                              className="size-1.5 rounded-pill bg-tone-danger-solid"
                            />
                            <span className="sr-only">Unread</span>
                          </>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterTab({
  label,
  total,
  unread,
  isActive,
  onPress,
}: {
  label: string;
  total: number;
  unread: number;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={isActive}
      className={cn(
        "flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-0.5 text-body-sm",
        "transition-colors duration-[--dur-fast]",
        isActive
          ? "border-brand font-semibold text-ink"
          : "border-transparent text-ink-muted hover:text-ink",
      )}
    >
      <span>{label}</span>

      {/* Only the fact that something is unread. The total sat next to it as a
          second bare number and the tabs read as a row of counters. */}
      {unread > 0 ? (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-pill bg-tone-danger-solid"
        />
      ) : null}
      {unread > 0 ? (
        <span className="sr-only">
          , {unread} unread out of {total}
        </span>
      ) : null}
    </button>
  );
}
