import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUserPayload } from '../interfaces/current-user.interface';

/**
 * Usage: whoami(@CurrentUser() user: CurrentUserPayload)
 * Only valid on routes guarded by JwtAuthGuard (request.user must be set).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: CurrentUserPayload }>();
    return request.user;
  },
);
