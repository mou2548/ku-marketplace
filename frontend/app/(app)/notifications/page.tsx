import Link from "next/link";
import { Bell, Gift, Handshake, ShieldAlert, Wallet } from "lucide-react";

import { EmptyState } from "@/components/kit/empty-state";
import { Surface } from "@/components/kit/surface";
import { getNotifications, type Notification } from "@/lib/api/fixtures";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications - KU Marketplace" };

const ICON: Record<Notification["kind"], typeof Bell> = {
  deal: Wallet,
  offer: Handshake,
  giveaway: Gift,
  moderation: ShieldAlert,
};

/**
 * Deliberately thin. Home already answers "what needs me" with the deadlines
 * attached (decision D2); a notification list that repeats it in a different
 * order would split the user's attention between two competing inboxes.
 *
 * So this is a log: what happened, when, and a way back to the thing it
 * happened on. Unread items are marked, but the count that matters lives on
 * Home.
 */
export default async function NotificationsPage() {
  const notifications = await getNotifications();

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="size-6" />}
        title="Nothing has happened yet"
        description="Updates on your deals, offers, and giveaways land here as they happen."
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
        Notifications
      </h1>

      <ul className="flex flex-col gap-2">
        {notifications.map((n) => {
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

                  {!n.read ? (
                    <span className="sr-only">Unread</span>
                  ) : null}
                </Surface>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
