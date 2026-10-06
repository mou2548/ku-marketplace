import type { AdminAppeal, Report } from "@/lib/api/types";
import type { AppealStatus, ReportStatus } from "@/lib/status";

/**
 * The admin workspace's vocabulary: labels, predicates and time formatting.
 * Free of data access so Client Components can import it; the server-side
 * reads live in `lib/admin.ts`.
 *
 * Admin screens use their own quiet label set rather than the student-facing
 * status copy: a moderator reads "New" and "Under investigation", not the
 * reassurance written for the person whose deal is under review.
 */

export type AdminTone = "neutral" | "info" | "warning" | "danger" | "success";

export interface AdminLabel {
  label: string;
  tone: AdminTone;
}

export const ADMIN_REPORT_STATUS: Record<ReportStatus, AdminLabel> = {
  Pending: { label: "New", tone: "neutral" },
  Under_Investigation: { label: "Under investigation", tone: "info" },
  Violation_Confirmed: { label: "Violation confirmed", tone: "danger" },
  Report_Dismissed: { label: "Dismissed", tone: "neutral" },
};

export const ADMIN_APPEAL_STATUS: Record<AppealStatus, AdminLabel> = {
  Pending: { label: "New", tone: "neutral" },
  Under_Review: { label: "Under review", tone: "info" },
  Approved: { label: "Upheld", tone: "success" },
  Rejected: { label: "Rejected", tone: "danger" },
};

export const isOpenReport = (report: Pick<Report, "status">) =>
  report.status === "Pending" || report.status === "Under_Investigation";

export const isOpenAppeal = (appeal: Pick<AdminAppeal, "status">) =>
  appeal.status === "Pending" || appeal.status === "Under_Review";

export interface AdminQueueCounts {
  reports: number;
  appeals: number;
  memberships: number;
}

export type QueueKind = "report" | "appeal" | "membership";

/** One row of the dashboard's combined queue — plain data, safe to hand to a
 * Client Component. */
export interface QueueRow {
  key: string;
  kind: QueueKind;
  href: string;
  title: string;
  detail: string;
  status: AdminLabel;
  createdAt: string;
}

const HOUR = 3_600_000;

/** Compact waiting time for a queue column: "45m", "9h", "3d". */
export function waitingFor(since: string, now: number = Date.now()): string {
  const elapsed = Math.max(0, now - Date.parse(since));
  if (elapsed < HOUR) return `${Math.max(1, Math.floor(elapsed / 60_000))}m`;
  if (elapsed < 24 * HOUR) return `${Math.floor(elapsed / HOUR)}h`;
  return `${Math.floor(elapsed / (24 * HOUR))}d`;
}

/** Spelled-out age for prose: "3 days", "5 hours". */
export function waitingForLong(
  since: string,
  now: number = Date.now(),
): string {
  const elapsed = Math.max(0, now - Date.parse(since));
  const plural = (n: number, unit: string) =>
    `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (elapsed < HOUR)
    return plural(Math.max(1, Math.floor(elapsed / 60_000)), "minute");
  if (elapsed < 24 * HOUR) return plural(Math.floor(elapsed / HOUR), "hour");
  return plural(Math.floor(elapsed / (24 * HOUR)), "day");
}

/** A case past this age is drawn in the danger tone in the queue. */
export const OVERDUE_AFTER_MS = 48 * HOUR;
