"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Gift, Handshake, ShieldAlert, Wallet } from "lucide-react";

import { EmptyState } from "@/components/kit/empty-state";
import { Surface } from "@/components/kit/surface";
import { TONE_CHIP, TONE_RAIL_LEFT } from "@/components/kit/tone";
import type { Notification } from "@/lib/api/notifications";
import type { Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

const ICON: Record<Notification["kind"], typeof Bell> = {
  deal: Wallet,
  offer: Handshake,
  giveaway: Gift,
  moderation: ShieldAlert,
};

const KIND_TONE: Record<Notification["kind"], Tone> = {
  deal: "success",
  offer: "trade",
  giveaway: "warning",
  moderation: "danger",
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
  locale: string,
): Array<[string, Notification[]]> {
  const dayKey = (iso: string) => new Date(iso).toDateString();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();

  const label = (key: string) =>
    key === today
      ? labels.today
      : key === yesterday
        ? labels.yesterday
        : new Date(key).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });

  const buckets = new Map<string, Notification[]>();
  for (const n of items) {
    const key = dayKey(n.created_at);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(n);
    else buckets.set(key, [n]);
  }
  return [...buckets].map(([key, group]) => [label(key), group]);
}

export function NotificationsScreen({
  notifications,
}: {
  notifications: Notification[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const total = { all: notifications.length } as Record<Filter, number>;
    const unread = { all: notifications.filter((n) => !n.read).length } as Record<
      Filter,
      number
    >;
    for (const kind of KINDS) {
      const rows = notifications.filter((n) => n.kind === kind);
      total[kind] = rows.length;
      unread[kind] = rows.filter((n) => !n.read).length;
    }
    return { total, unread };
  }, [notifications]);

  const shown =
    filter === "all"
      ? notifications
      : notifications.filter((n) => n.kind === filter);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-overline font-semibold text-ink-brand uppercase">
            {t("notifications.activity")}
          </p>
          <h1 className="mt-1 text-h1">{t("notifications.title")}</h1>
          <p className="mt-1 text-body-sm text-ink-muted">
            {t("notifications.subtitle")}
          </p>
        </div>
        {counts.unread.all > 0 ? (
          <span
            data-numeric
            className="rounded-pill bg-brand-subtle px-2.5 py-1 text-caption font-medium text-ink-brand"
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
            locale,
          ).map(([day, items]) => (
            <section key={day} className="flex flex-col gap-2">
              <h2 className="text-overline text-ink-muted uppercase">{day}</h2>
              <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const Icon = ICON[n.kind];
            const tone = KIND_TONE[n.kind];
            return (
              <li key={n.notification_id}>
                <Link href={n.href}>
                  <Surface
                    as="div"
                    shape="card"
                    elevation={n.read ? "flat" : "raised"}
                    interactive
                    className={cn(
                      "flex items-start gap-3 border-l-2 p-4",
                      !n.read
                        ? cn("bg-surface", TONE_RAIL_LEFT[tone])
                        : "border-l-transparent",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-pill",
                        n.read
                          ? "border border-line bg-gray-100 text-ink-muted"
                          : cn("border", TONE_CHIP[tone]),
                      )}
                    >
                      <Icon aria-hidden className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-body",
                          n.read ? "font-medium" : "font-semibold",
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="text-body-sm text-ink-muted">
                        {n.body}
                      </p>
                    </div>

                    <time
                      dateTime={n.created_at}
                      className="shrink-0 text-meta text-ink-muted"
                    >
                      {new Date(n.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </time>
                  </Surface>
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

      {/* Unread is the number worth acting on; the total is context for it. */}
      {unread > 0 ? (
        <span
          data-numeric
          className="grid min-w-5 place-items-center rounded-pill bg-tone-danger-solid px-1.5 text-meta font-semibold text-white"
        >
          {unread}
        </span>
      ) : null}
      <span data-numeric className="text-meta text-ink-muted">
        {total}
      </span>
      {unread > 0 ? (
        <span className="sr-only">, {unread} unread</span>
      ) : null}
    </button>
  );
}
