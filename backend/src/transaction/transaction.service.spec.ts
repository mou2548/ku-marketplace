import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import type { TransactionWithChildren } from './transaction-state';
import type { PrismaService } from '../prisma/prisma.service';
import type { RedisService } from '../redis/redis.service';

const paidAt = new Date('2026-09-09T00:00:00Z');
const refundUrl = 'https://example.com/refund.jpg';

type Payment = TransactionWithChildren['payments'][number];
type RefundSlip = NonNullable<
  TransactionWithChildren['refund']
>['slips'][number];
type Cancellation = TransactionWithChildren['cancellations'][number];

const payment = (fields: Partial<Payment> = {}) => ({
  paymentId: 11,
  transactionId: 7,
  slipImageUrl: 'https://example.com/slip.jpg',
  status: 'Pending',
  rejectionReason: null,
  handledBy: null,
  handledAt: null,
  createdAt: paidAt,
  ...fields,
});
const refundSlip = (fields: Partial<RefundSlip> = {}) => ({
  refundSlipId: 21,
  transactionId: 7,
  refundSlipUrl: refundUrl,
  status: 'Pending',
  rejectionReason: null,
  handledAt: null,
  createdAt: paidAt,
  ...fields,
});
const refund = (slips: RefundSlip[]) => ({
  transactionId: 7,
  itemReturnConfirmedAt: null,
  createdAt: paidAt,
  slips,
});
const cancellation = (fields: Partial<Cancellation> = {}) => ({
  cancellationId: 31,
  transactionId: 7,
  requestedBy: 1,
  reason: 'changed my mind',
  requestedAt: paidAt,
  response: 'Pending',
  respondedAt: null,
  ...fields,
});

/** A paid purchase whose slip is waiting for the seller. */
const row = (fields: Partial<TransactionWithChildren> = {}) =>
  ({
    transactionId: 7,
    postId: 4,
    offerId: null,
    buyerId: 1,
    sellerId: 2,
    quantity: 1,
    totalAmount: 100,
    status: 'Processing',
    deliveryMethod: 'Meetup',
    createdAt: paidAt,
    itemReceivedConfirmedByBuyerAt: null,
    itemReceivedConfirmedBySellerAt: null,
    offer: null,
    shipment: null,
    payments: [payment()],
    cancellations: [],
    refund: null,
    ...fields,
  }) as unknown as TransactionWithChildren;
/** Processing with the buyer's claim standing but the latest slip rejected. */
const rejected = (fields: Partial<TransactionWithChildren> = {}) =>
  row({ payments: [payment({ status: 'Rejected' })], ...fields });

const LOCK = [{ reportId: 30, targetId: 7 }];
const NO_MONEY = { reason: 'No money arrived' };

function setup(current: TransactionWithChildren, locks: typeof LOCK = []) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    transaction: {
      findUnique: jest.fn().mockResolvedValue(current),
      update: jest.fn().mockResolvedValue(current),
    },
    transactionPayment: {
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    transactionRefund: {
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    transactionRefundSlip: {
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    transactionCancellation: {
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    report: {
      findMany: jest.fn().mockResolvedValue(locks),
      findUnique: jest.fn().mockResolvedValue({
        reportType: 'Transaction',
        targetId: 7,
        reasonCategory: 'payment-confirmation timed out',
      }),
    },
    post: { update: jest.fn().mockResolvedValue({}) },
    notification: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  } as unknown as PrismaService;
  const service = new TransactionService(prisma, {} as RedisService);
  const writes = () =>
    [
      tx.transaction.update,
      tx.transactionPayment.create,
      tx.transactionPayment.update,
      tx.transactionRefund.upsert,
      tx.transactionRefund.deleteMany,
      tx.transactionRefundSlip.create,
      tx.transactionRefundSlip.update,
      tx.transactionRefundSlip.deleteMany,
      tx.transactionCancellation.create,
      tx.transactionCancellation.update,
      tx.post.update,
    ].reduce((count, mock) => count + mock.mock.calls.length, 0);
  return { service, tx, writes };
}

describe('TransactionService.rejectPaymentSlip', () => {
  it('marks the slip Rejected, keeps the transaction Processing and notifies the buyer', async () => {
    const { service, tx } = setup(row());
    await service.rejectPaymentSlip(7, 2, NO_MONEY);
    expect(tx.transactionPayment.update).toHaveBeenCalledWith({
      where: { paymentId: 11 },
      data: expect.objectContaining({
        status: 'Rejected',
        rejectionReason: 'No money arrived',
        handledBy: 2,
      }) as unknown,
    });
    expect(tx.transaction.update).not.toHaveBeenCalled();
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 1,
        eventKey: 'transaction:7:payment-slip-rejected:11',
        body: expect.stringContaining('No money arrived') as unknown,
      }) as unknown,
    });
  });

  it('is seller-only', async () => {
    const { service, writes } = setup(row());
    await expect(service.rejectPaymentSlip(7, 1, NO_MONEY)).rejects.toThrow(
      ForbiddenException,
    );
    expect(writes()).toBe(0);
  });

  it.each<[string, TransactionWithChildren, typeof LOCK]>([
    ['the slip was already rejected', rejected(), []],
    [
      'the seller already confirmed',
      row({ payments: [payment({ status: 'Confirmed', handledAt: paidAt })] }),
      [],
    ],
    [
      'the handover is recorded',
      row({ itemReceivedConfirmedByBuyerAt: paidAt }),
      [],
    ],
    ['a cancellation is pending', row({ cancellations: [cancellation()] }), []],
    ['an admin is reviewing', row(), LOCK],
  ])('refuses when %s', async (_case, current, locks) => {
    const { service, writes } = setup(current, locks);
    await expect(service.rejectPaymentSlip(7, 2, NO_MONEY)).rejects.toThrow(
      BadRequestException,
    );
    expect(writes()).toBe(0);
  });
});

describe('TransactionService after a rejected slip', () => {
  it('does not let the seller confirm a payment whose slip was rejected', async () => {
    const { service, writes } = setup(rejected());
    await expect(service.confirmPaymentReceived(7, 2)).rejects.toThrow(
      BadRequestException,
    );
    expect(writes()).toBe(0);
  });

  it('lets the buyer send a new slip without leaving Processing', async () => {
    const { service, tx } = setup(rejected());
    await service.uploadPaymentSlip(7, 1, { slip_image_url: 'new.jpg' });
    expect(tx.transactionPayment.create).toHaveBeenCalledWith({
      data: { transactionId: 7, slipImageUrl: 'new.jpg' },
    });
    expect(tx.transaction.update).not.toHaveBeenCalled();
  });

  it('keeps a pre-v3 rejection (no slip rows at all) open to a new slip', async () => {
    const { service, tx } = setup(row({ payments: [] }));
    await service.uploadPaymentSlip(7, 1, { slip_image_url: 'new.jpg' });
    expect(tx.transactionPayment.create).toHaveBeenCalled();
    expect(tx.transaction.update).not.toHaveBeenCalled();
  });

  it('makes the buyer answer a refund slip instead of sending a new payment slip', async () => {
    const { service, writes } = setup(
      rejected({ refund: refund([refundSlip()]) }),
    );
    await expect(
      service.uploadPaymentSlip(7, 1, { slip_image_url: 'new.jpg' }),
    ).rejects.toThrow(BadRequestException);
    expect(writes()).toBe(0);
  });

  it('records the seller refund slip without changing the status', async () => {
    const { service, tx } = setup(rejected());
    await service.uploadRefundSlip(7, 2, { refund_slip_url: refundUrl });
    expect(tx.transactionRefundSlip.create).toHaveBeenCalledWith({
      data: { transactionId: 7, refundSlipUrl: refundUrl },
    });
    expect(tx.transaction.update).not.toHaveBeenCalled();
  });

  it('returns to Pending only once the buyer confirms the refund', async () => {
    const { service, tx } = setup(rejected({ refund: refund([refundSlip()]) }));
    await service.confirmRefund(7, 1);
    expect(tx.transactionRefundSlip.deleteMany).toHaveBeenCalledWith({
      where: { transactionId: 7 },
    });
    expect(tx.transactionRefund.deleteMany).toHaveBeenCalledWith({
      where: { transactionId: 7 },
    });
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { transactionId: 7 },
      data: { status: 'Pending' },
    });
    // The rejected slip itself stays on record.
    expect(tx.transactionPayment.update).not.toHaveBeenCalled();
  });

  it('refuses to confirm a refund the seller has not sent', async () => {
    const { service, writes } = setup(rejected());
    await expect(service.confirmRefund(7, 1)).rejects.toThrow(
      BadRequestException,
    );
    expect(writes()).toBe(0);
  });
});

describe('TransactionService payment and cancellation rows', () => {
  it('opens a slip row and moves a Pending deal to Processing', async () => {
    const { service, tx } = setup(row({ status: 'Pending', payments: [] }));
    await service.uploadPaymentSlip(7, 1, { slip_image_url: 'slip.jpg' });
    expect(tx.transactionPayment.create).toHaveBeenCalledWith({
      data: { transactionId: 7, slipImageUrl: 'slip.jpg' },
    });
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { transactionId: 7 },
      data: { status: 'Processing' },
    });
  });

  it('confirms the open slip on the seller’s say-so', async () => {
    const { service, tx } = setup(row());
    await service.confirmPaymentReceived(7, 2);
    expect(tx.transactionPayment.update).toHaveBeenCalledWith({
      where: { paymentId: 11 },
      data: expect.objectContaining({
        status: 'Confirmed',
        handledBy: 2,
      }) as unknown,
    });
  });

  it('reports the deal in the flat shape the API has always sent', async () => {
    const { service } = setup(
      row({ payments: [payment({ status: 'Confirmed', handledAt: paidAt })] }),
    );
    const state = await service.requestCancellation(7, 1, { reason: 'late' });
    expect(state).toMatchObject({
      transactionId: 7,
      status: 'Processing',
      slipImageUrl: 'https://example.com/slip.jpg',
      paymentConfirmedByBuyerAt: paidAt,
      paymentConfirmedBySellerAt: paidAt,
      activeReportId: null,
    });
    expect(state).not.toHaveProperty('paymentId');
  });

  it('records a cancellation request and waits for consent once money has moved', async () => {
    const { service, tx } = setup(row());
    await service.requestCancellation(7, 1, { reason: 'late' });
    expect(tx.transactionCancellation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionId: 7,
        requestedBy: 1,
        reason: 'late',
        response: 'Pending',
        respondedAt: null,
      }) as unknown,
    });
    expect(tx.transaction.update).not.toHaveBeenCalled();
  });

  it('an approved cancellation after payment owes a refund and frees the stock', async () => {
    const { service, tx } = setup(row({ cancellations: [cancellation()] }));
    await service.respondToCancellation(7, 2, { response: 'Approved' });
    expect(tx.transactionCancellation.update).toHaveBeenCalledWith({
      where: { cancellationId: 31 },
      data: expect.objectContaining({ response: 'Approved' }) as unknown,
    });
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { transactionId: 7 },
      data: { status: 'Pending Refund' },
    });
    expect(tx.post.update).toHaveBeenCalled();
  });
});

describe('actions while a report locks the transaction', () => {
  it('refuses to confirm the payment slip', async () => {
    const { service, writes } = setup(row(), LOCK);
    await expect(service.confirmPaymentReceived(7, 2)).rejects.toThrow(
      'under admin review',
    );
    expect(writes()).toBe(0);
  });

  it('refuses a QR handover', async () => {
    const { service } = setup(row(), LOCK);
    await expect(service.generateQr(7, 2)).rejects.toThrow(
      'under admin review',
    );
  });
});

describe('TransactionService.settleReportedTransaction', () => {
  it('a dismissed report leaves the deal where it was', async () => {
    const { service, writes } = setup(row());
    await service.settleReportedTransaction(30, false);
    expect(writes()).toBe(0);
  });

  it('an upheld unconfirmed-slip report cancels the deal and owes the buyer a refund', async () => {
    const { service, tx } = setup(row());
    await service.settleReportedTransaction(30, true);
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { transactionId: 7 },
      data: { status: 'Pending Refund' },
    });
    expect(tx.post.update).toHaveBeenCalled();
  });

  it('an upheld rejected-cancellation report lets the cancellation take effect', async () => {
    const { service, tx } = setup(
      row({ cancellations: [cancellation({ response: 'Rejected' })] }),
    );
    await service.settleReportedTransaction(30, true);
    expect(tx.transactionCancellation.update).toHaveBeenCalledWith({
      where: { cancellationId: 31 },
      data: { response: 'Approved' },
    });
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { transactionId: 7 },
      data: { status: 'Pending Refund' },
    });
  });

  it('an upheld unconfirmed-refund report counts the refund as received', async () => {
    const { service, tx } = setup(
      row({ status: 'Pending Refund', refund: refund([refundSlip()]) }),
    );
    await service.settleReportedTransaction(30, true);
    expect(tx.transactionRefundSlip.update).toHaveBeenCalledWith({
      where: { refundSlipId: 21 },
      data: expect.objectContaining({ status: 'Confirmed' }) as unknown,
    });
    expect(tx.transaction.update).toHaveBeenLastCalledWith({
      where: { transactionId: 7 },
      data: { status: 'Refunded' },
    });
  });

  it('does nothing for a report a participant filed by hand, even when upheld', async () => {
    const { service, tx, writes } = setup(row());
    tx.report.findUnique.mockResolvedValue({
      reportType: 'Transaction',
      targetId: 7,
      reasonCategory: 'Did not pay, or a fake slip',
    });
    await service.settleReportedTransaction(30, true);
    expect(writes()).toBe(0);
  });

  it('does nothing for a report that is not about a transaction', async () => {
    const { service, tx, writes } = setup(row());
    tx.report.findUnique.mockResolvedValue({
      reportType: 'Post',
      targetId: 7,
      reasonCategory: 'payment-confirmation timed out',
    });
    await service.settleReportedTransaction(30, true);
    expect(writes()).toBe(0);
  });
});
