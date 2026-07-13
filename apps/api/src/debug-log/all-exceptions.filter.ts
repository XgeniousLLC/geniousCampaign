import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DebugLogService } from './debug-log.service';

// Global — catches everything that reaches here uncaught. Routine
// HttpExceptions (400/401/403/404/409, all the validation/not-found/
// conflict responses controllers throw deliberately) pass through
// unchanged, just not logged — only genuinely unexpected errors (anything
// that isn't an HttpException, or a 5xx HttpException) get written to
// error_logs, so the debug log stays a signal of real bugs, not routine
// "email already exists" 409s.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly debugLog: DebugLogService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const rawBody = isHttpException ? exception.getResponse() : { statusCode: status, message: 'Internal server error' };
    const body = typeof rawBody === 'string' ? { statusCode: status, message: rawBody } : rawBody;

    if (!isHttpException || status >= 500) {
      void this.debugLog.record({
        source: 'backend',
        message: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
        path: `${request.method} ${request.originalUrl}`,
      });
    }

    response.status(status).json(body);
  }
}
