export interface ApiEnvelope<T> {
  data: T;
  timestamp: string;
}

/** Policy-gating reason codes the backend attaches to some 403 responses. */
export type ApiErrorReason =
  'TIME_NOT_MET' | 'ASSESSMENT_REQUIRED' | 'ASSESSMENT_NOT_PASSED' | 'LOCKED';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly reason?: ApiErrorReason,
    public readonly remainingSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RefreshHandler = () => Promise<string | null>;
type UnauthorizedHandler = () => void;

let refreshHandler: RefreshHandler | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler;
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

/** Access token used by ApiClient; wired by the auth store. */
let accessToken: string | null = null;
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken ?? getStoredAccessToken();
}

function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('eltms_access_token');
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Do not attempt a token refresh on 401. Used by auth endpoints themselves. */
  skipAuthRetry?: boolean;
  /** Absolute form (url already starts with http). */
  rawUrl?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
}

export function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = path.startsWith('http')
    ? path
    : `${API_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = options.headers ?? {};
  if (options.body !== undefined) {
    headers['Content-Type'] ??= 'application/json';
  }

  const send = async (useAccess: boolean): Promise<T> => {
    if (useAccess && accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    const res = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
    });

    if (res.ok) {
      const body = (await res.json()) as ApiEnvelope<unknown>;
      // rawUrl → callers type T as ApiEnvelope<U> and get the full envelope back.
      // Normal → callers type T as the business payload and get body.data.
      return (options.rawUrl ? body : body.data) as unknown as T;
    }

    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    let reason: ApiErrorReason | undefined;
    let remainingSeconds: number | undefined;
    try {
      const body = (await res.json()) as {
        message?: string | string[];
        code?: string;
        reason?: ApiErrorReason;
        remainingSeconds?: number;
      };
      message = Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? message);
      code = body.code;
      reason = body.reason;
      remainingSeconds = body.remainingSeconds;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message, res.status, code, reason, remainingSeconds);
  };

  try {
    return await send(true);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && !options.skipAuthRetry && refreshHandler) {
      const newToken = await refreshHandler();
      if (newToken) {
        accessToken = newToken;
        return await send(true);
      }
      unauthorizedHandler?.();
      throw err;
    }
    throw err;
  }
}

/** Builds an object with query params serialized from a record of FilterValues. */
export function toQuery(
  params: Record<string, string | number | boolean | string[] | undefined>,
): Record<string, string | number | boolean | undefined> {
  const out: Record<string, string | number | boolean | undefined> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    out[k] = Array.isArray(v) ? v.join(',') : v;
  }
  return out;
}

/**
 * Like `api`, but for endpoints that do NOT send the JSON envelope
 * (e.g. CSV exports) — resolves with the raw response text.
 */
export async function apiText(path: string, query?: RequestOptions['query']): Promise<string> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  const res = await fetch(buildUrl(path, query), { headers, credentials: 'include' });
  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status})`, res.status);
  }
  return res.text();
}
