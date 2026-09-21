import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * §envelope — error-side counterpart to ResponseInterceptor. The spec only
 * describes the success shape ({ success: true, message, data }) explicitly,
 * but leaving errors on Nest's default { statusCode, message, error } means
 * `response.success` is undefined (not false) on every failed request — an
 * easy footgun for a frontend that checks `if (response.success)`. This
 * fills that gap so `success` is a reliable boolean everywhere. Flag this
 * back if that wasn't the intent — it's an extrapolation from "match spec
 * throughout the system", not something explicitly in the spec text.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง';
    if (isHttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object' && 'message' in body) {
        const m = body.message;
        message = Array.isArray(m) ? m.join(', ') : String(m);
      }
    }

    if (!isHttpException) {
      // Unexpected (non-HttpException) errors: log the real stack server-side,
      // never leak internals to the client.
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    res.status(statusCode).json({
      success: false,
      message,
      data: null,
    });
  }
}
