/**
 * The database (see init.sql) stores these columns as VARCHAR(20), not as
 * PostgreSQL enum types, so `prisma db pull` generates them as plain `String`
 * and no enum reaches the generated client. These constants are the only place
 * the allowed values are defined — they back both the `@IsEnum()` validation on
 * incoming DTOs and the status comparisons in the services.
 *
 * Shape intentionally mirrors what Prisma used to generate (const object + a
 * type of the same name), so usage like `ReportStatus.Pending` and
 * `@IsEnum(ReportStatus)` keeps working unchanged.
 *
 * Keep in sync with init.sql if the allowed values there ever change.
 */

export const ReportType = {
  Post: 'Post',
  User: 'User',
  Transaction: 'Transaction',
} as const;
export type ReportType = (typeof ReportType)[keyof typeof ReportType];

export const ReportStatus = {
  Pending: 'Pending',
  Under_Investigation: 'Under_Investigation',
  Violation_Confirmed: 'Violation_Confirmed',
  Report_Dismissed: 'Report_Dismissed',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const AppealStatus = {
  Pending: 'Pending',
  Under_Review: 'Under_Review',
  Approved: 'Approved',
  Rejected: 'Rejected',
} as const;
export type AppealStatus = (typeof AppealStatus)[keyof typeof AppealStatus];

/**
 * §7.1 — stored on Report.sanction so appeal reversal preserves other penalties. A
 * `Violation_Confirmed` report carries one of these; `report.service.ts`
 * turns `Suspend_*` into a `User.status` update (`Suspended`/`Banned` already
 * exist on that column) and leaves `Warn`/`None` as the report's own
 * `resolution_note` with no side effect on the account.
 */
export const Sanction = {
  None: 'none',
  Warn: 'warn',
  Suspend_Temporary: 'suspend_temporary',
  Suspend_Permanent: 'suspend_permanent',
} as const;
export type Sanction = (typeof Sanction)[keyof typeof Sanction];
