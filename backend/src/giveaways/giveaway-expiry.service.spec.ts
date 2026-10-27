import { GiveawayExpiryService } from './giveaway-expiry.service';
import type { GiveawaysService } from './giveaways.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('GiveawayExpiryService', () => {
  it('uses the item name and creates an idempotent manual-allocation notification', async () => {
    const createMany = jest.fn();
    const prisma = {
      giveawayPost: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            {
              giveawayId: 2,
              giverId: 99,
              item: { name: 'Book from inventory' },
            },
          ]),
        updateMany: jest.fn(),
      },
      notification: { createMany },
    };
    const service = new GiveawayExpiryService(
      prisma as unknown as PrismaService,
      {} as GiveawaysService,
    );
    await service.allocateClosedRegistrations();
    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 99,
          body: 'Registration for Book from inventory has closed. Pick the recipients.',
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('expires only waiting tickets whose pickup deadline has passed', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = {
      giveawayTicket: { updateMany },
    } as unknown as PrismaService;
    const service = new GiveawayExpiryService(prisma, {} as GiveawaysService);
    const now = new Date('2026-09-06T07:00:00.000Z');

    await expect(service.expireOverdueTickets(now)).resolves.toBe(2);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        status: 'Waiting',
        giveaway: { pickupDeadline: { lte: now } },
      },
      data: { status: 'Expired', updatedAt: now },
    });
  });
});
