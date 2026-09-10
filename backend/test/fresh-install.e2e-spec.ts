import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { TransactionsService } from '../src/transactions/transactions.service';
import { AppointmentCardsService } from '../src/appointment-cards/appointment-cards.service';
import { ReportService } from '../src/report/report.service';
import { AppealService } from '../src/report/appeal.service';
import { ItemsService } from '../src/items/items.service';
import { MembershipService } from '../src/membership/membership.service';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PostsService } from '../src/posts/posts.service';
import { TransactionService } from '../src/transaction/transaction.service';
import { TransactionDeadlineService } from '../src/transaction/transaction-deadline.service';
import { GiveawaysService } from '../src/giveaways/giveaways.service';
import { GiveawayExpiryService } from '../src/giveaways/giveaway-expiry.service';
import { RedisService } from '../src/redis/redis.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('Fresh clone database', () => {
  const schema = `fresh_install_${process.pid}_${Date.now()}`;
  let pool: Pool;
  let prisma: PrismaClient;

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const connection = await pool.connect();
    try {
      await connection.query(`CREATE SCHEMA "${schema}"`);
      await connection.query(`SET search_path TO "${schema}"`);
      await connection.query(
        readFileSync(resolve(__dirname, '../../init.sql'), 'utf8'),
      );
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
  });

  beforeEach(async () => {
    // Keep marketplace fixtures independent of the seed's historical membership dates.
    await prisma.subscription.updateMany({
      where: { userId: 3 },
      data: {
        tier: 'Gold',
        status: 'Active',
        endDate: new Date(Date.now() + 86400000),
      },
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    if (pool) {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await pool.end();
    }
  });

  it('accepts a seeded offer and rejects its competitors without consuming unrelated offers', async () => {
    const service = new PostsService(prisma as unknown as PrismaService);
    await service.acceptOffer('3', '1', {}, 4);
    expect(
      (await prisma.offer.findUniqueOrThrow({ where: { offerId: 1 } })).status,
    ).toBe('Accepted');
    expect(
      (await prisma.offer.findUniqueOrThrow({ where: { offerId: 8 } })).status,
    ).toBe('Rejected');
    expect(
      (await prisma.offer.findUniqueOrThrow({ where: { offerId: 4 } })).status,
    ).toBe('Pending');
    expect(
      (await prisma.post.findUniqueOrThrow({ where: { postId: 3 } }))
        .quantityRemaining,
    ).toBe(0);
    await expect(service.acceptOffer('3', '8', {}, 4)).rejects.toThrow();
    await service.acceptOffer('5', '4', {}, 6);
    expect(
      (await prisma.offer.findUniqueOrThrow({ where: { offerId: 4 } })).status,
    ).toBe('Accepted');
  });

  it('rejects new offers using listed, deleted or reserved inventory and unavailable listings', async () => {
    const service = new PostsService(prisma as unknown as PrismaService);
    await expect(
      service.createOffer('7', { proposer_id: 3, item_ids: [1] }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.createOffer('7', { proposer_id: 5, item_ids: [6] }),
    ).rejects.toBeInstanceOf(ConflictException);
    const deleted = await prisma.item.create({
      data: {
        ownerId: 3,
        name: 'Deleted offered item',
        category: 'Books',
        condition: 'Good',
        deletedAt: new Date(),
      },
    });
    await expect(
      service.createOffer('7', { proposer_id: 3, item_ids: [deleted.itemId] }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.createOffer('4', { proposer_id: 3, item_ids: [17] }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.createOffer('3', { proposer_id: 3, item_ids: [17] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps remaining stock listed after a partial shipping sale and protects listed inventory', async () => {
    const posts = new PostsService(prisma as unknown as PrismaService);
    const items = new ItemsService(prisma as unknown as PrismaService);
    const service = transactionService();
    const item = await prisma.item.create({
      data: {
        ownerId: 3,
        name: 'Partial sale',
        category: 'Books',
        condition: 'Good',
        quantity: 2,
      },
    });
    const post = await posts.createPost(
      {
        item_id: item.itemId,
        post_type: 'SellOnly',
        price: 10,
        quantity_total: 2,
      },
      3,
    );
    await expect(items.remove(item.itemId, 3)).rejects.toThrow();
    await expect(
      items.update(item.itemId, { quantity: 1 }, 3),
    ).rejects.toThrow();
    const purchase = await posts.buyPost(post.post_id, {
      buyer_id: 4,
      delivery_method: 'Shipping',
    });
    const id = Number(purchase.transaction_id.replace('transaction_', ''));
    await service.uploadPaymentSlip(id, 4, {
      slip_image_url: 'https://example.test/payment.png',
    });
    await expect(service.confirmPaymentReceived(id, 5)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await service.confirmPaymentReceived(id, 3);
    await expect(service.confirmDelivery(id, 4)).rejects.toThrow();
    await service.ship(id, 3, {
      tracking_number: 'QA-SHIP',
      estimated_delivery_date: new Date(Date.now() + 86400000).toISOString(),
    });
    expect((await service.confirmDelivery(id, 4)).status).toBe('Completed');
    expect(
      (await prisma.item.findUniqueOrThrow({ where: { itemId: item.itemId } }))
        .status,
    ).toBe('Listed');
    expect(
      (await prisma.post.findUniqueOrThrow({ where: { itemId: item.itemId } }))
        .quantityRemaining,
    ).toBe(1);
    await expect(service.confirmDelivery(id, 4)).rejects.toThrow();
  });

  it('uses real Redis: one code per 15 minutes, reused while alive, wrong/expired/simultaneous scans', async () => {
    const prefix = `qa-qr:${process.pid}:${Date.now()}:`;
    const redis = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      keyPrefix: prefix,
      maxRetriesPerRequest: 1,
    });
    try {
      const service = new TransactionService(
        prisma as unknown as PrismaService,
        redis as unknown as RedisService,
      );
      const deal = await prisma.transaction.create({
        data: {
          postId: 1,
          buyerId: 4,
          sellerId: 3,
          deliveryMethod: 'Meetup',
          status: 'Processing',
          paymentConfirmedByBuyerAt: new Date(),
          paymentConfirmedBySellerAt: new Date(),
        },
      });
      await prisma.appointmentCard.create({
        data: {
          transactionId: deal.transactionId,
          proposedBy: 3,
          location: 'QA',
          date: new Date(),
          time: new Date(),
          status: 'Confirmed',
        },
      });
      const first = await service.generateQr(deal.transactionId, 3);
      expect(first.expiresInSeconds).toBeGreaterThan(0);
      await expect(
        service.scanQr(deal.transactionId, 5, { token: first.token }),
      ).rejects.toThrow();
      await expect(
        service.scanQr(deal.transactionId, 4, { token: 'wrong' }),
      ).rejects.toThrow();
      // Asking again while the code is still alive returns the SAME token with
      // the time it has left — one code per 15 minutes, not a fresh one per
      // open. So `first.token` also stays valid.
      const second = await service.generateQr(deal.transactionId, 3);
      expect(second.token).toBe(first.token);
      expect(second.expiresInSeconds).toBeLessThanOrEqual(
        first.expiresInSeconds,
      );
      await redis.pexpire(`qr_token:${deal.transactionId}`, 1);
      await new Promise((resolve) => setTimeout(resolve, 20));
      await expect(
        service.scanQr(deal.transactionId, 4, { token: second.token }),
      ).rejects.toThrow();
      // Once it has expired, the next request mints a genuinely new code.
      const third = await service.generateQr(deal.transactionId, 3);
      expect(third.token).not.toBe(first.token);
      const scans = await Promise.allSettled([
        service.scanQr(deal.transactionId, 4, { token: third.token }),
        service.scanQr(deal.transactionId, 4, { token: third.token }),
      ]);
      expect(scans.filter((scan) => scan.status === 'fulfilled')).toHaveLength(
        1,
      );
      expect(
        (
          await prisma.transaction.findUniqueOrThrow({
            where: { transactionId: deal.transactionId },
          })
        ).status,
      ).toBe('Completed');
    } finally {
      const cleanup = redis.duplicate({ keyPrefix: '' });
      const keys = await cleanup.keys(`${prefix}*`);
      if (keys.length) await cleanup.del(...keys);
      await cleanup.quit();
      await redis.quit();
    }
  });

  it('allows only one concurrent membership request and one payment decision', async () => {
    const service = new MembershipService(prisma as unknown as PrismaService);
    await prisma.subscriptionPayment.deleteMany({ where: { userId: 5 } });
    const requests = await Promise.allSettled([
      service.requestUpgrade(5, {
        requestedTier: 'Silver',
        proofImageUrl: 'https://example.test/member.png',
      }),
      service.requestUpgrade(5, {
        requestedTier: 'Silver',
        proofImageUrl: 'https://example.test/member.png',
      }),
    ]);
    expect(
      requests.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const payment = await prisma.subscriptionPayment.findFirstOrThrow({
      where: { userId: 5, status: 'Pending' },
    });
    const decisions = await Promise.allSettled([
      service.reviewPayment(payment.paymentId, 1, true),
      service.reviewPayment(payment.paymentId, 2, false, 'Rejected'),
    ]);
    expect(
      decisions.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const stored = await prisma.subscriptionPayment.findUniqueOrThrow({
      where: { paymentId: payment.paymentId },
    });
    if (stored.status === 'Verified')
      expect((await service.getStatus(5)).effectiveTier).toBe('Silver');
    await expect(
      service.reviewPayment(payment.paymentId, 1, true),
    ).rejects.toThrow();
  });

  it('rejects private transaction reports from outsiders and preserves other sanctions on appeal', async () => {
    const reports = new ReportService(
      prisma as unknown as PrismaService,
      transactionService(),
      {
        incr: () => Promise.resolve(1),
        expire: () => Promise.resolve(1),
      } as unknown as RedisService,
    );
    const appeals = new AppealService(
      prisma as unknown as PrismaService,
      reports,
    );
    const deal = await prisma.transaction.create({
      data: {
        postId: 1,
        buyerId: 4,
        sellerId: 3,
        status: 'Pending',
        deliveryMethod: 'Meetup',
      },
    });
    await expect(
      reports.create(5, {
        report_type: 'Transaction',
        target_id: deal.transactionId,
        reason_category: 'Other',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const target = await prisma.user.create({
      data: {
        email: 'appeal-target@ku.th',
        passwordHash: 'test-only',
        firstNameEn: 'Appeal',
        lastNameEn: 'Target',
        firstNameTh: 'Appeal',
        lastNameTh: 'Target',
      },
    });
    const targetId = target.userId;
    const first = await reports.create(4, {
      report_type: 'User',
      target_id: targetId,
      reason_category: 'Other',
    });
    const second = await reports.create(5, {
      report_type: 'User',
      target_id: targetId,
      reason_category: 'Other',
    });
    await reports.resolve(first.report_id, 1, {
      status: 'Violation_Confirmed',
      sanction: 'suspend_temporary',
    });
    await reports.resolve(second.report_id, 1, {
      status: 'Violation_Confirmed',
      sanction: 'suspend_permanent',
    });
    await expect(
      reports.findOneForUser(first.report_id, 5),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      appeals.create(5, { report_id: first.report_id, reason: 'Unrelated' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const appeal = await appeals.create(targetId, {
      report_id: first.report_id,
      reason: 'Please review the evidence again',
    });
    await expect(
      appeals.decide(appeal.appeal_id, 1, { status: 'Approved' }),
    ).rejects.toThrow();
    await appeals.decide(appeal.appeal_id, 2, { status: 'Approved' });
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { userId: targetId } }))
        .status,
    ).toBe('Banned');
    const other = await appeals.create(targetId, {
      report_id: second.report_id,
      reason: 'Independent review',
    });
    await appeals.decide(other.appeal_id, 2, { status: 'Approved' });
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { userId: targetId } }))
        .status,
    ).toBe('Active');
  });

  it('enforces the final monthly listing slot under concurrent requests', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'quota@ku.th',
        passwordHash: 'test-only',
        firstNameEn: 'Quota',
        lastNameEn: 'Test',
        firstNameTh: 'Quota',
        lastNameTh: 'Test',
        subscriptions: { create: { tier: 'Free', status: 'Active' } },
      },
    });
    const service = new PostsService(prisma as unknown as PrismaService);
    const items = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        prisma.item.create({
          data: {
            ownerId: user.userId,
            name: `Quota ${i}`,
            category: 'Books',
            condition: 'Good',
          },
        }),
      ),
    );
    for (const item of items.slice(0, 2))
      await service.createPost(
        { item_id: item.itemId, post_type: 'SellOnly', price: 10 },
        user.userId,
      );
    const results = await Promise.allSettled(
      items
        .slice(2)
        .map((item) =>
          service.createPost(
            { item_id: item.itemId, post_type: 'SellOnly', price: 10 },
            user.userId,
          ),
        ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const membership = new MembershipService(
      prisma as unknown as PrismaService,
    );
    expect((await membership.getStatus(user.userId)).postsRemaining).toBe(0);
    const now = new Date();
    await prisma.post.updateMany({
      where: { item: { ownerId: user.userId } },
      data: {
        createdAt: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 1,
        ),
      },
    });
    expect((await membership.getStatus(user.userId)).postsRemaining).toBe(3);
  });

  it('creates one chat under simultaneous reads and rejects superseded appointment responses', async () => {
    const chats = new TransactionsService(prisma as unknown as PrismaService);
    const appointments = new AppointmentCardsService(
      prisma as unknown as PrismaService,
      transactionService(),
    );
    const deal = await prisma.transaction.create({
      data: {
        postId: 1,
        buyerId: 4,
        sellerId: 3,
        status: 'Pending',
        deliveryMethod: 'Meetup',
      },
    });
    const rooms = await Promise.all([
      chats.getChatHistory(deal.transactionId, 3),
      chats.getChatHistory(deal.transactionId, 4),
    ]);
    expect(rooms[0].room_id).toBe(rooms[1].room_id);
    expect(
      await prisma.chatRoom.count({
        where: { transactionId: deal.transactionId },
      }),
    ).toBe(1);
    await expect(
      chats.getChatHistory(deal.transactionId, 5),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const first = await chats.createAppointment(
      deal.transactionId,
      { date: '2026-09-15', time: '12:00', location: 'First' },
      3,
    );
    await expect(
      appointments.respondToAppointment(
        first.appointment_id,
        { response: 'confirm' },
        3,
      ),
    ).rejects.toThrow();
    const second = await chats.createAppointment(
      deal.transactionId,
      { date: '2026-09-16', time: '12:00', location: 'Replacement' },
      3,
    );
    await expect(
      appointments.respondToAppointment(
        first.appointment_id,
        { response: 'confirm' },
        4,
      ),
    ).rejects.toThrow();
    const responses = await Promise.allSettled([
      appointments.respondToAppointment(
        second.appointment_id,
        { response: 'confirm' },
        4,
      ),
      appointments.respondToAppointment(
        second.appointment_id,
        { response: 'reject' },
        4,
      ),
    ]);
    expect(
      responses.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const notifications = await prisma.notification.findMany({
      where: { href: `/history/${deal.transactionId}` },
      orderBy: { notificationId: 'asc' },
    });
    expect(notifications).toHaveLength(3);
    expect(notifications[0]).toMatchObject({
      userId: 4,
      title: 'New meetup proposed',
    });
    expect(notifications[1]).toMatchObject({
      userId: 4,
      title: 'Meetup change proposed',
    });
    expect(notifications[1].body).toContain('2026-09-16 at 12:00, Replacement');
    expect(notifications[2].userId).toBe(3);
    expect(['Meetup confirmed', 'Meetup declined']).toContain(
      notifications[2].title,
    );
    expect(
      await prisma.notification.count({
        where: { userId: 5, href: `/history/${deal.transactionId}` },
      }),
    ).toBe(0);
    await transactionService().requestCancellation(deal.transactionId, 3, {
      reason: 'No longer needed',
    });
    await expect(
      chats.createAppointment(
        deal.transactionId,
        { date: '2026-09-17', time: '12:00', location: 'Too late' },
        4,
      ),
    ).rejects.toThrow();
  });

  it('declining a proposed meetup change does not fall back to the old Confirmed card for handover', async () => {
    const chats = new TransactionsService(prisma as unknown as PrismaService);
    const appointments = new AppointmentCardsService(
      prisma as unknown as PrismaService,
      transactionService(),
    );
    const deal = await prisma.transaction.create({
      data: {
        postId: 1,
        buyerId: 4,
        sellerId: 3,
        deliveryMethod: 'Meetup',
        status: 'Processing',
        paymentConfirmedByBuyerAt: new Date(),
        paymentConfirmedBySellerAt: new Date(),
      },
    });

    // A meetup is agreed and confirmed -> the handover QR is available.
    const a = await chats.createAppointment(
      deal.transactionId,
      { date: '2026-09-15', time: '12:00', location: 'First' },
      3,
    );
    await appointments.respondToAppointment(
      a.appointment_id,
      { response: 'confirm' },
      4,
    );
    const beforeChange = await transactionService().generateQr(
      deal.transactionId,
      3,
    );
    expect(typeof beforeChange.token).toBe('string');
    expect(beforeChange.token.length).toBeGreaterThan(0);

    // One side proposes a change; the other declines it ("Another time").
    const b = await chats.createAppointment(
      deal.transactionId,
      { date: '2026-09-16', time: '12:00', location: 'Replacement' },
      3,
    );
    await appointments.respondToAppointment(
      b.appointment_id,
      { response: 'reject' },
      4,
    );

    // Both the old Confirmed card and the rejected change are retired now.
    const cards = await chats.getAppointmentCards(deal.transactionId, 3);
    const byId = new Map(cards.map((card) => [card.appointment_id, card]));
    expect(byId.get(a.appointment_id)?.status).toBe('Confirmed');
    expect(byId.get(a.appointment_id)?.deleted_at).not.toBeNull();
    expect(byId.get(b.appointment_id)?.status).toBe('Rejected');
    expect(byId.get(b.appointment_id)?.deleted_at).not.toBeNull();

    // So the handover must not be possible: no live Confirmed appointment.
    await expect(
      transactionService().generateQr(deal.transactionId, 3),
    ).rejects.toThrow('Confirm the latest meetup appointment before handover');

    // Proposing and confirming a fresh meetup restores the handover.
    const c = await chats.createAppointment(
      deal.transactionId,
      { date: '2026-09-17', time: '12:00', location: 'Third' },
      3,
    );
    await appointments.respondToAppointment(
      c.appointment_id,
      { response: 'confirm' },
      4,
    );
    const afterRefix = await transactionService().generateQr(
      deal.transactionId,
      3,
    );
    expect(typeof afterRefix.token).toBe('string');
    expect(afterRefix.token.length).toBeGreaterThan(0);
  });

  it('provides every column selected by every Prisma model', async () => {
    for (const model of Prisma.dmmf.datamodel.models) {
      const columns = model.fields
        .filter((field) => field.kind !== 'object')
        .map((field) => `"${field.dbName ?? field.name}"`)
        .join(', ');
      await expect(
        pool.query(
          `SELECT ${columns} FROM "${schema}"."${model.dbName ?? model.name}" LIMIT 1`,
        ),
      ).resolves.toBeDefined();
    }
    await expect(
      prisma.post.findMany({ include: { item: true } }),
    ).resolves.not.toHaveLength(0);
  });

  it('has usable demo passwords', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'user1@ku.th' },
    });
    expect(await bcrypt.compare('KuDemo123!', user.passwordHash)).toBe(true);
  });
  it('rejects edits by another user and prevents two buyers taking the final unit', async () => {
    const service = new PostsService(prisma as unknown as PrismaService);
    const item = await prisma.item.create({
      data: {
        ownerId: 3,
        name: 'Concurrency item',
        category: 'Books',
        condition: 'Good',
      },
    });
    await expect(
      service.createPost(
        { item_id: item.itemId, post_type: 'SellOnly', price: 10 },
        4,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const post = await service.createPost(
      { item_id: item.itemId, post_type: 'SellOnly', price: 10 },
      3,
    );
    await expect(
      service.updatePostPrice(post.post_id, { price: 0 }, 4),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.deletePost(post.post_id, 4)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    const results = await Promise.allSettled([
      service.buyPost(post.post_id, { buyer_id: 4 }),
      service.buyPost(post.post_id, { buyer_id: 5 }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const failed = results.find((result) => result.status === 'rejected');
    expect(failed?.status === 'rejected' ? failed.reason : null).toBeInstanceOf(
      ConflictException,
    );
    const stored = await prisma.post.findUniqueOrThrow({
      where: { itemId: item.itemId },
    });
    expect(stored.quantityRemaining).toBe(0);
    expect(
      await prisma.transaction.count({ where: { postId: stored.postId } }),
    ).toBe(1);
  });

  function transactionService() {
    const tokens = new Map<string, string>();
    const redis = {
      set: jest.fn((key: string, value: string) => {
        tokens.set(key, value);
        return Promise.resolve();
      }),
      get: jest.fn((key: string) => Promise.resolve(tokens.get(key))),
      // generateQr reuses a live token; the fake reports a full window left.
      pttl: jest.fn((key: string) =>
        Promise.resolve(tokens.has(key) ? 15 * 60 * 1000 : -2),
      ),
      del: jest.fn((key: string) => Promise.resolve(tokens.delete(key))),
      eval: jest.fn(
        (_script: string, _count: number, key: string, token: string) => {
          if (tokens.get(key) !== token) return Promise.resolve(0);
          tokens.delete(key);
          return Promise.resolve(1);
        },
      ),
    } as unknown as RedisService;
    return new TransactionService(prisma as unknown as PrismaService, redis);
  }

  it('moves a paid cancellation through Pending Refund to Refunded', async () => {
    const service = transactionService();
    const deal = await prisma.transaction.create({
      data: {
        postId: 1,
        buyerId: 4,
        sellerId: 3,
        deliveryMethod: 'Shipping',
        status: 'Processing',
        paymentConfirmedByBuyerAt: new Date(),
      },
    });
    await service.requestCancellation(deal.transactionId, 4, {
      reason: 'Cannot continue',
    });
    await expect(
      service.respondToCancellation(deal.transactionId, 4, {
        response: 'Approved',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const accepted = await service.respondToCancellation(
      deal.transactionId,
      3,
      { response: 'Approved' },
    );
    expect(accepted.status).toBe('Pending Refund');
    await service.uploadRefundSlip(deal.transactionId, 3, {
      refund_slip_url: 'https://example.com/refund.jpg',
    });
    expect((await service.confirmRefund(deal.transactionId, 4)).status).toBe(
      'Refunded',
    );
    await expect(
      service.confirmRefund(deal.transactionId, 4),
    ).rejects.toThrow();
  });

  it('requires both refund and item return after a completed purchase', async () => {
    const service = transactionService();
    const deal = await prisma.transaction.create({
      data: {
        postId: 1,
        buyerId: 4,
        sellerId: 3,
        deliveryMethod: 'Meetup',
        status: 'Completed',
        paymentConfirmedByBuyerAt: new Date(),
        itemReceivedConfirmedByBuyerAt: new Date(),
      },
    });
    await service.requestCancellation(deal.transactionId, 4, {
      reason: 'Item differs from agreement',
    });
    await service.respondToCancellation(deal.transactionId, 3, {
      response: 'Approved',
    });
    await service.uploadRefundSlip(deal.transactionId, 3, {
      refund_slip_url: 'https://example.com/refund.jpg',
    });
    expect((await service.confirmRefund(deal.transactionId, 4)).status).toBe(
      'Pending Refund',
    );
    await prisma.appointmentCard.create({
      data: {
        transactionId: deal.transactionId,
        proposedBy: 3,
        date: new Date(),
        time: new Date(),
        location: 'Return meetup',
        status: 'Confirmed',
      },
    });
    const qr = await service.generateQr(deal.transactionId, 3);
    expect(
      (await service.scanQr(deal.transactionId, 4, { token: qr.token })).status,
    ).toBe('Refunded');
    await expect(
      service.scanQr(deal.transactionId, 4, { token: qr.token }),
    ).rejects.toThrow();
    const old = await prisma.transaction.create({
      data: {
        postId: 1,
        buyerId: 4,
        sellerId: 3,
        deliveryMethod: 'Meetup',
        status: 'Completed',
        itemReceivedConfirmedByBuyerAt: new Date(Date.now() - 8 * 86400000),
      },
    });
    await expect(
      service.requestCancellation(old.transactionId, 4, { reason: 'Too late' }),
    ).rejects.toThrow('seven days');
  });

  it('automatically allocates Random giveaways once and preserves capacity', async () => {
    const giveaways = new GiveawaysService(prisma as unknown as PrismaService);
    const sweep = new GiveawayExpiryService(
      prisma as unknown as PrismaService,
      giveaways,
    );
    const post = await prisma.giveawayPost.create({
      data: {
        giverId: 3,
        itemName: 'Automatic draw',
        pickupLocation: 'Library',
        quantity: 1,
        allocationMethod: 'Random',
        registerDeadline: new Date(Date.now() - 1000),
        tickets: { create: [{ receiverId: 4 }, { receiverId: 5 }] },
      },
    });
    await Promise.all([
      sweep.allocateClosedRegistrations(),
      sweep.allocateClosedRegistrations(),
    ]);
    expect(
      await prisma.giveawayTicket.count({
        where: { giveawayId: post.giveawayId, status: 'Waiting' },
      }),
    ).toBe(1);
    expect(
      await prisma.giveawayTicket.count({
        where: { giveawayId: post.giveawayId, status: 'NotSelected' },
      }),
    ).toBe(1);
    expect(
      await prisma.chatRoom.count({ where: { giveawayId: post.giveawayId } }),
    ).toBe(1);
  });

  it('gives a giveaway ticket one QR code per 15 minutes, rejecting a stale one', async () => {
    const giveaways = new GiveawaysService(prisma as unknown as PrismaService);
    const post = await prisma.giveawayPost.create({
      data: {
        giverId: 3,
        itemName: 'QR window',
        pickupLocation: 'Library',
        quantity: 1,
        allocationMethod: 'Manual',
        pickupDeadline: new Date(Date.now() + 24 * 3600000),
        tickets: { create: [{ receiverId: 4, status: 'Waiting' }] },
      },
      include: { tickets: true },
    });
    const gid = String(post.giveawayId);
    const tid = String(post.tickets[0].ticketId);

    const first = await giveaways.qrGenerate(gid, tid, 4);
    expect(typeof first.token).toBe('string');
    expect(first.expires_in_seconds).toBeGreaterThan(0);
    expect(first.expires_in_seconds).toBeLessThanOrEqual(15 * 60);

    // Reopening the ticket returns the same code with less time on it.
    const again = await giveaways.qrGenerate(gid, tid, 4);
    expect(again.token).toBe(first.token);
    expect(again.expires_in_seconds).toBeLessThanOrEqual(
      first.expires_in_seconds,
    );

    // Once the 15-minute window has passed the giver's scan no longer counts.
    await prisma.giveawayTicket.update({
      where: { ticketId: post.tickets[0].ticketId },
      data: { qrIssuedAt: new Date(Date.now() - 16 * 60 * 1000) },
    });
    await giveaways.qrScan(gid, tid, first.token, 3);
    expect(
      (
        await prisma.giveawayTicket.findUniqueOrThrow({
          where: { ticketId: post.tickets[0].ticketId },
        })
      ).status,
    ).toBe('Waiting');

    // Reopening after expiry mints a genuinely new code that does scan.
    const fresh = await giveaways.qrGenerate(gid, tid, 4);
    expect(fresh.token).not.toBe(first.token);
    await giveaways.qrScan(gid, tid, fresh.token, 3);
    expect(
      (
        await prisma.giveawayTicket.findUniqueOrThrow({
          where: { ticketId: post.tickets[0].ticketId },
        })
      ).status,
    ).toBe('Received');
  });

  it('escalates an overdue response only once across concurrent workers', async () => {
    const deal = await prisma.transaction.create({
      data: {
        postId: 1,
        buyerId: 4,
        sellerId: 3,
        deliveryMethod: 'Shipping',
        status: 'Processing',
        paymentConfirmedByBuyerAt: new Date(Date.now() - 25 * 3600000),
      },
    });
    const service = new TransactionDeadlineService(
      prisma as unknown as PrismaService,
    );
    await Promise.all([service.processDue(), service.processDue()]);
    expect(
      await prisma.report.count({
        where: { targetId: deal.transactionId, reportType: 'Transaction' },
      }),
    ).toBe(1);
    expect(
      await prisma.notification.count({
        where: { userId: 3, href: `/history/${deal.transactionId}` },
      }),
    ).toBe(1);
  });

  it('completes a payment-free trade and its return without requesting fictitious slips', async () => {
    const service = transactionService();
    const offer = await prisma.offer.create({
      data: { postId: 1, proposerId: 4, additionalMoney: 0 },
    });
    const deal = await prisma.transaction.create({
      data: {
        postId: 1,
        offerId: offer.offerId,
        buyerId: 4,
        sellerId: 3,
        deliveryMethod: 'Meetup',
        status: 'Pending',
      },
    });
    await expect(service.generateQr(deal.transactionId, 3)).rejects.toThrow(
      'appointment',
    );
    await prisma.appointmentCard.create({
      data: {
        transactionId: deal.transactionId,
        proposedBy: 3,
        date: new Date(),
        time: new Date(),
        location: 'Library',
        status: 'Confirmed',
      },
    });
    const qr = await service.generateQr(deal.transactionId, 3);
    expect(
      (await service.scanQr(deal.transactionId, 4, { token: qr.token })).status,
    ).toBe('Completed');
    await service.requestCancellation(deal.transactionId, 4, {
      reason: 'Return both items',
    });
    await service.respondToCancellation(deal.transactionId, 3, {
      response: 'Approved',
    });
    const returnQr = await service.generateQr(deal.transactionId, 3);
    expect(
      (await service.scanQr(deal.transactionId, 4, { token: returnQr.token }))
        .status,
    ).toBe('Refunded');
  });

  it('releases stock exactly once when two cancellation requests arrive together', async () => {
    const service = transactionService();
    const deal = await prisma.transaction.create({
      data: {
        postId: 1,
        buyerId: 4,
        sellerId: 3,
        deliveryMethod: 'Shipping',
        status: 'Pending',
      },
    });
    const before = await prisma.post.findUniqueOrThrow({
      where: { postId: 1 },
    });
    const results = await Promise.allSettled([
      service.requestCancellation(deal.transactionId, 4, { reason: 'Cancel' }),
      service.requestCancellation(deal.transactionId, 3, { reason: 'Cancel' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const after = await prisma.post.findUniqueOrThrow({ where: { postId: 1 } });
    expect(after.quantityRemaining).toBe(before.quantityRemaining + 1);
  });

  it('does not escalate just before the deadline, but does at the deadline', async () => {
    const started = new Date('2030-01-01T00:00:00Z');
    const deal = await prisma.transaction.create({
      data: {
        postId: 1,
        buyerId: 4,
        sellerId: 3,
        deliveryMethod: 'Shipping',
        status: 'Processing',
        paymentConfirmedByBuyerAt: started,
      },
    });
    const service = new TransactionDeadlineService(
      prisma as unknown as PrismaService,
    );
    await service.processDue(new Date(started.getTime() + 24 * 3600000 - 1));
    expect(
      (
        await prisma.transaction.findUniqueOrThrow({
          where: { transactionId: deal.transactionId },
        })
      ).activeReportId,
    ).toBeNull();
    await service.processDue(new Date(started.getTime() + 24 * 3600000));
    expect(
      (
        await prisma.transaction.findUniqueOrThrow({
          where: { transactionId: deal.transactionId },
        })
      ).activeReportId,
    ).not.toBeNull();
  });

  it('allows relisting a deleted listing while preserving its original row', async () => {
    const service = new PostsService(prisma as unknown as PrismaService);
    const item = await prisma.item.create({
      data: {
        ownerId: 3,
        name: 'Relist',
        category: 'Books',
        condition: 'Good',
      },
    });
    const first = await service.createPost(
      { item_id: item.itemId, post_type: 'SellOnly', price: 10 },
      3,
    );
    await service.deletePost(first.post_id, 3);
    const relisted = await service.createPost(
      { item_id: item.itemId, post_type: 'SellOnly', price: 12 },
      3,
    );
    expect(relisted.post_id).toBe(first.post_id);
  });

  it('prevents the same offered item being accepted by two different sellers', async () => {
    const service = new PostsService(prisma as unknown as PrismaService);
    const items = await Promise.all(
      [3, 5, 4].map((ownerId) =>
        prisma.item.create({
          data: {
            ownerId,
            name: 'Trade reservation',
            category: 'Books',
            condition: 'Good',
          },
        }),
      ),
    );
    const postA = await service.createPost(
      { item_id: items[0].itemId, post_type: 'TradeOnly', price: 0 },
      3,
    );
    const postB = await service.createPost(
      { item_id: items[1].itemId, post_type: 'TradeOnly', price: 0 },
      5,
    );
    const offerA = await service.createOffer(postA.post_id, {
      proposer_id: 4,
      item_ids: [items[2].itemId],
    });
    const offerB = await service.createOffer(postB.post_id, {
      proposer_id: 4,
      item_ids: [items[2].itemId],
    });
    await service.acceptOffer(postA.post_id, offerA.offer_id, {}, 3);
    await expect(
      service.acceptOffer(postB.post_id, offerB.offer_id, {}, 5),
    ).rejects.toThrow();
  });

  it('accepts only one of two competing new offers under simultaneous seller decisions', async () => {
    const service = new PostsService(prisma as unknown as PrismaService);
    const items = await Promise.all(
      [3, 4, 5].map((ownerId) =>
        prisma.item.create({
          data: {
            ownerId,
            name: 'Competing trade',
            category: 'Books',
            condition: 'Good',
          },
        }),
      ),
    );
    const post = await service.createPost(
      { item_id: items[0].itemId, post_type: 'TradeOnly', price: 0 },
      3,
    );
    const offers = await Promise.all(
      [4, 5].map((proposer_id, index) =>
        service.createOffer(post.post_id, {
          proposer_id,
          item_ids: [items[index + 1].itemId],
        }),
      ),
    );
    const results = await Promise.allSettled(
      offers.map((offer) =>
        service.acceptOffer(post.post_id, offer.offer_id, {}, 3),
      ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const postId = Number(post.post_id.replace('post_', ''));
    const rows = await prisma.offer.findMany({ where: { postId } });
    expect(rows.map((row) => row.status).sort()).toEqual([
      'Accepted',
      'Rejected',
    ]);
    expect(await prisma.transaction.count({ where: { postId } })).toBe(1);
  });

  it('does not authorize handover with an old appointment while a replacement is pending', async () => {
    const service = transactionService();
    const offer = await prisma.offer.create({
      data: { postId: 1, proposerId: 4, additionalMoney: 0 },
    });
    const deal = await prisma.transaction.create({
      data: {
        postId: 1,
        offerId: offer.offerId,
        buyerId: 4,
        sellerId: 3,
        deliveryMethod: 'Meetup',
        status: 'Pending',
      },
    });
    await prisma.appointmentCard.create({
      data: {
        transactionId: deal.transactionId,
        proposedBy: 3,
        date: new Date(),
        time: new Date(),
        location: 'Old',
        status: 'Confirmed',
        createdAt: new Date(Date.now() - 1000),
      },
    });
    await prisma.appointmentCard.create({
      data: {
        transactionId: deal.transactionId,
        proposedBy: 3,
        date: new Date(),
        time: new Date(),
        location: 'New',
        status: 'Pending',
      },
    });
    await expect(service.generateQr(deal.transactionId, 3)).rejects.toThrow();
  });

  it('does not revive a cancelled transaction with a payment upload based on a stale read', async () => {
    const service = transactionService();
    const deal = await prisma.transaction.create({
      data: {
        postId: 1,
        buyerId: 4,
        sellerId: 3,
        deliveryMethod: 'Shipping',
        status: 'Pending',
      },
    });
    const intercepted = {
      transaction: {
        findUnique: async () => {
          const snapshot = await prisma.transaction.findUnique({
            where: { transactionId: deal.transactionId },
          });
          await service.requestCancellation(deal.transactionId, 3, {
            reason: 'Cancel before payment',
          });
          return snapshot;
        },
        update: (args: Prisma.TransactionUpdateArgs) =>
          prisma.transaction.update(args),
        updateMany: (args: Prisma.TransactionUpdateManyArgs) =>
          prisma.transaction.updateMany(args),
      },
    } as unknown as PrismaService;
    const delayed = new TransactionService(intercepted, {} as RedisService);
    await expect(
      delayed.uploadPaymentSlip(deal.transactionId, 4, {
        slip_image_url: 'https://example.com/slip.jpg',
      }),
    ).rejects.toThrow();
    expect(
      (
        await prisma.transaction.findUniqueOrThrow({
          where: { transactionId: deal.transactionId },
        })
      ).status,
    ).toBe('Cancelled');
  });

  it('boots the full API without an email key and authenticates a fresh demo account', async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    let app: import('@nestjs/common').INestApplication | undefined;
    try {
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PrismaService)
        .useValue(prisma)
        .overrideProvider(RedisService)
        .useValue({ disconnect: jest.fn() })
        .compile();
      app = module.createNestApplication();
      app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
      await app.init();
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user1@ku.th', password: 'KuDemo123!' })
        .expect(201);
      const body = login.body as { data: { accessToken: string } };
      expect(body.data.accessToken).toBeTruthy();
      await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .expect(200);
      await request(app.getHttpServer()).get('/transactions').expect(401);
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'invalid@example.test', password: 'x' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/membership/subscribe')
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .send({ requestedTier: 'Imaginary', proofImageUrl: 'bad' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/items')
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .send({ name: 'Missing required fields' })
        .expect(400);
      const owned = await prisma.item.create({
        data: {
          name: 'Protected ownership',
          category: 'Books',
          condition: 'Good',
          ownerId: 3,
        },
      });
      await request(app.getHttpServer())
        .patch(`/items/${owned.itemId}`)
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .send({ ownerId: 4, status: 'Transferred', name: 'Renamed safely' })
        .expect(200);
      const checked = await prisma.item.findUniqueOrThrow({
        where: { itemId: owned.itemId },
      });
      expect(checked.ownerId).toBe(3);
      expect(checked.status).toBe('Unlisted');
      const verdict = await prisma.report.create({
        data: {
          reporterId: 4,
          reportType: 'User',
          targetId: 3,
          reasonCategory: 'Other',
          status: 'Violation_Confirmed',
          sanction: 'suspend_temporary',
          handledBy: 1,
          handledAt: new Date(),
        },
      });
      await prisma.user.update({
        where: { userId: 3 },
        data: { status: 'Suspended' },
      });
      const restricted = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user1@ku.th', password: 'KuDemo123!' })
        .expect(201);
      const restrictedToken = (
        restricted.body as { data: { accessToken: string } }
      ).data.accessToken;
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${restrictedToken}`)
        .expect(200);
      const eligible = await request(app.getHttpServer())
        .get('/appeals/eligible')
        .set('Authorization', `Bearer ${restrictedToken}`)
        .expect(200);
      expect(
        (eligible.body as { data: Array<{ report_id: number }> }).data.some(
          (row) => row.report_id === verdict.reportId,
        ),
      ).toBe(true);
      await request(app.getHttpServer())
        .post('/appeals')
        .set('Authorization', `Bearer ${restrictedToken}`)
        .send({
          report_id: verdict.reportId,
          reason: 'Please review the evidence for this decision again.',
        })
        .expect(201);
      await request(app.getHttpServer())
        .post('/items')
        .set('Authorization', `Bearer ${restrictedToken}`)
        .send({ name: 'Forbidden', category: 'Books', condition: 'Good' })
        .expect(401);
      await request(app.getHttpServer())
        .get('/admin/appeals')
        .set('Authorization', `Bearer ${restrictedToken}`)
        .expect(401);
      await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .expect(401);
      await prisma.user.update({
        where: { userId: 3 },
        data: { status: 'Active' },
      });
    } finally {
      await app?.close();
      if (originalKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = originalKey;
    }
  });
});
