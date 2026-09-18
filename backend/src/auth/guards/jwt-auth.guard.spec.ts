import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { TokenService } from '../token.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('Sanctions on existing sessions', () => {
  it.each(['Suspended', 'Banned', 'Deleted'])(
    'rejects a previously issued token when the account is %s',
    async (status) => {
      const token = {
        verifyAccessToken: jest
          .fn()
          .mockReturnValue({ userId: 1, isAdmin: true }),
      };
      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({ userId: 1, status }),
        },
      };
      const request = { headers: { authorization: 'Bearer previous-token' } };
      const context = {
        getHandler: () => function handler() {},
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;
      const guard = new JwtAuthGuard(
        token as unknown as TokenService,
        prisma as unknown as PrismaService,
      );
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );
});
