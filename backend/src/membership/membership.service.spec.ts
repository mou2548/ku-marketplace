import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MembershipService } from './membership.service';

describe('MembershipService', () => {
  it('prefers the latest subscription row for a user before computing status', async () => {
    const prisma = {
      subscription: {
        findFirst: jest.fn().mockResolvedValue({
          subscriptionId: 42,
          userId: 7,
          tier: 'Gold',
          status: 'Active',
          startDate: new Date('2026-10-01T00:00:00Z'),
          endDate: new Date('2026-11-01T00:00:00Z'),
        }),
      },
      post: {
        count: jest.fn().mockResolvedValue(2),
      },
      subscriptionPayment: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const service = new MembershipService(prisma as any);
    const result = await service.getStatus(7);

    expect(result.effectiveTier).toBe('Gold');
    expect(prisma.subscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 7 },
        orderBy: { startDate: 'desc' },
      }),
    );
  });

  it('throws when a user has no subscription row at all', async () => {
    const prisma = {
      subscription: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const service = new MembershipService(prisma as any);

    await expect(service.getStatus(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
