import { parseUrl } from './utils/url';

/**
 * Runtime configuration read from EXPO_PUBLIC_* env vars (see .env.example).
 */

const FALLBACK_API_URL = 'http://10.0.2.2:3001/api/v1';

function normalizeApiUrl(raw: string | undefined): string {
  const url = (raw ?? FALLBACK_API_URL).trim().replace(/\/+$/, '');
  if (__DEV__ && !url.endsWith('/api/v1')) {
    console.warn(
      `[config] EXPO_PUBLIC_API_URL should end with "/api/v1" (got "${url}"). See LEARNER_MOBILE_API_SPEC.md §1.1.`,
    );
  }
  return url;
}

export const API_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);

/** Hostname of the API, e.g. "192.168.1.50" — used to rewrite dev media URLs. */
export const API_HOSTNAME = parseUrl(API_URL)?.hostname ?? 'localhost';

/**
 * Origin of the Next.js web app. Some stored media paths are relative (e.g. "/sample.jpg" from
 * frontend/public), so they must be resolved against the web app, not the API.
 * Defaults to the API host on port 3000.
 */
export const WEB_URL = (
  process.env.EXPO_PUBLIC_WEB_URL ??
  (() => {
    const url = parseUrl(API_URL);
    return url ? `${url.protocol}//${url.hostname}:3000` : 'http://localhost:3000';
  })()
).replace(/\/+$/, '');

export const REQUEST_TIMEOUT_MS = 20_000;
