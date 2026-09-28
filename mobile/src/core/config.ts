import Constants from 'expo-constants';

import { parseUrl, withHostname } from './utils/url';

/**
 * Runtime configuration read from EXPO_PUBLIC_* env vars (see .env.example).
 */

function getDetectedDevHost(): string | null {
  if (!__DEV__) return null;
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }
  return null;
}

const detectedHost = getDetectedDevHost();
const FALLBACK_API_URL = detectedHost
  ? `http://${detectedHost}:3001/api/v1`
  : 'http://10.0.2.2:3001/api/v1';

function normalizeApiUrl(raw: string | undefined): string {
  let url = (raw ?? FALLBACK_API_URL).trim().replace(/\/+$/, '');

  // In Expo Go dev, if the env URL points to a stale LAN IP but Expo is connected from a different host IP:
  if (__DEV__ && detectedHost) {
    const parsed = parseUrl(url);
    if (
      parsed &&
      parsed.hostname !== detectedHost &&
      (parsed.hostname.startsWith('192.168.') ||
        parsed.hostname.startsWith('10.') ||
        parsed.hostname.startsWith('172.'))
    ) {
      url = withHostname(url, detectedHost);
    }
  }

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
