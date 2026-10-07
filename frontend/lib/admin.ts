import { cache } from "react";

import { adminListAppeals } from "@/lib/api/appeals";
import { listPendingPayments } from "@/lib/api/membership";
import { adminListReports } from "@/lib/api/reports";
import {
  ADMIN_APPEAL_STATUS,
  ADMIN_REPORT_STATUS,
  TEMPORARY_SUSPENSION_DAYS,
  isOpenAppeal,
  isOpenReport,
  type AdminQueueCounts,
  type QueueRow,
} from "@/lib/admin-labels";

/**
 * The admin workspace's server-side reads. Vocabulary shared with Client
 * Components lives in `lib/admin-labels.ts`.
 */

/**
 * One request's worth of queue data. The layout (for the sidebar counts) and
 * the page under it both ask; `cache` makes that one round of requests.
 */
export const loadAdminQueues = cache(async () => {
  const [reports, appeals, memberships] = await Promise.all([
    adminListReports(),
    adminListAppeals(),
    listPendingPayments(),
  ]);
  return { reports, appeals, memberships };
});

export type AdminQueues = Awaited<ReturnType<typeof loadAdminQueues>>;

export function queueCounts(queues: AdminQueues): AdminQueueCounts {
  return {
    reports: queues.reports.filter(isOpenReport).length,
    appeals: queues.appeals.filter(isOpenAppeal).length,
    memberships: queues.memberships.length,
  };
}

/**
 * Every open case across the three queues, oldest first. There is one admin,
 * so a row never says who holds it; its status says whether it was taken.
 */
export function buildQueueRows(queues: AdminQueues): QueueRow[] {
  const reports: QueueRow[] = queues.reports
    .filter(isOpenReport)
    .map((report) => ({
      key: `report-${report.report_id}`,
      kind: "report",
      href: `/admin/reports/${report.report_id}`,
      title: `Report #${report.report_id}`,
      detail: `${report.reason_category} · ${report.reporter.name} reported ${report.reported_user?.name ?? `${report.report_type} #${report.target_id}`}`,
      status: ADMIN_REPORT_STATUS[report.status],
      createdAt: report.created_at,
    }));

  const appeals: QueueRow[] = queues.appeals
    .filter(isOpenAppeal)
    .map((appeal) => ({
      key: `appeal-${appeal.appeal_id}`,
      kind: "appeal",
      href: `/admin/appeals/${appeal.appeal_id}`,
      title: `Appeal #${appeal.appeal_id}`,
      detail: `Against report #${appeal.report_id} · ${appeal.appellant.name}`,
      status: ADMIN_APPEAL_STATUS[appeal.status],
      createdAt: appeal.created_at,
    }));

  const memberships: QueueRow[] = queues.memberships.map((request) => ({
    key: `membership-${request.request_id}`,
    kind: "membership",
    href: "/admin/memberships",
    // `tier` is the account's current tier, not the one being paid for, so
    // the row names the slip rather than a tier it cannot know.
    title: "Membership slip",
    detail: `${request.user.name} · ฿${request.amount.toLocaleString("en-GB")} slip`,
    status: { label: "Slip to check", tone: "warning" },
    createdAt: request.created_at,
  }));

  return [...reports, ...appeals, ...memberships].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

export interface RestrictedAccount {
  user: NonNullable<AdminQueues["reports"][number]["reported_user"]>;
  status: "Suspended" | "Banned";
  /** When the latest running suspension ends; null for a ban. */
  until: string | null;
  /** The decision behind it, for a link to the case. */
  reportId: number;
}

/**
 * Who is suspended or banned right now, worked out from the decided reports
 * (the sanction and decision time are on each one), so no extra endpoint is
 * needed. An upheld appeal turns its report back to dismissed, so lifted
 * sanctions drop out by themselves.
 */
export function restrictedAccounts(
  queues: AdminQueues,
  now: number,
): RestrictedAccount[] {
  const byUser = new Map<number, RestrictedAccount>();
  for (const report of queues.reports) {
    const user = report.reported_user;
    if (
      report.status !== "Violation_Confirmed" ||
      !user ||
      (user.status !== "Suspended" && user.status !== "Banned")
    )
      continue;
    const banned = report.sanction === "suspend_permanent";
    const ends =
      report.sanction === "suspend_temporary" && report.handled_at
        ? Date.parse(report.handled_at) + TEMPORARY_SUSPENSION_DAYS * 86_400_000
        : null;
    if (!banned && (ends === null || ends <= now)) continue;
    const seen = byUser.get(user.user_id);
    if (seen?.status === "Banned") continue;
    if (banned) {
      byUser.set(user.user_id, { user, status: "Banned", until: null, reportId: report.report_id });
    } else if (!seen || Date.parse(seen.until ?? "") < (ends ?? 0)) {
      byUser.set(user.user_id, {
        user,
        status: "Suspended",
        until: new Date(ends!).toISOString(),
        reportId: report.report_id,
      });
    }
  }
  return [...byUser.values()].sort((a, b) =>
    a.status === b.status
      ? a.user.name.localeCompare(b.user.name)
      : a.status === "Banned"
        ? -1
        : 1,
  );
}

/**
 * The time a Server Component renders against. A server render runs once per
 * request, so reading the clock here is stable for that render; the value is
 * then passed down so client children compute ages from the same instant.
 */
export function requestTime(): number {
  return Date.now();
}
