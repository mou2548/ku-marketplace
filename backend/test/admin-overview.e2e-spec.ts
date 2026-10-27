import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { AdminService } from '../src/admin/admin.service';
import { ReportService } from '../src/report/report.service';
import { PrismaService } from '../src/prisma/prisma.service';
import type { TransactionService } from '../src/transaction/transaction.service';
import type { RedisService } from '../src/redis/redis.service';
import { freshInstallSql } from './schema-v3';

describe('Admin overview', () => {
  const schema = `admin_overview_${process.pid}_${Date.now()}`;
  let pool: Pool;
  let prisma: PrismaClient;
  let admin: AdminService;
  let reports: ReportService;

  /** A deal on the seed's post 1 (owned by user 3), created at `at`. */
  const deal = (
    at: string,
    status: string,
    totalAmount: number,
    quantity = 1,
  ) =>
    prisma.transaction.create({
      data: {
        postId: 1,
        buyerId: 4,
        sellerId: 3,
        quantity,
        totalAmount,
        status,
        deliveryMethod: 'Meetup',
        createdAt: new Date(at),
      },
    });

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const connection = await pool.connect();
    try {
      await connection.query(`CREATE SCHEMA "${schema}"`);
      await connection.query(`SET search_path TO "${schema}"`);
      await connection.query(freshInstallSql());
    } finally {
      connection.release();
    }
    prisma = new PrismaClient({
      adapter: new PrismaPg(
        {
          connectionString: process.env.DATABASE_URL!,
          options: `-c search_path=${schema}`,
        },
        { schema },
      ),
    });
    const db = prisma as unknown as PrismaService;
    admin = new AdminService(db);
    reports = new ReportService(
      db,
      {} as TransactionService,
      {} as RedisService,
    );
    // Only the deals made here count, so the totals below are exact.
    await prisma.transaction.updateMany({
      data: { createdAt: new Date('2020-01-01T00:00:00Z') },
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    if (pool) {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await pool.end();
    }
  });

  it('totals sales from Completed and in-flight deals only, by Bangkok day', async () => {
    // 2026-10-04 23:30 UTC is already the 5th in Bangkok.
    await deal('2026-10-04T23:30:00Z', 'Completed', 5000, 2);
    await deal('2026-10-05T03:00:00Z', 'Processing', 2500);
    await deal('2026-10-06T03:00:00Z', 'Pending', 2500);
    await deal('2026-10-06T04:00:00Z', 'Cancelled', 9999);
    await deal('2026-10-06T05:00:00Z', 'Pending Refund', 7777);

    const overview = await admin.overview({
      from: '2026-10-05',
      to: '2026-10-06',
    });
    expect(overview.sales).toMatchObject({
      total_amount: 10000,
      completed_amount: 5000,
      ongoing_amount: 5000,
      transaction_count: 3,
      completed_count: 1,
      units_completed: 2,
      buy: { count: 3, amount: 10000 },
      trade: { count: 0, amount: 0 },
    });
    expect(
      overview.by_status.find((row) => row.status === 'Cancelled'),
    ).toEqual({ status: 'Cancelled', count: 1, amount: 9999 });

    const trend = await admin.trend({ from: '2026-10-04', to: '2026-10-06' });
    expect(trend.points).toEqual([
      { day: '2026-10-04', count: 0, completed_count: 0, amount: 0 },
      { day: '2026-10-05', count: 2, completed_count: 1, amount: 7500 },
      { day: '2026-10-06', count: 1, completed_count: 0, amount: 2500 },
    ]);

    const top = await admin.topPosts({ from: '2026-10-05', to: '2026-10-06' });
    expect(top.posts[0]).toMatchObject({
      post_id: 1,
      units: 4,
      transaction_count: 3,
      amount: 10000,
    });
  });

  it('lists every deal and drills from a user down to an item', async () => {
    const page = await admin.transactions({
      status: 'Pending Refund',
      from: '2026-10-06',
      to: '2026-10-06',
    });
    expect(page.items).toEqual([
      expect.objectContaining({ total_amount: 7777, kind: 'buy' }),
    ]);

    const users = await admin.users({ q: 'user1@ku.th' });
    expect(users.items).toEqual([
      expect.objectContaining({ user_id: 3, email: 'user1@ku.th' }),
    ]);
    const seller = await admin.user(3);
    expect(seller.items.length).toBeGreaterThan(0);
    expect(seller.transactions.length).toBeGreaterThan(0);

    const items = await admin.items({ owner_id: '3' });
    expect(items.items.every((item) => item.owner.user_id === 3)).toBe(true);
    const item = await admin.item(items.items[0].item_id);
    expect(item.owner.user_id).toBe(3);

    const memberships = await admin.subscriptions({});
    expect(memberships.meta.total).toBeGreaterThan(0);
  });

  it('suspends an account by hand and reinstates it', async () => {
    const suspended = await reports.sanctionUser(
      5,
      1,
      'suspend_permanent',
      'Selling counterfeit tickets',
    );
    expect(suspended.status).toBe('Banned');
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { userId: 5 } })).status,
    ).toBe('Banned');
    expect((await admin.user(5)).verdicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ report_id: suspended.report_id }),
      ]),
    );

    const reinstated = await reports.reinstateUser(5, 1, null);
    expect(reinstated.reversed_report_ids).toContain(suspended.report_id);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { userId: 5 } })).status,
    ).toBe('Active');
    expect(
      (
        await prisma.report.findUniqueOrThrow({
          where: { reportId: suspended.report_id },
        })
      ).status,
    ).toBe('Report_Dismissed');
  });
});
