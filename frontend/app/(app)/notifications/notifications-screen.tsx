"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Gift, Handshake, Inbox, ShieldAlert, Wallet } from "lucide-react";

import { EmptyState } from "@/components/kit/empty-state";
import { Surface } from "@/components/kit/surface";
import { TwoColumn } from "@/components/kit/two-column";
import type { Notification } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

const ICON: Record<Notification["kind"], typeof Bell> = {
  deal: Wallet,
  offer: Handshake,
  giveaway: Gift,
  moderation: ShieldAlert,
};

const KIND_LABEL: Record<Notification["kind"], string> = {
  deal: "Deals",
  offer: "Offers",
  giveaway: "Giveaways",
  moderation: "Moderation",
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
function groupByDay(items: Notification[]): Array<[string, Notification[]]> {
  const dayKey = (iso: string) => new Date(iso).toDateString();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();

  const label = (key: string) =>
    key === today
      ? "Today"
      : key === yesterday
        ? "Yesterday"
        : new Date(key).toLocaleDateString("en-GB", {
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

  const rail = (
    <Surface shape="card" className="flex flex-col gap-1 p-3">
      <p className="px-2 pt-1 pb-2 text-overline text-ink-muted uppercase">
        Filter
      </p>

      <FilterRow
        label="Everything"
        icon={Inbox}
        total={counts.total.all}
        unread={counts.unread.all}
        isActive={filter === "all"}
        onPress={() => setFilter("all")}
      />

      {KINDS.map((kind) => (
        <FilterRow
          key={kind}
          label={KIND_LABEL[kind]}
          icon={ICON[kind]}
          total={counts.total[kind]}
          unread={counts.unread[kind]}
          isActive={filter === kind}
          onPress={() => setFilter(kind)}
        />
      ))}
    </Surface>
  );

  return (
    <TwoColumn rail={rail} railSide="left">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-h1">Notifications</h1>
        {counts.unread.all > 0 ? (
          <span
            data-numeric
            className="rounded-pill bg-brand-subtle px-2.5 py-1 text-[0.8125rem] font-medium text-ink-brand"
          >
            {counts.unread.all} unread
          </span>
        ) : null}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-6" />}
          title="Nothing of that kind yet"
          description="Updates on your deals, offers, and giveaways land here as they happen."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groupByDay(shown).map(([day, items]) => (
            <section key={day} className="flex flex-col gap-2">
              <h2 className="text-overline text-ink-muted uppercase">{day}</h2>
              <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const Icon = ICON[n.kind];
            return (
              <li key={n.notification_id}>
                <Link href={n.href}>
                  <Surface
                    as="div"
                    shape="card"
                    elevation={n.read ? "flat" : "raised"}
                    interactive
                    className={cn(
                      "flex items-start gap-3 p-4",
                      !n.read && "ring-1 ring-brand-subtle",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-pill",
                        n.read
                          ? "bg-gray-100 text-ink-muted"
                          : "bg-brand-subtle text-ink-brand",
                      )}
                    >
                      <Icon aria-hidden className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[0.9375rem]",
                          n.read ? "font-medium" : "font-semibold",
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="text-[0.875rem] leading-[1.65] text-ink-muted">
                        {n.body}
                      </p>
                    </div>

                    <time
                      dateTime={n.created_at}
                      className="shrink-0 text-[0.75rem] text-ink-muted"
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
    </TwoColumn>
  );
}

function FilterRow({
  label,
  icon: Icon,
  total,
  unread,
  isActive,
  onPress,
}: {
  label: string;
  icon: typeof Bell;
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
        "flex min-h-11 items-center gap-2.5 rounded-control px-2.5 text-[0.875rem]",
        "transition-colors duration-[--dur-fast]",
        isActive
          ? "bg-brand-subtle font-semibold text-ink-brand"
          : "text-ink-secondary hover:bg-gray-100",
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>

      {/* Unread is the number worth acting on; the total is context for it. */}
      {unread > 0 ? (
        <span
          data-numeric
          className="grid min-w-5 place-items-center rounded-pill bg-tone-danger-solid px-1.5 text-[0.6875rem] font-semibold text-white"
        >
          {unread}
        </span>
      ) : null}
      <span data-numeric className="text-[0.75rem] text-ink-muted">
        {total}
      </span>
      {unread > 0 ? (
        <span className="sr-only">, {unread} unread</span>
      ) : null}
    </button>
  );
}
