/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Prisma } from '@prisma/client';
import { PostsService } from './posts.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('PostsService schema v3', () => {
  function setup() {
    const post = {
      postId: 1,
      itemId: 10,
      postType: 'Both',
      price: new Prisma.Decimal('12.35'),
      quantityTotal: 5,
      quantityRemaining: 5,
      description: null,
      createdAt: null,
      item: { itemId: 10, ownerId: 99, name: 'Book', description: null },
    };
    const tx = {
      $queryRaw: jest.fn(),
      post: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ postId: 1 }),
        create: jest
          .fn()
          .mockResolvedValue({ ...post, price: null, postType: 'TradeOnly' }),
        findUnique: jest.fn().mockResolvedValue(post),
        update: jest.fn().mockResolvedValue(post),
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ userId: 12, promptpayId: '0812345678' }),
        count: jest.fn().mockResolvedValue(1),
      },
      transaction: {
        create: jest
          .fn()
          .mockImplementation(
            ({ data }: { data: Prisma.TransactionUncheckedCreateInput }) =>
              Promise.resolve({
                transactionId: 7,
                ...data,
              }),
          ),
      },
      chatRoom: { create: jest.fn() },
      offer: {
        findFirst: jest.fn().mockResolvedValue({
          offerId: 3,
          proposerId: 12,
          post,
          status: 'Pending',
          additionalMoney: new Prisma.Decimal('8.25'),
          items: [{ itemId: 20 }],
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      item: {
        findMany: jest.fn().mockResolvedValue([{ itemId: 20, quantity: 1 }]),
        findUnique: jest.fn().mockResolvedValue({ quantity: 1 }),
      },
      giveawayPost: { findMany: jest.fn().mockResolvedValue([]) },
      offerItem: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const prisma = {
      ...tx,
      $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    return {
      service: new PostsService(prisma as unknown as PrismaService),
      tx,
      post,
    };
  }

  it('snapshots sale price times quantity using decimal arithmetic', async () => {
    const { service, tx } = setup();
    const result = await service.buyPost('1', { buyer_id: 12, quantity: 3 });
    expect(result.total_amount).toBe(37.05);
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        totalAmount: new Prisma.Decimal('37.05'),
      }),
    });
  });

  it.each(['SellOnly', 'Both'])(
    'requires seller PromptPay when creating %s',
    async (postType) => {
      const { service, tx, post } = setup();
      tx.item.findUnique.mockResolvedValueOnce({ ...post.item, quantity: 3 });
      tx.user.findUnique.mockResolvedValue({ promptpayId: null });
      await expect(
        service.createPost({ item_id: 10, post_type: postType, price: 10 }, 99),
      ).rejects.toThrow('PromptPay');
      expect(tx.post.create).not.toHaveBeenCalled();
    },
  );

  it('requires the seller, rather than buyer, to have PromptPay on purchase', async () => {
    const { service, tx } = setup();
    tx.user.findUnique.mockResolvedValue({ promptpayId: null });
    await expect(service.buyPost('1', { buyer_id: 12 })).rejects.toThrow(
      'PromptPay',
    );
    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: { userId: 99 },
      select: { promptpayId: true },
    });
    expect(tx.transaction.create).not.toHaveBeenCalled();
    expect(tx.post.updateMany).not.toHaveBeenCalled();
  });

  it('requires seller PromptPay when accepting a cash top-up', async () => {
    const { service, tx } = setup();
    tx.user.findUnique.mockResolvedValue({ promptpayId: null });
    await expect(service.acceptOffer('1', '3', {}, 99)).rejects.toThrow(
      'PromptPay',
    );
    expect(tx.transaction.create).not.toHaveBeenCalled();
    expect(tx.offer.updateMany).not.toHaveBeenCalled();
  });

  it('requires PromptPay when changing a trade listing into a sale', async () => {
    const { service, tx, post } = setup();
    tx.post.findUnique.mockResolvedValue({ ...post, postType: 'TradeOnly' });
    tx.user.findUnique.mockResolvedValue({ promptpayId: null });
    await expect(
      service.updatePost('1', { post_type: 'SellOnly', price: 10 }, 99),
    ).rejects.toThrow('PromptPay');
    expect(tx.post.update).not.toHaveBeenCalled();
  });

  it('requires a price when changing a price-less trade listing into a sale', async () => {
    const { service, tx, post } = setup();
    tx.post.findUnique.mockResolvedValue({
      ...post,
      postType: 'TradeOnly',
      price: null,
    });
    await expect(
      service.updatePost('1', { post_type: 'Both' }, 99),
    ).rejects.toThrow('price');
    expect(tx.post.update).not.toHaveBeenCalled();
  });

  it('snapshots only the agreed additional cash for a trade', async () => {
    const { service, tx } = setup();
    tx.post.findMany = jest.fn().mockResolvedValue([]);
    const result = await service.acceptOffer('1', '3', {}, 99);
    expect(result.total_amount).toBe(8.25);
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        totalAmount: new Prisma.Decimal('8.25'),
      }),
    });
  });

  it('serializes a nullable TradeOnly price without crashing', () => {
    const { service, post } = setup();
    expect(
      service.serializePost({ ...post, postType: 'TradeOnly', price: null })
        .price,
    ).toBeNull();
  });

  it('creates a TradeOnly listing without a price', async () => {
    const { service, tx, post } = setup();
    tx.item.findUnique.mockResolvedValueOnce({ ...post.item, quantity: 3 });
    tx.user.findUnique.mockResolvedValue({ promptpayId: null });
    const result = await service.createPost(
      { item_id: 10, post_type: 'TradeOnly' },
      99,
    );
    expect(result.price).toBeNull();
    expect(tx.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ price: null }),
      }),
    );
  });

  it('records zero total_amount for a trade without additional cash', async () => {
    const { service, tx, post } = setup();
    tx.user.findUnique.mockResolvedValue({ promptpayId: null });
    tx.offer.findFirst.mockResolvedValue({
      offerId: 3,
      proposerId: 12,
      post,
      status: 'Pending',
      additionalMoney: null,
      items: [{ itemId: 20 }],
    });
    expect((await service.acceptOffer('1', '3', {}, 99)).total_amount).toBe(0);
  });

  it('rejects a purchase without a sale price', async () => {
    const { service, tx, post } = setup();
    tx.post.findUnique.mockResolvedValue({ ...post, price: null });
    await expect(service.buyPost('1', { buyer_id: 12 })).rejects.toThrow(
      'no sale price',
    );
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });

  it('rejects totals that exceed decimal(10,2)', async () => {
    const { service, tx, post } = setup();
    tx.post.findUnique.mockResolvedValue({
      ...post,
      price: new Prisma.Decimal('99999999.99'),
    });
    await expect(
      service.buyPost('1', { buyer_id: 12, quantity: 2 }),
    ).rejects.toThrow('total_amount');
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });

  it('requires a price for a sale and rejects oversized listing text', async () => {
    const { service } = setup();
    await expect(
      service.createPost({ item_id: 1, post_type: 'SellOnly' }, 99),
    ).rejects.toThrow('price');
    await expect(
      service.createPost({ description: 'x'.repeat(2001) }, 99),
    ).rejects.toThrow('description');
    await expect(
      service.updatePost('1', { wanted_item_offer: 'x'.repeat(501) }, 99),
    ).rejects.toThrow('wanted_item_offer');
  });
});
