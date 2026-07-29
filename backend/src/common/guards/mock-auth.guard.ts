import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUserPayload } from '../interfaces/current-user.interface';

/**
 * Stand-in for real auth (JWT/session) until the Auth module exists.
 * Reads `x-user-id` / `x-is-admin` headers instead of verifying a token.
 * Swap this out for real login logic later — CurrentUserPayload stays the same,
 * so nothing downstream (controllers, AdminGuard) needs to change.
 */
@Injectable()
export class MockAuthGuard implements CanActivate {
  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'MockAuthGuard cannot run in production — replace with real auth before deploying.',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: CurrentUserPayload }>();

    const userIdHeader = request.headers['x-user-id'];
    if (typeof userIdHeader !== 'string' || !userIdHeader.trim()) {
      throw new UnauthorizedException(
        'Missing x-user-id header (mock auth: no real login yet)',
      );
    }

    const userId = Number(userIdHeader);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException(
        'x-user-id header must be a positive integer',
      );
    }

    request.user = {
      userId,
      isAdmin: request.headers['x-is-admin'] === 'true',
    };

    return true;
  }
}
