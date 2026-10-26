/**
 * The database (see init.sql) stores these columns as VARCHAR(20) guarded by a
 * CHECK constraint, not as PostgreSQL enum types, so Prisma generates them as
 * plain `String`. These constants are the single source of the allowed values
 * for both `@IsEnum()` validation on DTOs and the status comparisons in
 * TransactionService.
 *
 * Keep in sync with the CHECK constraints in init.sql.
 */

export const TransactionStatus = {
  Pending: 'Pending',
  Processing: 'Processing',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  PendingRefund: 'Pending Refund',
  Refunded: 'Refunded',
} as const;
export type TransactionStatus =
  (typeof TransactionStatus)[keyof typeof TransactionStatus];

export const DeliveryMethod = {
  Meetup: 'Meetup',
  Shipping: 'Shipping',
} as const;
export type DeliveryMethod =
  (typeof DeliveryMethod)[keyof typeof DeliveryMethod];

/**
 * §8.7 — the state of a cancellation request. `cancellation_requested_by` alone
 * only says WHO asked; this says how it ended, which matters because a rejected
 * request does NOT cancel the transaction and must keep the confirm buttons
 * locked until an admin rules.
 *
 * Values follow the CHECK constraint in init.sql — note it is 'Approved', not
 * 'Accepted'.
 */
export const CancellationResponse = {
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
} as const;
export type CancellationResponse =
  (typeof CancellationResponse)[keyof typeof CancellationResponse];
