import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { EntityNotFoundError } from 'typeorm';
import {
  isForeignKeyViolation,
  isInvalidInput,
  isUniqueViolation,
} from '../../database/db-errors';

/**
 * Chuẩn hoá mọi lỗi thành JSON `{ statusCode, message, error, path, timestamp }`.
 * Map lỗi DB phổ biến sang HTTP: trùng unique → 409, không tìm thấy → 404, sai khoá ngoại/dữ liệu → 400.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Lỗi máy chủ';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (exception instanceof ThrottlerException) {
        // Gói throttler trả chuỗi tiếng Anh ("ThrottlerException: Too Many Requests") — form hiện thẳng message cho người dùng.
        message = 'Bạn thao tác hơi nhanh, thử lại sau ít phút nhé.';
        error = 'TooManyRequests';
      } else if (typeof body === 'string') {
        message = body;
        error = exception.name;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string | string[]) ?? exception.message;
        error = (b.error as string) ?? exception.name;
      }
    } else if (isUniqueViolation(exception)) {
      status = HttpStatus.CONFLICT;
      message = 'Dữ liệu đã tồn tại';
      error = 'Conflict';
    } else if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      message = 'Không tìm thấy dữ liệu';
      error = 'NotFound';
    } else if (isForeignKeyViolation(exception) || isInvalidInput(exception)) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Yêu cầu không hợp lệ';
      error = 'BadRequest';
    }

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    res.status(status).json({
      statusCode: status,
      message,
      error,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
