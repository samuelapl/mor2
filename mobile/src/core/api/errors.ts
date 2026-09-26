import { isAxiosError } from 'axios';

import type { ApiErrorBody, ApiErrorReason } from './types';

/**
 * Normalized error for every failed request (LEARNER_MOBILE_API_SPEC.md §1.5).
 * `status === 0` means the request never reached the server (offline / timeout / DNS).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly messageAm?: string;
  readonly reason?: ApiErrorReason;
  readonly remainingSeconds?: number;
  readonly remainingMinutes?: number;

  constructor(init: {
    message: string;
    status: number;
    messageAm?: string;
    reason?: ApiErrorReason;
    remainingSeconds?: number;
    remainingMinutes?: number;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.messageAm = init.messageAm;
    this.reason = init.reason;
    this.remainingSeconds = init.remainingSeconds;
    this.remainingMinutes = init.remainingMinutes;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** Message in the user's language, falling back to English. */
  localizedMessage(locale: 'en' | 'am'): string {
    return locale === 'am' && this.messageAm ? this.messageAm : this.message;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data;
    if (!error.response) {
      return new ApiError({ message: 'Network error. Check your connection.', status: 0 });
    }
    const raw = body?.message;
    const message = Array.isArray(raw) ? raw.join('; ') : (raw ?? error.message);
    const messageAm = body?.messageAm?.length ? body.messageAm.join('; ') : undefined;
    return new ApiError({
      message,
      status: error.response.status,
      messageAm,
      reason: body?.reason,
      remainingSeconds: body?.remainingSeconds,
      remainingMinutes: body?.remainingMinutes,
    });
  }

  return new ApiError({
    message: error instanceof Error ? error.message : 'Unexpected error',
    status: -1,
  });
}
