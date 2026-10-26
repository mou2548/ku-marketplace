/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Prisma } from '@prisma/client';
import {
  liftExpiredSuspension,
  standingFromVerdicts,
  suspensionEndsAt,
  TEMPORARY_SUSPENSION_DAYS,
} from './account-standing';

const NOW = new Date('2026-10-06T12:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000);

const verdict = (fields: Record<string, unknown>) => ({
  reportId: 1,
  reporterId: 5,
  reportType: 'User',
  targetId: 9,
  status: 'Violation_Confirmed',
  sanction: 'suspend_temporary',
  handledAt: daysAgo(1),
  ...fields,
});

function makeDb(verdicts: Array<Record<string, unknown>>) {
  const db = {
    post: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
    transaction: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
    report: { findMany: jest.fn().mockResolvedValue(verdicts) },
    user: { updateMany: jest.fn() },
  };
  return { db, client: db as unknown as Prisma.TransactionClient };
}

describe('account standing', () => {
  it('ends a temporary suspension TEMPORARY_SUSPENSION_DAYS after the verdict', () => {
    expect(TEMPORARY_SUSPENSION_DAYS).toBe(3);
    expect(suspensionEndsAt(daysAgo(3)).getTime()).toBe(NOW.getTime());
  });

  it('keeps an account suspended while the suspension runs', async () => {
    const { client } = makeDb([verdict({ handledAt: daysAgo(2) })]);
    await expect(standingFromVerdicts(client, 9, { now: NOW })).resolves.toBe(
      'Suspended',
    );
  });

  it('restores an account once every suspension has run out', async () => {
    const { client } = makeDb([verdict({ handledAt: daysAgo(4) })]);
    await expect(standingFromVerdicts(client, 9, { now: NOW })).resolves.toBe(
      'Active',
    );
  });

  it('a ban outlasts an expired suspension', async () => {
    const { client } = makeDb([
      verdict({ reportId: 1, handledAt: daysAgo(4) }),
      verdict({ reportId: 2, sanction: 'suspend_permanent' }),
    ]);
    await expect(standingFromVerdicts(client, 9, { now: NOW })).resolves.toBe(
      'Banned',
    );
  });

  it('does not guess about a legacy verdict with no sanction', async () => {
    const { client } = makeDb([verdict({ sanction: null })]);
    await expect(
      standingFromVerdicts(client, 9, { now: NOW }),
    ).resolves.toBeNull();
  });

  it('ignores a transaction verdict filed by the user, not against them', async () => {
    const { db, client } = makeDb([
      verdict({ reportType: 'Transaction', targetId: 40, reporterId: 9 }),
    ]);
    db.transaction.findUnique.mockResolvedValue({ buyerId: 9, sellerId: 7 });
    await expect(standingFromVerdicts(client, 9, { now: NOW })).resolves.toBe(
      'Active',
    );
  });

  it('leaves out the verdict being reversed', async () => {
    const { db, client } = makeDb([]);
    await standingFromVerdicts(client, 9, { excludeReportId: 4, now: NOW });
    expect(db.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ reportId: { not: 4 } }),
      }),
    );
  });

  describe('liftExpiredSuspension', () => {
    beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
    afterEach(() => jest.useRealTimers());

    it('lifts a suspension whose time is up', async () => {
      const { db, client } = makeDb([verdict({ handledAt: daysAgo(4) })]);
      await expect(
        liftExpiredSuspension(client, { userId: 9, status: 'Suspended' }),
      ).resolves.toBe('Active');
      expect(db.user.updateMany).toHaveBeenCalledWith({
        where: { userId: 9, status: 'Suspended' },
        data: { status: 'Active' },
      });
    });

    it('leaves a running suspension in place', async () => {
      const { db, client } = makeDb([verdict({ handledAt: daysAgo(1) })]);
      await expect(
        liftExpiredSuspension(client, { userId: 9, status: 'Suspended' }),
      ).resolves.toBe('Suspended');
      expect(db.user.updateMany).not.toHaveBeenCalled();
    });

    it('never touches an account that is not suspended', async () => {
      const { db, client } = makeDb([]);
      await expect(
        liftExpiredSuspension(client, { userId: 9, status: 'Banned' }),
      ).resolves.toBe('Banned');
      expect(db.report.findMany).not.toHaveBeenCalled();
    });
  });
});
