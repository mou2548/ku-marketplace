import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { SellersService } from '../src/sellers/sellers.service';
import {
  SellersController,
  FollowingController,
} from '../src/sellers/sellers.controller';
import { PostsService } from '../src/posts/posts.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { TokenService } from '../src/auth/token.service';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('Seller profiles and following (isolated PostgreSQL schema)', () => {
  const schema = `sellers_${process.pid}_${Date.now()}`;
  const jwt = new JwtService({ secret: 'isolated-seller-test-only' });
  let pool: Pool;
  let prisma: PrismaClient;
  let sellers: SellersService;
  let posts: PostsService;
  let app: INestApplication;
  let seller: number;
  let buyer: number;
  let second: number;
  let available: number[];
  const token = (id: number) => jwt.sign({ userId: id }, { expiresIn: '5m' });

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const conn = await pool.connect();
    try {
      await conn.query(`CREATE SCHEMA "${schema}"`);
      await conn.query(`SET search_path TO "${schema}"`);
      await conn.query(
        readFileSync(resolve(__dirname, '../../init.sql'), 'utf8'),
      );
      // Fresh installation and repeated additive migration must both work.
      const sql = readFileSync(
        resolve(
          __dirname,
          '../prisma/migrations/20260916010000_seller_following/migration.sql',
        ),
        'utf8',
      );
      await conn.query(sql);
      await conn.query(sql);
    } finally {
      conn.release();
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
    posts = new PostsService(prisma as unknown as PrismaService);
    sellers = new SellersService(prisma as unknown as PrismaService, posts);
    const module = await Test.createTestingModule({
      controllers: [SellersController, FollowingController],
      providers: [
        { provide: SellersService, useValue: sellers },
        { provide: PrismaService, useValue: prisma },
        // Real signature verification and real guard/account lookup; no session subsystem dependency.
        {
          provide: TokenService,
          useValue: { verifyAccessToken: (value: string) => jwt.verify(value) },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalInterceptors(new ResponseInterceptor(new Reflector()));
    await app.init();
  });
  beforeEach(async () => {
    const makeUser = async (name: string) =>
      (
        await prisma.user.create({
          data: {
            email: `${name}-${Date.now()}-${Math.random()}@ku.th`,
            firstNameEn: name,
            lastNameEn: 'Test',
            firstNameTh: name,
            lastNameTh: 'Test',
            passwordHash: 'private-hash',
            emailVerifiedAt: name === 'Seller' ? new Date() : null,
          },
        })
      ).userId;
    seller = await makeUser('Seller');
    buyer = await makeUser('Buyer');
    second = await makeUser('Other');
    available = [];
    for (const [type, price] of [
      ['SellOnly', 30],
      ['Both', 10],
      ['TradeOnly', 0],
    ] as const) {
      const item = await prisma.item.create({
        data: {
          ownerId: seller,
          name: `Book ${type}`,
          category: 'Books',
          condition: 'Good',
          status: 'Listed',
          post: {
            create: {
              postType: type,
              price,
              quantityRemaining: 2,
              quantityTotal: 2,
            },
          },
        },
        include: { post: true },
      });
      available.push(item.post!.postId);
    }
  });
  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    if (pool) {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await pool.end();
    }
  });

  it('exposes only public fields and paginated seller-scoped listings', async () => {
    const response = await request(app.getHttpServer())
      .get(`/sellers/${seller}`)
      .expect(200);
    expect(Object.keys(response.body.data).sort()).toEqual(
      [
        'user_id',
        'name',
        'is_verified',
        'member_since',
        'active_listing_count',
        'follower_count',
      ].sort(),
    );
    expect(response.body.data).toMatchObject({
      is_verified: true,
      active_listing_count: 3,
      follower_count: 0,
    });
    expect(response.headers['cache-control']).toBe('no-store');
    const page = await request(app.getHttpServer())
      .get(`/sellers/${seller}/posts?limit=2&type=sell`)
      .expect(200);
    expect(page.body.meta.total).toBe(2);
    expect(
      page.body.data.every(
        (post: { seller: { user_id: number } }) =>
          post.seller.user_id === seller,
      ),
    ).toBe(true);
    expect((await sellers.profile(buyer)).is_verified).toBe(false);
    await request(app.getHttpServer())
      .get(`/sellers/${seller}/posts?limit=49`)
      .expect(400);
    await request(app.getHttpServer()).get('/sellers/0').expect(400);
  });

  it('keeps trade-only last across price-sort pages and supports search/type/category filters', async () => {
    const asc = await sellers.listings(seller, { sort: 'price_asc', limit: 2 });
    expect(asc.items.map((p) => p.price)).toEqual([10, 30]);
    const tail = await sellers.listings(seller, {
      sort: 'price_desc',
      limit: 2,
      page: 2,
    });
    expect(tail.items.map((p) => p.post_type)).toEqual(['TradeOnly']);
    expect((await sellers.listings(seller, { type: 'trade' })).meta.total).toBe(
      2,
    );
    expect(
      (await sellers.listings(seller, { q: 'bOtH', category: 'Books' })).meta
        .total,
    ).toBe(1);
    expect(
      (await sellers.listings(seller, { category: 'Clothing' })).meta.total,
    ).toBe(0);
    const all = await sellers.listings(seller, {});
    expect(new Set(all.items.map((p) => p.post_id)).size).toBe(3);
  });

  it('requires authentication, rejects self-follow, ignores forged actor IDs and is idempotent under concurrency', async () => {
    await request(app.getHttpServer())
      .put(`/users/me/following/${seller}`)
      .expect(401);
    await request(app.getHttpServer()).get('/users/me/following').expect(401);
    await request(app.getHttpServer())
      .put(`/users/me/following/${seller}`)
      .set('Authorization', `Bearer ${token(seller)}`)
      .expect(400);
    await request(app.getHttpServer())
      .put(`/users/me/following/${seller}`)
      .set('Authorization', `Bearer ${token(buyer)}`)
      .send({ follower_id: second })
      .expect(200);
    await Promise.all(
      Array.from({ length: 8 }, () => sellers.follow(buyer, seller)),
    );
    expect(
      await prisma.userFollow.count({ where: { followedId: seller } }),
    ).toBe(1);
    expect((await sellers.state(buyer, seller)).is_following).toBe(true);
    expect((await sellers.state(second, seller)).is_following).toBe(false);
    expect((await sellers.profile(seller)).follower_count).toBe(1);
    // A new signed token still sees the same persisted relationship.
    const read = await request(app.getHttpServer())
      .get(`/users/me/following/${seller}`)
      .set('Authorization', `Bearer ${token(buyer)}`)
      .expect(200);
    expect(read.body.data.is_following).toBe(true);
    await Promise.all([
      sellers.unfollow(buyer, seller),
      sellers.unfollow(buyer, seller),
    ]);
    await request(app.getHttpServer())
      .delete(`/users/me/following/${seller}`)
      .set('Authorization', `Bearer ${token(buyer)}`)
      .expect(204);
    expect((await sellers.profile(seller)).follower_count).toBe(0);
  });

  it('hides restricted sellers, preserves private placeholders and excludes restricted followers from counts', async () => {
    const offered = await prisma.item.create({
      data: {
        ownerId: buyer,
        name: 'Offered book',
        category: 'Books',
        condition: 'Good',
        status: 'Unlisted',
      },
    });
    const pendingOffer = await posts.createOffer(String(available[1]), {
      proposer_id: buyer,
      item_ids: [offered.itemId],
    });
    await sellers.follow(buyer, seller);
    await sellers.follow(second, seller);
    await prisma.user.update({
      where: { userId: second },
      data: { status: 'Suspended' },
    });
    expect((await sellers.profile(seller)).follower_count).toBe(1);
    await request(app.getHttpServer())
      .put(`/users/me/following/${seller}`)
      .set('Authorization', `Bearer ${token(second)}`)
      .expect(401);
    for (const status of ['Suspended', 'Banned', 'Deleted']) {
      await prisma.user.update({ where: { userId: seller }, data: { status } });
      await expect(sellers.profile(seller)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(sellers.listings(seller, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(sellers.follow(buyer, seller)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect((await sellers.following(buyer, {})).items).toEqual([
        { seller_id: seller, profile: null },
      ]);
      await expect(
        posts.getPostById(String(available[0])),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        posts.buyPost(String(available[0]), { buyer_id: buyer }),
      ).rejects.toThrow();
      await expect(
        posts.createOffer(String(available[1]), {
          proposer_id: buyer,
          item_ids: [offered.itemId],
        }),
      ).rejects.toThrow();
      await expect(
        posts.acceptOffer(
          String(available[1]),
          pendingOffer.offer_id,
          {},
          seller,
        ),
      ).rejects.toThrow();
    }
    await prisma.user.update({
      where: { userId: seller },
      data: { status: 'Active' },
    });
    expect((await sellers.following(buyer, {})).items[0].profile?.user_id).toBe(
      seller,
    );
    await prisma.user.update({
      where: { userId: seller },
      data: { status: 'Deleted' },
    });
    await sellers.unfollow(buyer, seller);
    expect((await sellers.following(buyer, {})).meta.total).toBe(0);
  });

  it('excludes unavailable inventory and restores listings when stock is released', async () => {
    await prisma.post.update({
      where: { postId: available[0] },
      data: { quantityRemaining: 0 },
    });
    await prisma.post.update({
      where: { postId: available[1] },
      data: { deletedAt: new Date() },
    });
    const trade = await prisma.post.findUniqueOrThrow({
      where: { postId: available[2] },
    });
    await prisma.item.update({
      where: { itemId: trade.itemId },
      data: { status: 'Unlisted' },
    });
    expect((await sellers.profile(seller)).active_listing_count).toBe(0);
    expect((await sellers.listings(seller, {})).meta.total).toBe(0);
    await sellers.follow(buyer, seller);
    await prisma.post.update({
      where: { postId: available[0] },
      data: { quantityRemaining: 1 },
    });
    expect((await sellers.profile(seller)).active_listing_count).toBe(1);
    expect((await sellers.listings(seller, {})).meta.total).toBe(1);
    await prisma.item.update({
      where: { itemId: trade.itemId },
      data: { status: 'Listed', deletedAt: new Date() },
    });
    expect((await sellers.listings(seller, {})).meta.total).toBe(1);
  });

  it('enforces database uniqueness and the self-follow check independently of the API', async () => {
    await expect(
      prisma.userFollow.create({
        data: { followerId: buyer, followedId: buyer },
      }),
    ).rejects.toThrow();
    await prisma.userFollow.create({
      data: { followerId: buyer, followedId: seller },
    });
    await expect(
      prisma.userFollow.create({
        data: { followerId: buyer, followedId: seller },
      }),
    ).rejects.toThrow();
  });
});
