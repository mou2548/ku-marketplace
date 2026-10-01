import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import type { Transaction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
export function transactionDeadline(t: Transaction): FlowDeadline | null {
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
  // A rejected slip (Processing, buyer's claim on record, no slip on file) puts
  // the seller's refund in front of the buyer on the same clock as any other.
  const slipRejected =
    t.status === 'Processing' && t.paymentConfirmedByBuyerAt && !t.slipImageUrl;
  if (
    (['Pending Refund', 'Cancelled'].includes(t.status ?? '') ||
      slipRejected) &&
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
        activeReportId: null,
      },
      select: { transactionId: true },
    });
    for (const row of rows) {
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "transaction_id" FROM "Transaction" WHERE "transaction_id" = ${row.transactionId} FOR UPDATE`;
        const t = await tx.transaction.findUniqueOrThrow({
          where: { transactionId: row.transactionId },
        });
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
          where: { eventKey: `${key}:${deadline.actorId}` },
          create: notification(deadline.actorId),
          update: {},
        });
        if (overdue && deadline.escalate) {
          const report = await tx.report.create({
            data: {
              reporterId: deadline.reporterId,
              reportType: 'Transaction',
              targetId: t.transactionId,
              reasonCategory: `${deadline.phase} timed out`,
              status: 'Pending',
              details: `No response before ${new Date(deadline.startedAt.getTime() + deadline.limit).toISOString()}.`,
            },
          });
          await tx.transaction.update({
            where: { transactionId: t.transactionId },
            data: {
              activeReportId: report.reportId,
              ...(t.cancellationResponse === 'Pending'
                ? { cancellationResponse: 'Rejected' }
                : {}),
            },
          });
          await tx.notification.upsert({
            where: { eventKey: `${key}:${deadline.reporterId}` },
            create: notification(deadline.reporterId),
            update: {},
          });
        }
      });
    }
  }
}
