import { transactionDeadline } from './transaction-deadline.service';
import type { TransactionState } from './transaction-state';

const now = new Date('2026-09-09T00:00:00Z');
const HOUR = 3600000;
const row = (fields: Partial<TransactionState>) =>
  ({
    buyerId: 1,
    sellerId: 2,
    activeReportId: null,
    ...fields,
  }) as TransactionState;

describe('Activity diagram timers', () => {
  it('allows 72 hours for cancellation responses and 24 hours for completed-deal return responses', () => {
    const base = {
      cancellationResponse: 'Pending',
      cancellationRequestedAt: now,
      cancellationRequestedBy: 1,
    };
    expect(
      transactionDeadline(row({ ...base, status: 'Processing' })),
    ).toMatchObject({ limit: 72 * HOUR, repeat: 8 * HOUR, actorId: 2 });
    expect(
      transactionDeadline(row({ ...base, status: 'Completed' })),
    ).toMatchObject({ limit: 24 * HOUR, repeat: 3 * HOUR, actorId: 2 });
  });
  it('starts refund timers from the submitted slip, with the completed-return branch allowing 72 hours', () => {
    expect(
      transactionDeadline(
        row({ status: 'Pending Refund', refundSubmittedAt: now }),
      ),
    ).toMatchObject({ startedAt: now, limit: 24 * HOUR });
    expect(
      transactionDeadline(
        row({
          status: 'Pending Refund',
          refundSubmittedAt: now,
          itemReceivedConfirmedByBuyerAt: now,
        }),
      ),
    ).toMatchObject({ startedAt: now, limit: 72 * HOUR });
  });
  it('uses estimated delivery plus three days and daily reminders without auto-completing delivery', () => {
    expect(
      transactionDeadline(
        row({
          status: 'Processing',
          trackingNumber: 'ABC',
          estimatedDeliveryDate: now,
        }),
      ),
    ).toMatchObject({ limit: 72 * HOUR, repeat: 24 * HOUR, escalate: false });
  });
  it('stops the seller confirmation timer on a rejected slip and runs no refund timer there', () => {
    const paid = { status: 'Processing', paymentConfirmedByBuyerAt: now };
    expect(
      transactionDeadline(row({ ...paid, slipImageUrl: 'slip.jpg' })),
    ).toMatchObject({ phase: 'payment-confirmation', actorId: 2 });
    expect(
      transactionDeadline(row({ ...paid, slipImageUrl: null })),
    ).toBeNull();
    expect(
      transactionDeadline(
        row({ ...paid, slipImageUrl: null, refundSubmittedAt: now }),
      ),
    ).toBeNull();
  });
  it('does not duplicate escalation while a report is active or after refund completion', () => {
    expect(
      transactionDeadline(
        row({
          status: 'Processing',
          paymentConfirmedByBuyerAt: now,
          activeReportId: 3,
        }),
      ),
    ).toBeNull();
    expect(
      transactionDeadline(row({ status: 'Refunded', refundSubmittedAt: now })),
    ).toBeNull();
  });
});
