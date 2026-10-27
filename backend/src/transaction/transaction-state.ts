import type { Prisma } from '@prisma/client';
import { ReportStatus, ReportType } from '../common/enums/report.enums';
import { TransactionStatus } from '../common/enums/transaction.enums';

/**
 * Schema v3 moved the payment, shipment, cancellation and refund columns off
 * `Transaction` into child tables, and dropped `active_report_id`. The state
 * machine in `transaction.service.ts` still reasons about one deal at a time,
 * so this file folds those rows back into the flat shape it always read
 * (`TransactionState`). Reads go through here; writes target the child tables.
 */

export const PaymentStatus = {
  Pending: 'Pending',
  Confirmed: 'Confirmed',
  Rejected: 'Rejected',
} as const;

/**
 * Reports the system files itself lock the transaction until an admin rules
 * (a rejected cancellation, or a step that ran out of time). There is no
 * column linking them any more, so they are recognised by the reason they
 * were filed with. A report a participant files by hand never locks the deal;
 * `ReportService.create` refuses these reasons so one cannot be forged.
 */
export const CANCELLATION_REJECTED_REASON = 'Cancellation or return rejected';
const TIMED_OUT_SUFFIX = ' timed out';
export const timedOutReason = (phase: string) => `${phase}${TIMED_OUT_SUFFIX}`;
export const isLockingReason = (reasonCategory: string) =>
  reasonCategory === CANCELLATION_REJECTED_REASON ||
  reasonCategory.endsWith(TIMED_OUT_SUFFIX);

export const transactionStateInclude = {
  offer: { select: { additionalMoney: true } },
  shipment: true,
  payments: { orderBy: [{ createdAt: 'desc' }, { paymentId: 'desc' }] },
  cancellations: {
    orderBy: [{ requestedAt: 'desc' }, { cancellationId: 'desc' }],
    take: 1,
  },
  refund: {
    include: {
      slips: { orderBy: [{ createdAt: 'desc' }, { refundSlipId: 'desc' }] },
    },
  },
} satisfies Prisma.TransactionInclude;

export type TransactionWithChildren = Prisma.TransactionGetPayload<{
  include: typeof transactionStateInclude;
}>;

type Db = Pick<Prisma.TransactionClient, 'transaction' | 'report'>;

/** The open system report locking a deal, and when it was filed. */
export interface LockingReport {
  reportId: number;
  createdAt: Date | null;
}

export interface TransactionState {
  transactionId: number;
  postId: number;
  offerId: number | null;
  buyerId: number;
  sellerId: number;
  quantity: number | null;
  totalAmount: number;
  status: string | null;
  deliveryMethod: string;
  createdAt: Date | null;
  itemReceivedConfirmedByBuyerAt: Date | null;
  itemReceivedConfirmedBySellerAt: Date | null;
  /** The open system report locking this deal, if any. */
  activeReportId: number | null;
  activeReportCreatedAt: Date | null;
  /** The slip awaiting review or already confirmed; null once rejected. */
  slipImageUrl: string | null;
  /** Set while the buyer's claim to have paid still stands. */
  paymentConfirmedByBuyerAt: Date | null;
  paymentConfirmedBySellerAt: Date | null;
  /** Why the seller turned the latest slip down; null unless it was rejected. */
  paymentRejectionReason: string | null;
  trackingNumber: string | null;
  estimatedDeliveryDate: Date | null;
  shippedAt: Date | null;
  cancellationRequestedBy: number | null;
  cancellationReason: string | null;
  cancellationRequestedAt: Date | null;
  cancellationResponse: string | null;
  /** When the other party answered (or the deadline ran out); null while open. */
  cancellationRespondedAt: Date | null;
  refundSlipUrl: string | null;
  refundSubmittedAt: Date | null;
  refundConfirmedByBuyer: boolean;
  refundConfirmedAt: Date | null;
  itemReturnConfirmedAt: Date | null;
}

/** `TransactionState` plus the child-row ids the writes need. */
export interface TransactionSnapshot extends TransactionState {
  /** A straight purchase always pays; a trade pays only its cash top-up. */
  paymentRequired: boolean;
  paymentId: number | null;
  cancellationId: number | null;
  refundSlipId: number | null;
}

const isOpen = (status: string | null) =>
  status === PaymentStatus.Pending || status === PaymentStatus.Confirmed;

export function toTransactionSnapshot(
  row: TransactionWithChildren,
  lock: LockingReport | null,
): TransactionSnapshot {
  const paymentRequired =
    row.offerId === null || Number(row.offer?.additionalMoney ?? 0) > 0;

  const latestPayment = row.payments[0] ?? null;
  const payment =
    latestPayment && isOpen(latestPayment.status) ? latestPayment : null;
  const fallbackDate = row.createdAt ?? new Date(0);

  // The buyer's claim to have paid. An open slip carries it; so does a
  // rejected one while the deal is still being settled (the money may really
  // have been sent). It lapses once a rejected slip's money is back with the
  // buyer, which returns the deal to Pending — and Cancelled is only ever
  // reached from there without a claim.
  let paymentConfirmedByBuyerAt: Date | null = null;
  if (payment) {
    paymentConfirmedByBuyerAt = payment.createdAt ?? fallbackDate;
  } else if (latestPayment) {
    const lapsed =
      row.status === TransactionStatus.Pending ||
      row.status === TransactionStatus.Cancelled;
    if (!lapsed)
      paymentConfirmedByBuyerAt = latestPayment.createdAt ?? fallbackDate;
  } else if (
    paymentRequired &&
    (row.status === TransactionStatus.Processing ||
      row.status === TransactionStatus.PendingRefund)
  ) {
    // Rejected before schema v3, when a rejection only cleared the slip: the
    // migration had no row to move, so the upload time is gone.
    paymentConfirmedByBuyerAt = fallbackDate;
  }

  const cancellation = row.cancellations[0] ?? null;
  const refundSlip = row.refund?.slips.find((s) => isOpen(s.status)) ?? null;

  return {
    transactionId: row.transactionId,
    postId: row.postId,
    offerId: row.offerId,
    buyerId: row.buyerId,
    sellerId: row.sellerId,
    quantity: row.quantity,
    totalAmount: Number(row.totalAmount),
    status: row.status,
    deliveryMethod: row.deliveryMethod,
    createdAt: row.createdAt,
    itemReceivedConfirmedByBuyerAt: row.itemReceivedConfirmedByBuyerAt,
    itemReceivedConfirmedBySellerAt: row.itemReceivedConfirmedBySellerAt,
    activeReportId: lock?.reportId ?? null,
    activeReportCreatedAt: lock?.createdAt ?? null,
    slipImageUrl: payment?.slipImageUrl ?? null,
    paymentConfirmedByBuyerAt,
    paymentConfirmedBySellerAt:
      payment?.status === PaymentStatus.Confirmed
        ? (payment.handledAt ?? payment.createdAt ?? fallbackDate)
        : null,
    paymentRejectionReason:
      !payment && latestPayment?.status === PaymentStatus.Rejected
        ? latestPayment.rejectionReason
        : null,
    trackingNumber: row.shipment?.trackingNumber ?? null,
    estimatedDeliveryDate: row.shipment?.estimatedDeliveryDate ?? null,
    shippedAt: row.shipment?.shippedAt ?? null,
    cancellationRequestedBy: cancellation?.requestedBy ?? null,
    cancellationReason: cancellation?.reason ?? null,
    cancellationRequestedAt: cancellation
      ? (cancellation.requestedAt ?? fallbackDate)
      : null,
    cancellationResponse: cancellation?.response ?? null,
    cancellationRespondedAt: cancellation?.respondedAt ?? null,
    refundSlipUrl: refundSlip?.refundSlipUrl ?? null,
    refundSubmittedAt: refundSlip
      ? (refundSlip.createdAt ?? fallbackDate)
      : null,
    refundConfirmedByBuyer: refundSlip?.status === PaymentStatus.Confirmed,
    refundConfirmedAt:
      refundSlip?.status === PaymentStatus.Confirmed
        ? (refundSlip.handledAt ?? refundSlip.createdAt ?? fallbackDate)
        : null,
    itemReturnConfirmedAt: row.refund?.itemReturnConfirmedAt ?? null,
    paymentRequired,
    paymentId: payment?.paymentId ?? null,
    cancellationId: cancellation?.cancellationId ?? null,
    refundSlipId: refundSlip?.refundSlipId ?? null,
  };
}

/** Drops the write-side ids, leaving the row shape the API has always sent. */
export function toTransactionState(
  snapshot: TransactionSnapshot,
): TransactionState {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { paymentRequired, paymentId, cancellationId, refundSlipId, ...state } =
    snapshot;
  return state;
}

/** transactionId → the open system report locking it. */
export async function findLockingReports(
  db: Db,
  transactionIds: number[],
): Promise<Map<number, LockingReport>> {
  const locks = new Map<number, LockingReport>();
  if (transactionIds.length === 0) return locks;
  const reports = await db.report.findMany({
    where: {
      reportType: ReportType.Transaction,
      targetId: { in: transactionIds },
      status: { in: [ReportStatus.Pending, ReportStatus.Under_Investigation] },
      OR: [
        { reasonCategory: CANCELLATION_REJECTED_REASON },
        { reasonCategory: { endsWith: TIMED_OUT_SUFFIX } },
      ],
    },
    select: { reportId: true, targetId: true, createdAt: true },
    orderBy: { reportId: 'asc' },
  });
  for (const report of reports) {
    if (!locks.has(report.targetId))
      locks.set(report.targetId, {
        reportId: report.reportId,
        createdAt: report.createdAt,
      });
  }
  return locks;
}

export async function loadTransactionSnapshot(
  db: Db,
  transactionId: number,
): Promise<TransactionSnapshot | null> {
  const row = await db.transaction.findUnique({
    where: { transactionId },
    include: transactionStateInclude,
  });
  if (!row) return null;
  const locks = await findLockingReports(db, [transactionId]);
  return toTransactionSnapshot(row, locks.get(transactionId) ?? null);
}
