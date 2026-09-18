import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import { Reflector } from '@nestjs/core';

export const AllowRestrictedAccount = () =>
  SetMetadata('allowRestrictedAccount', true);

import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private tokenService: TokenService,
    private prisma: PrismaService,
    private reflector: Reflector = new Reflector(),
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<
        Request & { user?: { userId: number; email: string; isAdmin: boolean } }
      >();
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.tokenService.verifyAccessToken(token);
      const user = await this.prisma.user.findUnique({
        where: { userId: payload.userId },
        select: {
          userId: true,
          email: true,
          status: true,
          isAdmin: true,
          passwordHash: true,
        },
      });
      const restricted =
        user?.status === 'Suspended' || user?.status === 'Banned';
      const mayAppeal =
        restricted &&
        this.reflector.get<boolean>(
          'allowRestrictedAccount',
          context.getHandler(),
        );
      if (!user || (user.status !== 'Active' && !mayAppeal))
        throw new UnauthorizedException('Account is not active');
      if (payload.sid)
        await this.tokenService.assertSession(payload.sid, user.passwordHash);
      req.user = {
        userId: user.userId,
        email: user.email,
        isAdmin: user.isAdmin ?? false,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      if (error instanceof Error && error.name === 'TokenExpiredError')
        throw new UnauthorizedException('Access token expired');
      if (
        error instanceof Error &&
        ['JsonWebTokenError', 'NotBeforeError'].includes(error.name)
      )
        throw new UnauthorizedException('Invalid token');
      throw error;
    }
  }
}
