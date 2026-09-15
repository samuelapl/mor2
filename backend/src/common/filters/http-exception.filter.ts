import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { detectLocale, localizeMessage } from '@common/i18n/translate';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const locale = detectLocale(
      (request.headers?.['accept-language'] as string | string[]) ??
        (request.query?.locale as string),
    );

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorType = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'string') {
        message = exResponse;
      } else if (typeof exResponse === 'object') {
        const exObj = exResponse as Record<string, unknown>;
        message = (exObj.message as string | string[]) || message;
        errorType = (exObj.error as string) || errorType;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    const localeMessages = Array.isArray(message) ? message : [message];

    response.status(status).json({
      statusCode: status,
      error: errorType,
      message,
      messageAm: localeMessages.map((m: string) => localizeMessage(m, locale)),
      locale,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
