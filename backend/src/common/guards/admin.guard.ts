import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUserPayload } from '../interfaces/current-user.interface';

/**
 * Must run after JwtAuthGuard so request.user exists.
 * Guards the /admin/* endpoints in Report & Moderation (resolve, restore, decide).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: CurrentUserPayload }>();

    if (!request.user) {
      throw new ForbiddenException(
        'AdminGuard must be used together with MockAuthGuard',
      );
    }
    if (!request.user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
