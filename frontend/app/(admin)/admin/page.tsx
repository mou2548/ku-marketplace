import Link from "next/link";
import { Activity, Bell, Clock, Inbox, ListChecks } from "lucide-react";

import {
  AdminBox,
  AdminBoxHeader,
  AdminPageHeader,
} from "@/components/admin/admin-ui";
import { QueueTable } from "@/components/admin/queue-table";
import { waitingFor, waitingForLong } from "@/lib/admin-labels";
import { buildQueueRows, loadAdminQueues, requestTime } from "@/lib/admin";
import { getModerationActivity } from "@/lib/api/notifications";
import { getMe } from "@/lib/api/users";

export const metadata = { title: "Dashboard - Admin" };

const DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The admin's first screen: what is waiting and for how long. One summary
 * strip instead of big-number tiles, one combined queue, then the moderation
 * activity the bell also shows. Built only on the existing admin endpoints.
 */
export default async function AdminDashboardPage() {
  const [queues, me, activity] = await Promise.all([
    loadAdminQueues(),
    getMe(),
    getModerationActivity().catch(() => []),
  ]);
  const now = requestTime();
  const rows = buildQueueRows(queues);
  const oldest = rows[0];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <AdminPageHeader
        overline={DAY_FORMAT.format(new Date(now))}
        title={`${greeting(new Date(now))}, ${me.firstNameEn}`}
      />

      <dl className="flex max-w-full flex-wrap items-center self-start rounded-[12px] border border-line py-1.5">
        <Stat icon={<Inbox />} value={String(rows.length)} label="waiting" />
        <Stat
          icon={<Clock />}
          value={oldest ? waitingForLong(oldest.createdAt, now) : "None"}
          label="oldest case"
        />
      </dl>

      <AdminBox aria-labelledby="queue-title">
        <AdminBoxHeader
          icon={<ListChecks />}
          title="Queue"
          titleId="queue-title"
        />
        <div className="px-4">
          <QueueTable rows={rows} now={now} />
        </div>
      </AdminBox>

      <AdminBox aria-labelledby="activity-title">
        <AdminBoxHeader
          icon={<Activity />}
          title="Activity"
          titleId="activity-title"
        >
          <span className="text-meta text-ink-muted">
            Same as your notifications
          </span>
        </AdminBoxHeader>
        {activity.length ? (
          <ul className="border-t border-line">
            {activity.map((item) => (
              <li
                key={item.notification_id}
                className="border-b border-line last:border-b-0"
              >
                <Link
                  href={item.href}
                  className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-start gap-2.5 px-4 py-3 text-body-sm hover:bg-surface-sunken/60"
                >
                  <Bell aria-hidden className="mt-1 size-4 text-ink-muted" />
                  <span className="min-w-0">
                    <span className="font-medium text-ink">{item.title}</span>
                    <span className="block text-meta text-ink-muted">
                      {item.body}
                    </span>
                  </span>
                  <time
                    data-numeric
                    dateTime={item.created_at}
                    className="text-meta text-ink-muted"
                  >
                    {waitingFor(item.created_at, now)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-line px-4 py-8 text-center text-body-sm text-ink-muted">
            New reports and appeals show up here as they arrive.
          </p>
        )}
      </AdminBox>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap px-3 py-0.5 text-body-sm text-ink-muted [&+div]:border-l [&+div]:border-line">
      <span aria-hidden className="[&_svg]:size-4">
        {icon}
      </span>
      <dt className="order-last">{label}</dt>
      <dd data-numeric className="text-body font-semibold text-ink">
        {value}
      </dd>
    </div>
  );
}
