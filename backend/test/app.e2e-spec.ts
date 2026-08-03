import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Database-backed API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const itemIds: number[] = [];
  const giveawayIds: number[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  it('บันทึกและอ่าน Posts, Offers และ Transactions จาก PostgreSQL', async () => {
    const listedItem = await prisma.item.create({
      data: {
        ownerId: 2,
        name: `e2e listed item ${Date.now()}`,
        category: 'Books',
        condition: 'Good',
      },
    });
    const tradeItem = await prisma.item.create({
      data: {
        ownerId: 3,
        name: `e2e trade item ${Date.now()}`,
        category: 'Books',
        condition: 'Good',
      },
    });
    const deletableItem = await prisma.item.create({
      data: {
        ownerId: 2,
        name: `e2e deletable item ${Date.now()}`,
        category: 'Books',
        condition: 'Good',
      },
    });
    itemIds.push(listedItem.itemId, tradeItem.itemId, deletableItem.itemId);

    const created = await request(app.getHttpServer())
      .post('/posts')
      .send({
        item_id: listedItem.itemId,
        post_type: 'Both',
        price: 250,
        quantity_total: 1,
      })
      .expect(201);
    const postId = created.body.data.post_id as string;

    await request(app.getHttpServer()).get(`/posts/${postId}`).expect(200);
    await request(app.getHttpServer())
      .patch(`/posts/${postId}`)
      .send({ price: 300 })
      .expect(200)
      .expect(({ body }) => expect(body.data.price).toBe(300));

    await request(app.getHttpServer())
      .post(`/posts/${postId}/buy`)
      .send({ buyer_id: 2, delivery_method: 'Meetup', quantity: 1 })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/posts/${postId}/offers`)
      .send({
        proposer_id: 4,
        item_ids: [tradeItem.itemId],
        additional_money: 100,
      })
      .expect(403);

    const offer = await request(app.getHttpServer())
      .post(`/posts/${postId}/offers`)
      .send({
        proposer_id: 3,
        item_ids: [tradeItem.itemId],
        additional_money: 100,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/posts/${postId}/offers/${offer.body.data.offer_id}/withdraw`)
      .send({})
      .expect(200);

    await request(app.getHttpServer())
      .post(`/posts/${postId}/buy`)
      .send({ buyer_id: 3, delivery_method: 'Meetup', quantity: 1 })
      .expect(201);

    const deletable = await request(app.getHttpServer())
      .post('/posts')
      .send({
        item_id: deletableItem.itemId,
        post_type: 'SellOnly',
        price: 10,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/posts/${deletable.body.data.post_id}/offers`)
      .send({ proposer_id: 3, item_ids: [tradeItem.itemId] })
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/posts/${deletable.body.data.post_id}`)
      .expect(200);
  });

  it('บันทึกผู้เข้าร่วม จับฉลาก และตรวจ QR จาก PostgreSQL', async () => {
    const created = await request(app.getHttpServer())
      .post('/giveaways')
      .send({
        giver_id: 2,
        item_name: `e2e giveaway ${Date.now()}`,
        pickup_location: 'KU',
        allocation_method: 'Random',
        pickup_deadline: '2026-12-31T18:00:00Z',
        images: [
          { image_url: 'https://example.com/e2e.jpg', display_order: 0 },
        ],
      })
      .expect(201);
    const giveawayId = created.body.data.giveaway_id as string;
    giveawayIds.push(Number(giveawayId.replace('giveaway_', '')));

    await request(app.getHttpServer())
      .post(`/giveaways/${giveawayId}/join`)
      .send({ receiver_id: 3 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/giveaways/${giveawayId}/join`)
      .send({ receiver_id: 4 })
      .expect(201);

    const draw = await request(app.getHttpServer())
      .post(`/giveaways/${giveawayId}/draw`)
      .send({})
      .expect(200);
    const ticketId = draw.body.data.recipients[0].ticket_id as string;
    const qr = await request(app.getHttpServer())
      .post(`/giveaways/${giveawayId}/tickets/${ticketId}/qr/generate`)
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(`/giveaways/${giveawayId}/tickets/${ticketId}/qr/scan`)
      .send({ token: qr.body.data.token })
      .expect(200)
      .expect(({ body }) => expect(body.data.valid).toBe(true));
  });

  afterAll(async () => {
    if (giveawayIds.length > 0) {
      await prisma.giveawayTicket.deleteMany({
        where: { giveawayId: { in: giveawayIds } },
      });
      await prisma.giveawayImage.deleteMany({
        where: { giveawayId: { in: giveawayIds } },
      });
      await prisma.giveawayPost.deleteMany({
        where: { giveawayId: { in: giveawayIds } },
      });
    }
    if (itemIds.length > 0) {
      const posts = await prisma.post.findMany({
        where: { itemId: { in: itemIds } },
        select: { postId: true },
      });
      const postIds = posts.map((post) => post.postId);
      const offers = await prisma.offer.findMany({
        where: { postId: { in: postIds } },
        select: { offerId: true },
      });
      await prisma.transaction.deleteMany({
        where: { postId: { in: postIds } },
      });
      await prisma.offerItem.deleteMany({
        where: { offerId: { in: offers.map((offer) => offer.offerId) } },
      });
      await prisma.offer.deleteMany({ where: { postId: { in: postIds } } });
      await prisma.post.deleteMany({ where: { postId: { in: postIds } } });
      await prisma.item.deleteMany({ where: { itemId: { in: itemIds } } });
    }
    if (app) await app.close();
  });
});
