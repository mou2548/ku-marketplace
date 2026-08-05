/**
 * The database (see init.sql) stores these columns as VARCHAR(20) guarded by a
 * CHECK constraint, not as PostgreSQL enum types, so Prisma generates them as
 * plain `String`. These constants are the single source of the allowed values
 * for both `@IsEnum()` validation on DTOs and the status comparisons in
 * TransactionService.
 *
 * Keep in sync with the CHECK constraints in init.sql.
 */

/**
 * The CHECK constraint on Transaction.status also permits 'Pending Refund' and
 * 'Refunded', but the state machine deliberately does not use them: per the
 * payment philosophy (PROJECT_STANDARDS §1) the platform never holds or moves
 * user money, so a refund is evidence recorded against an already-Cancelled
 * transaction — not a status of its own (§10 open issue #1).
 */
export const TransactionStatus = {
  Pending: 'Pending',
  Processing: 'Processing',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
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

/**
 * §8.2 — Transferred is terminal: it stays even if the transaction is later
 * cancelled, so ownership history can't silently rewind.
 */
export const ItemStatus = {
  Unlisted: 'Unlisted',
  Listed: 'Listed',
  Transferred: 'Transferred',
} as const;
export type ItemStatus = (typeof ItemStatus)[keyof typeof ItemStatus];
