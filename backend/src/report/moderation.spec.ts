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
    settleReportedTransaction: jest.fn(),
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

  it('notifies the warned user without offering an appeal, and nobody else', async () => {
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

    const sent = notificationsSent(prisma) as Array<{ body: string }>;
    expect(sent).toEqual([
      expect.objectContaining({
        userId: 9,
        title: 'You received a warning',
        href: '/account',
      }),
    ]);
    expect(sent[0].body).not.toContain('appeal');
  });

  it('refuses an appeal against a warning', async () => {
    const { prisma, appeals } = makeServices();
    prisma.report.findUnique.mockResolvedValue(
      reportRow({
        status: 'Violation_Confirmed',
        sanction: 'warn',
        handledBy: 1,
        handledAt: new Date(),
      }),
    );

    await expect(
      appeals.create(9, { report_id: 3, reason: 'I disagree' }),
    ).rejects.toThrow('A warning cannot be appealed');
    expect(prisma.appeal.create).not.toHaveBeenCalled();
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

describe('An admin suspends or reinstates an account by hand', () => {
  it('files a confirmed User report and suspends the account, appealable', async () => {
    const { prisma, reports } = makeServices();
    prisma.user.findUnique.mockResolvedValue({
      userId: 9,
      status: 'Active',
      isAdmin: false,
    });
    prisma.report.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({
        reportId: 12,
        ...data,
      }),
    );

    const result = await reports.sanctionUser(
      9,
      1,
      'suspend_temporary',
      'Repeated no-shows at meetups',
    );

    const [[created]] = prisma.report.create.mock.calls as [
      [{ data: Record<string, unknown> }],
    ];
    expect(created.data).toEqual(
      expect.objectContaining({
        reporterId: 1,
        reportType: 'User',
        targetId: 9,
        reasonCategory: 'Admin action',
        status: 'Violation_Confirmed',
        sanction: 'suspend_temporary',
        handledBy: 1,
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { userId: 9 },
      data: { status: 'Suspended' },
    });
    expect(notificationsSent(prisma)).toEqual([
      expect.objectContaining({ userId: 9, href: '/account/appeals' }),
    ]);
    expect(result).toMatchObject({ report_id: 12, status: 'Suspended' });
    expect(result.ends_at).toBeInstanceOf(Date);
  });

  it('refuses to suspend an admin or the acting admin', async () => {
    const { prisma, reports } = makeServices();
    await expect(
      reports.sanctionUser(1, 1, 'suspend_permanent', 'Testing a self ban'),
    ).rejects.toThrow('your own account');
    prisma.user.findUnique.mockResolvedValue({
      userId: 2,
      status: 'Active',
      isAdmin: true,
    });
    await expect(
      reports.sanctionUser(2, 1, 'suspend_permanent', 'Testing an admin ban'),
    ).rejects.toThrow('admin account');
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it('reinstating dismisses every verdict still holding the account and reactivates it', async () => {
    const { prisma, reports } = makeServices();
    prisma.$transaction.mockImplementation((ops: unknown) =>
      Promise.all(ops as Promise<unknown>[]),
    );
    prisma.user.findUnique.mockResolvedValue({ userId: 9, status: 'Banned' });
    const now = new Date();
    prisma.report.findMany.mockResolvedValue([
      reportRow({
        reportId: 3,
        status: 'Violation_Confirmed',
        sanction: 'suspend_permanent',
        handledAt: now,
      }),
      reportRow({
        reportId: 4,
        status: 'Violation_Confirmed',
        sanction: 'warn',
        handledAt: now,
      }),
      reportRow({
        reportId: 5,
        status: 'Violation_Confirmed',
        sanction: 'suspend_temporary',
        handledAt: new Date(now.getTime() - 30 * 86_400_000),
      }),
    ]);
    // Read by verdictsAgainst before it looks up the reports.
    (prisma as unknown as { post: { findMany: jest.Mock } }).post.findMany =
      jest.fn().mockResolvedValue([]);
    (
      prisma as unknown as { transaction: { findMany: jest.Mock } }
    ).transaction.findMany = jest.fn().mockResolvedValue([]);

    const result = await reports.reinstateUser(9, 1, 'Mistaken identity');

    const [[dismissed]] = prisma.report.updateMany.mock.calls as [
      [{ where: unknown; data: Record<string, unknown> }],
    ];
    expect(dismissed.where).toEqual({ reportId: { in: [3] } });
    expect(dismissed.data).toEqual(
      expect.objectContaining({
        status: 'Report_Dismissed',
        handledBy: 1,
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { userId: 9 },
      data: { status: 'Active' },
    });
    expect(notificationsSent(prisma)).toEqual([
      expect.objectContaining({ userId: 9, title: 'Your account is restored' }),
    ]);
    expect(result.reversed_report_ids).toEqual([3]);
    // An appeal still open on the reversed verdict is closed as upheld, and
    // a post hidden by a verdict is not put back on the market.
    const [[closed]] = prisma.appeal.updateMany.mock.calls as [
      [{ where: unknown; data: Record<string, unknown> }],
    ];
    expect(closed.where).toEqual({
      reportId: { in: [3] },
      status: { in: ['Pending', 'Under_Review'] },
    });
    expect(closed.data.status).toBe('Approved');
    expect(prisma.post.update).not.toHaveBeenCalled();
  });

  it('refuses to reinstate an account that is not suspended', async () => {
    const { prisma, reports } = makeServices();
    prisma.user.findUnique.mockResolvedValue({ userId: 9, status: 'Active' });
    await expect(reports.reinstateUser(9, 1, null)).rejects.toThrow(
      'not suspended',
    );
  });
});
