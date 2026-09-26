import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { accessTokenSecondsLeft, tokenStore } from '../auth/tokens';
import { API_URL, REQUEST_TIMEOUT_MS } from '../config';
import { endpoints } from './endpoints';
import { ApiError, toApiError } from './errors';
import type { ApiEnvelope, Locale } from './types';

/**
 * Central HTTP client (LEARNER_MOBILE_ARCHITECTURE.md §6.1–§6.2).
 *
 * - baseURL ends with /api/v1
 * - unwraps the { data, timestamp } envelope, so callers receive the payload directly
 * - normalizes every failure into ApiError
 * - refreshes the access token single-flight (proactively and on 401), then replays
 */

/* -------------------------------------------------------------------------- */
/*  Hooks wired by the auth feature and i18n                                   */
/* -------------------------------------------------------------------------- */

interface SessionPayload {
  accessToken: string;
  refreshToken: string;
}

let getLocale: () => Locale = () => 'en';
let onSessionRefreshed: (payload: unknown) => void = () => {};
let onSessionExpired: () => void = () => {};

export function configureApiClient(options: {
  getLocale?: () => Locale;
  /** Receives the full refresh payload (user, tokens, permissions — spec §2.2). */
  onSessionRefreshed?: (payload: unknown) => void;
  /** Called once the refresh token is rejected; the app must log out. */
  onSessionExpired?: () => void;
}): void {
  if (options.getLocale) getLocale = options.getLocale;
  if (options.onSessionRefreshed) onSessionRefreshed = options.onSessionRefreshed;
  if (options.onSessionExpired) onSessionExpired = options.onSessionExpired;
}

/* -------------------------------------------------------------------------- */
/*  Axios instance                                                             */
/* -------------------------------------------------------------------------- */

const http = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

/** Separate instance for the refresh call so it never recurses through interceptors. */
const refreshHttp = axios.create({ baseURL: API_URL, timeout: REQUEST_TIMEOUT_MS });

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
  _skipAuth?: boolean;
}

const isAuthRoute = (url?: string) => Boolean(url && /(^|\/)auth\//.test(url));

/* -------------------------------------------------------------------------- */
/*  Single-flight refresh                                                      */
/* -------------------------------------------------------------------------- */

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Refreshes the session once, no matter how many callers ask concurrently.
 * Resolves the new access token, or `null` when the session is dead.
 * Network failures reject (the session may still be valid once back online).
 */
export function refreshSession(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const current = tokenStore.getRefreshToken();
  if (!current) return Promise.resolve(null);

  refreshInFlight = (async () => {
    try {
      const res = await refreshHttp.post<ApiEnvelope<SessionPayload>>(endpoints.auth.refresh, {
        refreshToken: current,
      });
      const payload = res.data.data;
      await tokenStore.setTokens(payload);
      onSessionRefreshed(payload);
      return payload.accessToken;
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status === 401 || apiError.status === 403) {
        await tokenStore.clear();
        onSessionExpired();
        return null;
      }
      throw apiError;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/* -------------------------------------------------------------------------- */
/*  Interceptors                                                               */
/* -------------------------------------------------------------------------- */

http.interceptors.request.use(async (config: RetriableConfig) => {
  config.headers.set('Accept-Language', getLocale());

  // Public endpoints (login, register, reset…) pass skipAuth. /auth/logout still needs the bearer.
  if (config._skipAuth) return config;

  // Proactive refresh: avoid a guaranteed 401 when the 15-minute token is about to expire.
  if (!isAuthRoute(config.url) && tokenStore.hasSession() && accessTokenSecondsLeft() < 30) {
    try {
      await refreshSession();
    } catch {
      // Offline: send with the current token; the response path handles the outcome.
    }
  }

  const token = tokenStore.getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

http.interceptors.response.use(
  (response) => {
    // Unwrap the TransformInterceptor envelope (spec §1.3).
    const body = response.data as ApiEnvelope<unknown> | undefined;
    if (body && typeof body === 'object' && 'data' in body && 'timestamp' in body) {
      response.data = body.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      config &&
      !config._retried &&
      !config._skipAuth &&
      !isAuthRoute(config.url) &&
      tokenStore.hasSession()
    ) {
      config._retried = true;
      try {
        const newToken = await refreshSession();
        if (newToken) {
          config.headers.set('Authorization', `Bearer ${newToken}`);
          return http.request(config);
        }
      } catch (refreshError) {
        return Promise.reject(toApiError(refreshError));
      }
    }

    return Promise.reject(toApiError(error));
  },
);

/* -------------------------------------------------------------------------- */
/*  Typed helpers — resolve to the unwrapped payload                           */
/* -------------------------------------------------------------------------- */

export interface RequestOptions extends Pick<AxiosRequestConfig, 'params' | 'signal' | 'headers'> {
  /** Do not attach the bearer token or attempt a refresh. */
  skipAuth?: boolean;
}

function toConfig(options?: RequestOptions): AxiosRequestConfig {
  const { skipAuth, ...rest } = options ?? {};
  return { ...rest, _skipAuth: skipAuth } as AxiosRequestConfig;
}

export const api = {
  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    return (await http.get<T>(url, toConfig(options))).data;
  },
  async post<T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return (await http.post<T>(url, body, toConfig(options))).data;
  },
  async patch<T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return (await http.patch<T>(url, body, toConfig(options))).data;
  },
  async put<T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return (await http.put<T>(url, body, toConfig(options))).data;
  },
  async delete<T>(url: string, options?: RequestOptions): Promise<T> {
    return (await http.delete<T>(url, toConfig(options))).data;
  },
  /** multipart/form-data upload (e.g. POST /files/avatar). */
  async upload<T>(url: string, form: FormData, options?: RequestOptions): Promise<T> {
    return (
      await http.post<T>(url, form, {
        ...toConfig(options),
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data;
  },
};

export { ApiError };
