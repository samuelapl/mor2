/**
 * Tiny URL helpers that avoid React Native's partial `URL` implementation
 * (hostname getters/setters are not reliable across RN versions).
 */

const URL_RE = /^([a-z][a-z0-9+.-]*:)\/\/([^/?#:]+)(:\d+)?([^]*)$/i;

export interface ParsedUrl {
  protocol: string; // "http:"
  hostname: string; // "192.168.0.151"
  port: string; // ":3001" or ""
  rest: string; // "/api/v1?x=1"
}

export function parseUrl(url: string): ParsedUrl | null {
  const match = URL_RE.exec(url.trim());
  if (!match) return null;
  return { protocol: match[1]!, hostname: match[2]!, port: match[3] ?? '', rest: match[4] ?? '' };
}

export function withHostname(url: string, hostname: string): string {
  const parsed = parseUrl(url);
  if (!parsed) return url;
  return `${parsed.protocol}//${hostname}${parsed.port}${parsed.rest}`;
}

export function lastPathSegment(url: string): string | null {
  const path = (parseUrl(url)?.rest ?? url).split(/[?#]/)[0] ?? '';
  const segment = path.split('/').filter(Boolean).pop();
  if (!segment) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
