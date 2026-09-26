import { API_HOSTNAME, WEB_URL } from '../config';
import { parseUrl, withHostname } from '../utils/url';

/**
 * Makes stored media URLs loadable on a phone (LEARNER_MOBILE_API_SPEC.md §1.8):
 * - relative paths ("/sample.jpg") are files served by the web app (frontend/public) → WEB_URL
 * - in development, loopback hosts (MinIO at localhost:9000, LiveKit at ws://localhost:7880)
 *   are rewritten to the API host
 *
 * Never use this for presigned URLs (certificate downloads) — the signature covers the host.
 */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/')) return `${WEB_URL}${url}`;
  if (!__DEV__) return url;
  const parsed = parseUrl(url);
  if (parsed && LOOPBACK_HOSTS.has(parsed.hostname) && !LOOPBACK_HOSTS.has(API_HOSTNAME)) {
    return withHostname(url, API_HOSTNAME);
  }
  return url;
}
