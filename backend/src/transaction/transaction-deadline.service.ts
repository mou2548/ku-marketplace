import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { notifyAdminsOfReport } from '../report/moderation-notifications';
import {
  findLockingReports,
  loadTransactionSnapshot,
  timedOutReason,
  type TransactionState,
} from './transaction-state';

const HOUR = 60 * 60 * 1000;
export interface FlowDeadline {
  phase: string;
  startedAt: Date;
  limit: number;
  repeat: number;
  actorId: number;
  reporterId: number;
  escalate: boolean;
}

/** Each timer starts at its triggering event, never at transaction creation. */
export function transactionDeadline(t: TransactionState): FlowDeadline | null {
  if (t.activeReportId) return null;
  if (t.cancellationResponse === 'Pending' && t.cancellationRequestedAt) {
    const returning = t.status === 'Completed';
    return {
      phase: returning ? 'return-response' : 'cancellation-response',
      startedAt: t.cancellationRequestedAt,
      limit: (returning ? 24 : 72) * HOUR,
      repeat: (returning ? 3 : 8) * HOUR,
      actorId: t.cancellationRequestedBy === t.buyerId ? t.sellerId : t.buyerId,
      reporterId: t.cancellationRequestedBy!,
      escalate: true,
    };
  }
  if (
    t.status === 'Processing' &&
    t.paymentConfirmedByBuyerAt &&
    t.slipImageUrl &&
    !t.paymentConfirmedBySellerAt
  ) {
    return {
      phase: 'payment-confirmation',
      startedAt: t.paymentConfirmedByBuyerAt,
      limit: 24 * HOUR,
      repeat: 8 * HOUR,
      actorId: t.sellerId,
      reporterId: t.buyerId,
      escalate: true,
    };
  }
  if (
    ['Pending Refund', 'Cancelled'].includes(t.status ?? '') &&
    t.refundSubmittedAt &&
    !t.refundConfirmedByBuyer
  ) {
    return {
      phase: 'refund-confirmation',
      startedAt: t.refundSubmittedAt,
      limit: (t.itemReceivedConfirmedByBuyerAt ? 72 : 24) * HOUR,
      repeat: 8 * HOUR,
      actorId: t.buyerId,
      reporterId: t.sellerId,
      escalate: true,
    };
  }
  if (
    t.status === 'Processing' &&
    t.trackingNumber &&
    t.estimatedDeliveryDate &&
    !t.itemReceivedConfirmedByBuyerAt
  ) {
    return {
      phase: 'delivery-confirmation',
      startedAt: t.estimatedDeliveryDate,
      limit: 72 * HOUR,
      repeat: 24 * HOUR,
      actorId: t.buyerId,
      reporterId: t.sellerId,
      escalate: false,
    };
  }
  return null;
}

@Injectable()
export class TransactionDeadlineService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TransactionDeadlineService.name);
  private running = false;
  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    await this.sweep();
  }

  @Interval('transaction-flow-deadlines', 30_000)
  async sweep() {
    if (this.running) return;
    this.running = true;
    try {
      await this.processDue();
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error));
    } finally {
      this.running = false;
    }
  }

  async processDue(now = new Date()) {
    const rows = await this.prisma.transaction.findMany({
      where: {
        status: {
          in: ['Processing', 'Completed', 'Pending Refund', 'Cancelled'],
        },
      },
      select: { transactionId: true },
    });
    // A deal already with an admin has no clock running; skip it up front.
    const locked = await findLockingReports(
      this.prisma,
      rows.map((row) => row.transactionId),
    );
    for (const row of rows) {
      if (locked.has(row.transactionId)) continue;
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "transaction_id" FROM "Transaction" WHERE "transaction_id" = ${row.transactionId} FOR UPDATE`;
        const t = await loadTransactionSnapshot(tx, row.transactionId);
        if (!t) return;
        const deadline = transactionDeadline(t);
        if (!deadline) return;
        const elapsed = now.getTime() - deadline.startedAt.getTime();
        if (elapsed < 0) return;
        if (!deadline.escalate && elapsed < deadline.limit) return;
        const overdue = elapsed >= deadline.limit;
        const slot = Math.floor(elapsed / deadline.repeat);
        const key = `${t.transactionId}:${deadline.phase}:${deadline.startedAt.getTime()}:${overdue && deadline.escalate ? 'overdue' : slot}`;
        const notification = (userId: number) => ({
          userId,
          eventKey: `${key}:${userId}`,
          title: overdue
            ? 'Transaction response overdue'
            : 'Transaction action required',
          body: `${deadline.phase.replaceAll('-', ' ')}: please review transaction #${t.transactionId}.`,
          href: `/history/${t.transactionId}`,
          createdAt: now,
        });
        await tx.notification.upsert({
          where: {
            userId_eventKey: {
              userId: deadline.actorId,
              eventKey: `${key}:${deadline.actorId}`,
            },
          },
          create: notification(deadline.actorId),
          update: {},
        });
        if (overdue && deadline.escalate) {
          const report = await tx.report.create({
            data: {
              reporterId: deadline.reporterId,
              reportType: 'Transaction',
              targetId: t.transactionId,
              reasonCategory: timedOutReason(deadline.phase),
              status: 'Pending',
              details: `No response before ${new Date(deadline.startedAt.getTime() + deadline.limit).toISOString()}.`,
            },
          });
          await notifyAdminsOfReport(tx, report);
          // The open report is what locks the deal from here. An unanswered
          // cancellation counts as refused, which is what the admin rules on.
          if (t.cancellationResponse === 'Pending' && t.cancellationId) {
            await tx.transactionCancellation.update({
              where: { cancellationId: t.cancellationId },
              data: { response: 'Rejected', respondedAt: now },
            });
          }
          await tx.notification.upsert({
            where: {
              userId_eventKey: {
                userId: deadline.reporterId,
                eventKey: `${key}:${deadline.reporterId}`,
              },
            },
            create: notification(deadline.reporterId),
            update: {},
          });
        }
      });
    }
  }
}
