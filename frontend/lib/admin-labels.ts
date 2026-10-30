import type { AdminAppeal, Report, Sanction } from "@/lib/api/types";
import type { AdminTransactionStatus } from "@/lib/api/admin";
import type {
  AppealStatus,
  AppointmentStatus,
  Lifecycle,
  ReportStatus,
} from "@/lib/status";
import { formatPrice } from "@/lib/format-price";

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
  /** Decides the pill's tier with the tone (`lib/badge-tier.ts`). */
  lifecycle: Lifecycle;
  /**
   * The admin is the one who must act on it: a report or appeal awaiting
   * review, a slip to check (owner ruling 2026-10-30). Only these are the
   * act-now solid in admin views.
   */
  adminActs: boolean;
}

export const ADMIN_REPORT_STATUS: Record<ReportStatus, AdminLabel> = {
  Pending: { label: "New", tone: "warning", lifecycle: "open", adminActs: true },
  Under_Investigation: { label: "Under investigation", tone: "info", lifecycle: "open", adminActs: false },
  Violation_Confirmed: { label: "Violation confirmed", tone: "danger", lifecycle: "ended", adminActs: false },
  Report_Dismissed: { label: "Dismissed", tone: "neutral", lifecycle: "ended", adminActs: false },
};

export const ADMIN_APPEAL_STATUS: Record<AppealStatus, AdminLabel> = {
  Pending: { label: "New", tone: "warning", lifecycle: "open", adminActs: true },
  Under_Review: { label: "Under review", tone: "info", lifecycle: "open", adminActs: false },
  Approved: { label: "Upheld", tone: "success", lifecycle: "ended", adminActs: false },
  Rejected: { label: "Rejected", tone: "danger", lifecycle: "ended", adminActs: false },
};

export const ADMIN_APPOINTMENT_STATUS: Record<AppointmentStatus, AdminLabel> = {
  Pending: { label: "Proposed", tone: "warning", lifecycle: "open", adminActs: false },
  Confirmed: { label: "Confirmed", tone: "success", lifecycle: "ended", adminActs: false },
  Rejected: { label: "Rejected", tone: "neutral", lifecycle: "ended", adminActs: false },
};

export const ADMIN_ACCOUNT_STATUS: Record<string, AdminLabel> = {
  Active: { label: "Active", tone: "success", lifecycle: "open", adminActs: false },
  Suspended: { label: "Suspended", tone: "warning", lifecycle: "open", adminActs: false },
  Banned: { label: "Banned", tone: "danger", lifecycle: "open", adminActs: false },
  Deleted: { label: "Deleted", tone: "neutral", lifecycle: "ended", adminActs: false },
};

/** Mirrors `TEMPORARY_SUSPENSION_DAYS` in `backend/src/report/account-standing.ts`. */
export const TEMPORARY_SUSPENSION_DAYS = 3;

/** Mirrors `APPEAL_WINDOW_DAYS` in `backend/src/report/moderation-notifications.ts`. */
export const APPEAL_WINDOW_DAYS = 7;

export const ADMIN_SANCTION: Record<Sanction, string> = {
  none: "No sanction",
  warn: "Warning",
  suspend_temporary: `Suspended for ${TEMPORARY_SUSPENSION_DAYS} days`,
  suspend_permanent: "Permanent ban",
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

export const ADMIN_TRANSACTION_STATUS: Record<
  AdminTransactionStatus,
  AdminLabel
> = {
  Pending: { label: "Pending", tone: "neutral", lifecycle: "open", adminActs: false },
  Processing: { label: "Processing", tone: "info", lifecycle: "open", adminActs: false },
  Completed: { label: "Completed", tone: "success", lifecycle: "ended", adminActs: false },
  Cancelled: { label: "Cancelled", tone: "neutral", lifecycle: "ended", adminActs: false },
  "Pending Refund": { label: "Refunding", tone: "warning", lifecycle: "open", adminActs: false },
  Refunded: { label: "Refunded", tone: "neutral", lifecycle: "ended", adminActs: false },
};

/** Shown when a nullable status column holds no value (very old rows). */
const NOT_SET: AdminLabel = { label: "Not set", tone: "neutral", lifecycle: "open", adminActs: false };
/** Shown for a value this build does not know, instead of guessing a tone. */
const unknownLabel = (value: string): AdminLabel => ({
  label: `Unknown (${value})`,
  tone: "warning",
  lifecycle: "open",
  adminActs: false,
});

/** `User.user_status`, which the schema allows to be null. */
export function accountStatusLabel(status: string | null): AdminLabel {
  switch (status) {
    case null:
      return NOT_SET;
    case "Active":
    case "Suspended":
    case "Banned":
    case "Deleted":
      return ADMIN_ACCOUNT_STATUS[status];
    default:
      return unknownLabel(status);
  }
}

/** `Transaction.transaction_status`, which the schema allows to be null. */
export function transactionStatusLabel(status: string | null): AdminLabel {
  switch (status) {
    case null:
      return NOT_SET;
    case "Pending":
    case "Processing":
    case "Completed":
    case "Cancelled":
    case "Pending Refund":
    case "Refunded":
      return ADMIN_TRANSACTION_STATUS[status];
    default:
      return unknownLabel(status);
  }
}

/** "฿12,500", "฿99.50" — the app-wide price format (`lib/format-price`). */
export const formatBaht = formatPrice;

/**
 * A name as link text. The API accepts whitespace-only names, and a link whose
 * only text is blank has no accessible name, so it falls back to the record's
 * number ("Item #12").
 */
export const nameOr = (name: string | null | undefined, fallback: string) =>
  name?.trim() || fallback;

const COUNT = new Intl.NumberFormat("en-US");
export const formatCount = (n: number) => COUNT.format(n);

/** The dashboard's date-range choices, in Bangkok days ending today. */
export const RANGE_PRESETS = [
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "365", label: "1 year", days: 365 },
] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number]["id"];

const BANGKOK_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
});

/** `{ from, to }` as inclusive Bangkok days for a preset, ending on `now`. */
export function presetRange(preset: RangePreset, now: number) {
  const days = RANGE_PRESETS.find((p) => p.id === preset)?.days ?? 30;
  return {
    from: BANGKOK_DAY.format(new Date(now - (days - 1) * 24 * HOUR)),
    to: BANGKOK_DAY.format(new Date(now)),
  };
}
