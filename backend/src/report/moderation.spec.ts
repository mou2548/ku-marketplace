/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ReportService } from './report.service';
import { AppealService } from './appeal.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { TransactionService } from '../transaction/transaction.service';
import type { RedisService } from '../redis/redis.service';

const person = (userId: number, firstNameEn: string) => ({
  userId,
  firstNameEn,
  lastNameEn: 'Test',
  emailVerifiedAt: null,
});

const reportRow = (fields: Record<string, unknown> = {}) => ({
  reportId: 3,
  reporterId: 5,
  reportType: 'User',
  targetId: 9,
  reasonCategory: 'Scam',
  details: null,
  evidenceUrls: null,
  status: 'Pending',
  sanction: null,
  handledBy: null,
  resolutionNote: null,
  handledAt: null,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  reporter: person(5, 'Reporter'),
  handler: null,
  ...fields,
});

function makePrisma() {
  return {
    report: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    appeal: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    post: { findUnique: jest.fn(), update: jest.fn() },
    transaction: { findUnique: jest.fn() },
    notification: { createMany: jest.fn() },
    $transaction: jest.fn(),
  };
}

function makeServices() {
  const prisma = makePrisma();
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
    fn(prisma),
  );
  const transactionService = {
    settleCancellationDispute: jest.fn(),
  } as unknown as TransactionService;
  const redis = {
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn(),
  } as unknown as RedisService;
  const db = prisma as unknown as PrismaService;
  const reports = new ReportService(db, transactionService, redis);
  const appeals = new AppealService(db, reports);
  return { prisma, reports, appeals };
}

const notificationsSent = (prisma: ReturnType<typeof makePrisma>) =>
  prisma.notification.createMany.mock.calls.flatMap(
    ([args]: [{ data: unknown[] }]) => args.data,
  );

describe('Opening a case takes it on', () => {
  it('moves only a Pending report to Under_Investigation and records the opener', async () => {
    const { prisma, reports } = makeServices();
    prisma.report.findUnique.mockResolvedValue(reportRow());
    prisma.report.findUniqueOrThrow.mockResolvedValue(
      reportRow({ status: 'Under_Investigation', handledBy: 2 }),
    );

    const opened = await reports.open(3, 2);

    expect(prisma.report.updateMany).toHaveBeenCalledWith({
      where: { reportId: 3, status: 'Pending' },
      data: { status: 'Under_Investigation', handledBy: 2 },
    });
    expect(opened).toMatchObject({
      status: 'Under_Investigation',
      handled_by: 2,
    });
  });

  it('lets the admin who decided the report take its appeal', async () => {
    const { prisma, appeals } = makeServices();
    prisma.appeal.findUnique.mockResolvedValue({ appealId: 4 });
    prisma.appeal.findUniqueOrThrow.mockResolvedValue({
      appealId: 4,
      reportId: 3,
      appellantId: 9,
      reason: 'Not me',
      evidenceUrls: null,
      status: 'Under_Review',
      handledBy: 1,
      resolutionNote: null,
      createdAt: new Date(),
      handledAt: null,
      appellant: person(9, 'Accused'),
      report: { ...reportRow({ handledBy: 1 }), handler: person(1, 'One') },
    });

    const opened = await appeals.open(4, 1);

    expect(prisma.appeal.updateMany).toHaveBeenCalledWith({
      where: { appealId: 4, status: 'Pending' },
      data: { status: 'Under_Review', handledBy: 1 },
    });
    expect(opened.report).toMatchObject({ report_id: 3, handled_by: 1 });
  });
});

describe('Who hears about moderation', () => {
  it('notifies every active admin of a new report', async () => {
    const { prisma, reports } = makeServices();
    prisma.user.findUnique.mockResolvedValue({ userId: 9 });
    prisma.report.create.mockResolvedValue(reportRow());
    prisma.user.findMany.mockResolvedValue([{ userId: 1 }, { userId: 2 }]);

    await reports.create(5, {
      report_type: 'User',
      target_id: 9,
      reason_category: 'Scam',
    });

    expect(notificationsSent(prisma)).toEqual([
      expect.objectContaining({ userId: 1, href: '/admin/reports/3' }),
      expect.objectContaining({ userId: 2, href: '/admin/reports/3' }),
    ]);
  });

  it('never shows the reporter the outcome of their report', async () => {
    const { prisma, reports } = makeServices();
    prisma.report.findMany.mockResolvedValue([
      reportRow({
        status: 'Violation_Confirmed',
        resolutionNote: 'Banned',
        handledBy: 1,
        handledAt: new Date(),
        handler: person(1, 'One'),
      }),
    ]);

    const [mine] = await reports.findAllForUser(5);

    expect(mine).not.toHaveProperty('status');
    expect(mine).not.toHaveProperty('resolution_note');
    expect(mine).not.toHaveProperty('handler');
    expect(mine).not.toHaveProperty('handled_at');
  });

  it('notifies the warned user, with the appeal deadline, and nobody else', async () => {
    const { prisma, reports } = makeServices();
    const handledAt = new Date('2026-10-05T10:00:00Z');
    prisma.report.findUnique.mockResolvedValue(reportRow());
    prisma.report.update.mockResolvedValue(
      reportRow({
        status: 'Violation_Confirmed',
        sanction: 'warn',
        resolutionNote: 'Repeated spam listings.',
        handledBy: 2,
        handledAt,
      }),
    );

    await reports.resolve(3, 2, {
      status: 'Violation_Confirmed',
      sanction: 'warn',
      resolution_note: 'Repeated spam listings.',
    });

    expect(notificationsSent(prisma)).toEqual([
      expect.objectContaining({
        userId: 9,
        title: 'You received a warning',
        body: expect.stringContaining('You can appeal until 2026-10-12.'),
      }),
    ]);
  });

  it('sends no notification when a report is dismissed', async () => {
    const { prisma, reports } = makeServices();
    prisma.report.findUnique.mockResolvedValue(reportRow());
    prisma.report.update.mockResolvedValue(
      reportRow({ status: 'Report_Dismissed', handledAt: new Date() }),
    );

    await reports.resolve(3, 2, {
      status: 'Report_Dismissed',
      resolution_note: 'No evidence of a scam.',
    });

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('lets the admin who decided the report decide the appeal, and tells the appellant', async () => {
    const { prisma, appeals } = makeServices();
    prisma.appeal.findUnique.mockResolvedValue({
      appealId: 4,
      reportId: 3,
      status: 'Under_Review',
    });
    prisma.appeal.update.mockResolvedValue({
      appealId: 4,
      reportId: 3,
      appellantId: 9,
      reason: 'Not me',
      evidenceUrls: null,
      status: 'Rejected',
      handledBy: 2,
      resolutionNote: 'The chat log shows the threat.',
      createdAt: new Date(),
      handledAt: new Date(),
      appellant: person(9, 'Accused'),
    });

    await appeals.decide(4, 1, {
      status: 'Rejected',
      resolution_note: 'The chat log shows the threat.',
    });

    expect(notificationsSent(prisma)).toEqual([
      expect.objectContaining({
        userId: 9,
        title: 'Your appeal was rejected',
      }),
    ]);
  });
});
