import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map } from 'rxjs/operators';
import { Paginated } from '../../dto/paginated.dto';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const res = context.switchToHttp().getResponse();
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ?? 'success';

    return next.handle().pipe(
      map((result) => {
        if (result instanceof Paginated) {
          return {
            statusCode: res.statusCode,
            message,
            data: { data: result.items, meta: result.meta },
          };
        }
        return { statusCode: res.statusCode, message, data: { data: result } };
      }),
    );
  }
}