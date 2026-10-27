import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map } from 'rxjs/operators';
import { Paginated } from '../../dto/paginated.dto';
import { MessageOverride } from '../../dto/message-override.dto';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

/**
 * §envelope — global success shape, matches spec: { success: true, message, data }.
 * Pair with HttpExceptionFilter (see common/filters) which produces the matching
 * { success: false, message, data: null } shape for errors, so `success` is a
 * reliable field on every response, not just the happy path.
 *
 * `message` comes from @ResponseMessage('...') on the route handler when set,
 * otherwise defaults to 'success'. Individual services should NOT build their
 * own { success, message, data } wrapper — this interceptor is the single
 * place that happens, or you get double-nested envelopes. The one exception
 * is MessageOverride, for the rare genuinely-dynamic message (see that file).
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const defaultMessage =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ??
      'success';

    return next.handle().pipe(
      map((result: unknown) => {
        if (result instanceof Paginated) {
          return {
            success: true,
            message: defaultMessage,
            data: result.items,
            meta: result.meta,
          };
        }
        if (result instanceof MessageOverride) {
          return {
            success: true,
            message: result.message,
            data: result.data as unknown,
          };
        }
        return { success: true, message: defaultMessage, data: result };
      }),
    );
  }
}
