import { GiveawayExpiryService } from './giveaway-expiry.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('GiveawayExpiryService', () => {
  it('expires only waiting tickets whose pickup deadline has passed', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = {
      giveawayTicket: { updateMany },
    } as unknown as PrismaService;
    const service = new GiveawayExpiryService(prisma);
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
