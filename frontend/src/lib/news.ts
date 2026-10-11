import type { Lang } from '@/types';
import type { NewsCategory, NewsStatus } from '@/lib/api/types';
import type { NamespaceKey } from '@/lib/i18n';

/**
 * News text (headline, summary, content) is shown exactly as written — usually Amharic,
 * sometimes English — whatever the UI language. Only the labels around it are translated.
 */

// Ethiopic, Ethiopic Supplement, Extended and Extended-A blocks (no `u` flag: the build targets ES5).
const ETHIOPIC = /[\u1200-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/;

/** `lang` attribute for news text, so the browser picks the right font and hyphenation. */
export function newsTextLang(...texts: (string | null | undefined)[]): 'am' | 'en' {
  return texts.some((t) => t && ETHIOPIC.test(t)) ? 'am' : 'en';
}

export const NEWS_CATEGORIES: NewsCategory[] = ['PRESS_RELEASE', 'ANNOUNCEMENT', 'EVENT', 'NOTICE'];

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, NamespaceKey<'news'>> = {
  PRESS_RELEASE: 'news.pressRelease',
  ANNOUNCEMENT: 'news.announcement',
  EVENT: 'news.event',
  NOTICE: 'news.notice',
};

export const NEWS_STATUS_LABELS: Record<NewsStatus, NamespaceKey<'news'>> = {
  DRAFT: 'news.draft',
  PENDING_REVIEW: 'news.pendingReview',
  REJECTED: 'news.rejected',
  PUBLISHED: 'news.published',
  ARCHIVED: 'news.unpublished',
};

export const NEWS_STATUS_VARIANTS: Record<
  NewsStatus,
  'slate' | 'amber' | 'red' | 'green' | 'outline'
> = {
  DRAFT: 'slate',
  PENDING_REVIEW: 'amber',
  REJECTED: 'red',
  PUBLISHED: 'green',
  ARCHIVED: 'outline',
};

/** Statuses an author holding only news.manage can still edit, submit or delete. */
export const AUTHOR_EDITABLE_STATUSES: NewsStatus[] = ['DRAFT', 'REJECTED'];

export const NEWS_PERMISSIONS = { manage: 'news.manage', publish: 'news.publish' } as const;

export function formatNewsDate(value: string | null | undefined, lang: Lang): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Public path for a post; Next/Link and the browser percent-encode Ethiopic slugs. */
export function newsPath(slug: string): string {
  return `/news/${slug}`;
}

export function newsUrl(slug: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/news/${encodeURIComponent(slug)}`;
}

/** Plain-text excerpt of rich content, for meta descriptions when a post has no summary. */
export function buildSummaryText(html: string, maxLength = 200): string {
  const text = html
    .replace(/<\/(p|div|li|h[1-4]|blockquote)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
