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

export interface StandardErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
  messageAm: string[];
  locale: string;
  path: string;
  timestamp: string;
  [key: string]: unknown;
}

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
    let rawMessage: string | string[] = 'Internal server error';
    let errorType = 'InternalServerError';
    let extra: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'string') {
        rawMessage = exResponse;
        errorType = exception.name || 'HttpException';
      } else if (typeof exResponse === 'object') {
        const exObj = exResponse as Record<string, unknown>;
        rawMessage = (exObj.message as string | string[]) || rawMessage;
        errorType = (exObj.error as string) || errorType;
        // Forward any extra structured fields (e.g. `reason`, `remainingSeconds`
        // on policy-gating exceptions) so callers can branch on them.
        const { message: _m, error: _e, statusCode: _s, ...rest } = exObj;
        if (Object.keys(rest).length > 0) extra = rest;
      }
    } else if (exception instanceof Error) {
      rawMessage = exception.message;
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    const isArrayMessage = Array.isArray(rawMessage);
    const details = isArrayMessage ? (rawMessage as string[]) : undefined;
    const message = isArrayMessage ? (rawMessage as string[]).join('; ') : (rawMessage as string);
    const localeMessages = isArrayMessage ? (rawMessage as string[]) : [message];

    const errorPayload: StandardErrorResponse = {
      success: false,
      statusCode: status,
      error: errorType,
      message,
      ...(details ? { details } : {}),
      messageAm: localeMessages.map((m: string) => localizeMessage(m, locale)),
      locale,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...extra,
    };

    response.status(status).json(errorPayload);
  }
}
