import type { ApiNewsDetail } from './types';

/**
 * Server-side reads for the public news pages (server components): metadata for link
 * previews needs the post before any client JS runs. The Next server may reach the API on
 * an internal address, so API_INTERNAL_URL wins over the public one when set.
 */
const SERVER_API_URL = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1'
).replace(/\/+$/, '');

/** Seconds a rendered post is reused before Next refetches it. */
export const NEWS_REVALIDATE_SECONDS = 60;

export async function fetchPublishedNewsServer(slug: string): Promise<ApiNewsDetail | null> {
  try {
    const res = await fetch(`${SERVER_API_URL}/news/${encodeURIComponent(slug)}`, {
      next: { revalidate: NEWS_REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: ApiNewsDetail };
    return body.data ?? null;
  } catch {
    return null;
  }
}
