import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    let message: string;
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      // class-validator 错误时 message 是数组，其他情况可能是字符串
      const msg = (exceptionResponse as Record<string, unknown>).message;
      message = Array.isArray(msg) ? msg.join(',') : String(msg);
    } else {
      message = exception.message;
    }

    response.status(status).json({
      code: status,
      message,
      data: null,
    });
  }
}
