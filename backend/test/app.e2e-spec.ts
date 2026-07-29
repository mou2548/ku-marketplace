import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('รองรับ Posts, Offers และ Trade endpoints ตาม prompt', async () => {
    const server = app.getHttpServer();

    await request(server)
      .post('/posts')
      .send({
        item_id: 145,
        post_type: 'Both',
        price: 250,
        quantity_total: 1,
      })
      .expect(201)
      .expect(({ body }) =>
        expect(body).toMatchObject({ data: { item_id: 145 } }),
      );
    await request(server).get('/posts').expect(200);
    await request(server).get('/posts/post_001').expect(200);
    await request(server)
      .patch('/posts/post_001')
      .send({ price: 300 })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ data: { price: 300 } }),
      );
    await request(server).delete('/posts/post_001').expect(200);
    await request(server)
      .post('/posts/post_001/buy')
      .send({ delivery_method: 'Meetup', quantity: 1 })
      .expect(201);
    await request(server)
      .post('/posts/post_001/offer')
      .send({ item_ids: [201, 205], additional_money: 100 })
      .expect(201);
    await request(server).get('/posts/post_001/offer').expect(200);
    await request(server)
      .post('/posts/post_001/offers/offer_001/accept')
      .send({ delivery_method: 'Shipping' })
      .expect(201);
    await request(server)
      .post('/posts/offer_001/withdraw')
      .send({})
      .expect(201);
    await request(server)
      .post('/posts/post_001/offers/offer_001/reject')
      .send({})
      .expect(201);
  });

  it('รองรับ Giveaway Allocation endpoints ตาม prompt', async () => {
    const server = app.getHttpServer();

    await request(server)
      .post('/giveaways')
      .send({
        item_name: 'เสื้อคณะไซส์ M',
        description: 'ได้มาแต่ใส่ไม่พอดี ใหม่มาก',
        pickup_location: 'หน้าตึกวิศวกรรม 1',
        allocation_method: 'Random',
        pickup_deadline: '2026-08-05T18:00:00Z',
        images: [
          {
            image_url: 'https://r2.example/giveaways/temp/img1.jpg',
            display_order: 0,
          },
        ],
      })
      .expect(201);
    await request(server).get('/giveaways/giveaway_001').expect(200);
    await request(server)
      .post('/giveaways/giveaway_001/join')
      .send({})
      .expect(201);
    await request(server)
      .post('/giveaways/giveaway_001/draw')
      .send({})
      .expect(201);
    await request(server)
      .post('/giveaways/giveaway_001/select')
      .send({ receiver_ids: [3311, 3320, 3325] })
      .expect(201)
      .expect(({ body }) => {
        const response = body as { data: { recipients: unknown[] } };
        expect(response.data.recipients).toHaveLength(3);
      });
    await request(server).get('/giveaways/giveaway_001/recipients').expect(200);
    await request(server)
      .post('/giveaways/recipients/recipient_001/forfeit')
      .send({ confirm: true })
      .expect(201);
    await request(server)
      .post('/giveaways-tickets/ticket_001/qr/generate')
      .send({})
      .expect(201);
    await request(server)
      .post('/giveaways-tickets/ticket_001/qr/scan')
      .send({ token: 'mock-qr-token-001' })
      .expect(201)
      .expect(({ body }) =>
        expect(body).toMatchObject({ data: { valid: true } }),
      );
  });

  afterAll(async () => {
    await app.close();
  });
});
