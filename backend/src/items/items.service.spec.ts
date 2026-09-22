/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ForbiddenException } from '@nestjs/common';
import { ItemsService } from './items.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('ItemsService history summary', () => {
  const findUnique = jest.fn();
  const postFindMany = jest.fn();
  const giveawayPostFindMany = jest.fn();
  const service = new ItemsService({
    item: { findUnique },
    post: { findMany: postFindMany },
    giveawayPost: { findMany: giveawayPostFindMany },
  } as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('counts channels, completed quantities and available stock across every post and giveaway', async () => {
    findUnique.mockImplementation((args: { select?: { quantity?: boolean } }) =>
      Promise.resolve(
        args?.select?.quantity
          ? { quantity: 8 }
          : {
              itemId: 7,
              ownerId: 3,
              quantity: 8,
              posts: [
                {
                  postId: 101,
                  postType: 'SellOnly',
                  status: 'Active',
                  deletedAt: null,
                  quantityTotal: 6,
                  quantityRemaining: 1,
                  transactions: [
                    { offerId: null, quantity: 2 },
                    { offerId: null, quantity: null },
                    { offerId: 19, quantity: 2 },
                  ],
                },
              ],
              giveawayPosts: [
                { giveawayId: 55, status: 'Active', quantity: 2, tickets: [] },
              ],
            },
      ),
    );
    postFindMany.mockResolvedValue([
      {
        status: 'Active',
        deletedAt: null,
        quantityTotal: 6,
        quantityRemaining: 1,
      },
    ]);
    giveawayPostFindMany.mockResolvedValue([{ quantity: 2, tickets: [] }]);

    await expect(service.historySummary(7, 3)).resolves.toEqual({
      item_id: 7,
      inventory_quantity: 8,
      posted_quantity: 6,
      currently_listed_quantity: 1,
      available_quantity: 0,
      sold_quantity: 3,
      traded_quantity: 2,
      given_quantity: 0,
      channels: [
        {
          type: 'post',
          post_id: 101,
          post_type: 'SellOnly',
          quantity_total: 6,
          quantity_remaining: 1,
        },
        {
          type: 'giveaway',
          giveaway_id: 55,
          quantity_total: 2,
          quantity_claimed: 0,
        },
      ],
    });
    expect(findUnique.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        include: expect.objectContaining({
          posts: expect.objectContaining({
            include: expect.objectContaining({
              transactions: expect.objectContaining({
                where: { status: 'Completed' },
              }),
            }),
          }),
          giveawayPosts: expect.anything(),
        }),
      }),
    );
  });

  it('does not expose another owner history', async () => {
    findUnique.mockResolvedValue({ itemId: 7, ownerId: 3, quantity: 1 });
    await expect(service.historySummary(7, 4)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
