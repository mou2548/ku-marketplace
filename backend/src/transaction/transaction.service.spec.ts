import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Transaction } from '@prisma/client';
import { TransactionService } from './transaction.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { RedisService } from '../redis/redis.service';

const paidAt = new Date('2026-09-09T00:00:00Z');
const row = (fields: Partial<Transaction> = {}) =>
  ({
    transactionId: 7,
    offerId: null,
    buyerId: 1,
    sellerId: 2,
    status: 'Processing',
    activeReportId: null,
    cancellationResponse: null,
    slipImageUrl: 'https://example.com/slip.jpg',
    paymentConfirmedByBuyerAt: paidAt,
    paymentConfirmedBySellerAt: null,
    itemReceivedConfirmedByBuyerAt: null,
    refundSlipUrl: null,
    refundSubmittedAt: null,
    refundConfirmedByBuyer: false,
    ...fields,
  }) as Transaction;
/** Processing with the buyer's claim on record but the slip taken off file. */
const rejected = (fields: Partial<Transaction> = {}) =>
  row({ slipImageUrl: null, ...fields });
const refundUrl = 'https://example.com/refund.jpg';

function setup(current: Transaction) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    transaction: {
      findUnique: jest.fn().mockResolvedValue(current),
      update: jest.fn().mockResolvedValue(current),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    notification: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  } as unknown as PrismaService;
  const service = new TransactionService(prisma, {} as RedisService);
  return { service, tx };
}

describe('TransactionService.rejectPaymentSlip', () => {
  it('takes the slip off file, keeps the transaction Processing and notifies the buyer', async () => {
    const { service, tx } = setup(row());
    await service.rejectPaymentSlip(7, 2);
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { transactionId: 7 },
      data: { slipImageUrl: null },
    });
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 1,
        eventKey: `transaction:7:payment-slip-rejected:${paidAt.getTime()}`,
      }) as unknown,
    });
  });

  it('is seller-only', async () => {
    const { service, tx } = setup(row());
    await expect(service.rejectPaymentSlip(7, 1)).rejects.toThrow(
      ForbiddenException,
    );
    expect(tx.transaction.update).not.toHaveBeenCalled();
  });

  it.each([
    ['the slip was already rejected', { slipImageUrl: null }],
    ['the seller already confirmed', { paymentConfirmedBySellerAt: paidAt }],
    ['the handover is recorded', { itemReceivedConfirmedByBuyerAt: paidAt }],
    ['a cancellation is pending', { cancellationResponse: 'Pending' }],
    ['an admin is reviewing', { activeReportId: 3 }],
  ])('refuses when %s', async (_case, fields) => {
    const { service, tx } = setup(row(fields));
    await expect(service.rejectPaymentSlip(7, 2)).rejects.toThrow(
      BadRequestException,
    );
    expect(tx.transaction.update).not.toHaveBeenCalled();
  });
});

describe('TransactionService after a rejected slip', () => {
  const dataOf = (tx: ReturnType<typeof setup>['tx']) =>
    (
      tx.transaction.updateMany.mock.calls[0] as [
        { where: unknown; data: unknown },
      ]
    )[0];

  it('does not let the seller confirm a payment whose slip was rejected', async () => {
    const { service, tx } = setup(rejected());
    await expect(service.confirmPaymentReceived(7, 2)).rejects.toThrow(
      BadRequestException,
    );
    expect(tx.transaction.updateMany).not.toHaveBeenCalled();
  });

  it('lets the buyer send a new slip without leaving Processing', async () => {
    const { service, tx } = setup(rejected());
    await service.uploadPaymentSlip(7, 1, { slip_image_url: 'new.jpg' });
    expect(dataOf(tx)).toMatchObject({
      where: { slipImageUrl: null, refundSlipUrl: null, status: 'Processing' },
      data: { slipImageUrl: 'new.jpg', status: 'Processing' },
    });
  });

  it('makes the buyer answer a refund slip instead of sending a new payment slip', async () => {
    const { service, tx } = setup(rejected({ refundSlipUrl: refundUrl }));
    await expect(
      service.uploadPaymentSlip(7, 1, { slip_image_url: 'new.jpg' }),
    ).rejects.toThrow(BadRequestException);
    expect(tx.transaction.updateMany).not.toHaveBeenCalled();
  });

  it('records the seller refund slip without changing the status', async () => {
    const { service, tx } = setup(rejected());
    await service.uploadRefundSlip(7, 2, { refund_slip_url: refundUrl });
    const { data } = dataOf(tx);
    expect(data).toMatchObject({ refundSlipUrl: refundUrl });
    expect(data).not.toHaveProperty('status');
  });

  it('returns to Pending only once the buyer confirms the refund', async () => {
    const { service, tx } = setup(rejected({ refundSlipUrl: refundUrl }));
    await service.confirmRefund(7, 1);
    expect(dataOf(tx).data).toEqual({
      status: 'Pending',
      paymentConfirmedByBuyerAt: null,
      refundSlipUrl: null,
      refundSubmittedAt: null,
    });
  });

  it('refuses to confirm a refund the seller has not sent', async () => {
    const { service, tx } = setup(rejected());
    await expect(service.confirmRefund(7, 1)).rejects.toThrow(
      BadRequestException,
    );
    expect(tx.transaction.updateMany).not.toHaveBeenCalled();
  });
});
