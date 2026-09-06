/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ForbiddenException } from '@nestjs/common';
import { ItemsService } from './items.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('ItemsService history summary', () => {
  const findUnique = jest.fn();
  const service = new ItemsService({
    item: { findUnique },
  } as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('counts only completed direct-sale and trade quantities separately', async () => {
    findUnique.mockResolvedValue({
      itemId: 7,
      ownerId: 3,
      quantity: 8,
      post: {
        status: 'Active',
        quantityTotal: 6,
        quantityRemaining: 1,
        transactions: [
          { offerId: null, quantity: 2 },
          { offerId: null, quantity: null },
          { offerId: 19, quantity: 2 },
        ],
      },
    });

    await expect(service.historySummary(7, 3)).resolves.toEqual({
      item_id: 7,
      inventory_quantity: 8,
      posted_quantity: 6,
      currently_listed_quantity: 1,
      sold_quantity: 3,
      traded_quantity: 2,
    });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          post: expect.objectContaining({
            include: expect.objectContaining({
              transactions: expect.objectContaining({
                where: { status: 'Completed' },
              }),
            }),
          }),
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
