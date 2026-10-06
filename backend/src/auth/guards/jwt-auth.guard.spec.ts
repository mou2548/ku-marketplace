import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { TokenService } from '../token.service';
import type { PrismaService } from '../../prisma/prisma.service';

/** A user with one temporary-suspension verdict decided at `handledAt`. */
function makePrisma(status: string, handledAt: Date) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({ userId: 1, status }),
      updateMany: jest.fn(),
    },
    post: { findMany: jest.fn().mockResolvedValue([]) },
    transaction: { findMany: jest.fn().mockResolvedValue([]) },
    report: {
      findMany: jest.fn().mockResolvedValue([
        {
          reportId: 1,
          reporterId: 5,
          reportType: 'User',
          targetId: 1,
          sanction: 'suspend_temporary',
          handledAt,
        },
      ]),
    },
  };
}

function contextFor() {
  const request = { headers: { authorization: 'Bearer previous-token' } };
  return {
    getHandler: () => function handler() {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('Sanctions on existing sessions', () => {
  it.each(['Suspended', 'Banned', 'Deleted'])(
    'rejects a previously issued token when the account is %s',
    async (status) => {
      const token = {
        verifyAccessToken: jest
          .fn()
          .mockReturnValue({ userId: 1, isAdmin: true }),
      };
      const prisma = makePrisma(status, new Date());
      const context = contextFor();
      const guard = new JwtAuthGuard(
        token as unknown as TokenService,
        prisma as unknown as PrismaService,
      );
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );

  it('lets a token through once a temporary suspension has run out', async () => {
    const token = {
      verifyAccessToken: jest.fn().mockReturnValue({ userId: 1 }),
    };
    const fourDaysAgo = new Date(Date.now() - 4 * 86_400_000);
    const prisma = makePrisma('Suspended', fourDaysAgo);
    const guard = new JwtAuthGuard(
      token as unknown as TokenService,
      prisma as unknown as PrismaService,
    );
    await expect(guard.canActivate(contextFor())).resolves.toBe(true);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { userId: 1, status: 'Suspended' },
      data: { status: 'Active' },
    });
  });
});
