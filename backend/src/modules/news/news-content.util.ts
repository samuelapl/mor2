import * as sanitizeHtml from 'sanitize-html';
import { SUMMARY_LENGTH } from './news.constants';

// Mirrors the frontend allow-list in components/ui/RichContent.tsx — tags only, no attributes.
const ALLOWED_TAGS = [
  'b',
  'i',
  'u',
  's',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'p',
  'br',
  'span',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'blockquote',
];

const BLOCK_END = /<\/(p|div|li|h[1-4]|blockquote)>|<br\s*\/?>/gi;

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

export function sanitizeNewsHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  }).trim();
}

/** Plain text from rich content; block boundaries become spaces so words do not run together. */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  const text = sanitizeHtml(html.replace(BLOCK_END, '$& '), {
    allowedTags: [],
    allowedAttributes: {},
  });
  return text
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
    .replace(/\s+/g, ' ')
    .trim();
}

/** Card excerpt: the explicit summary when given, otherwise the start of the content cut at a word. */
export function buildSummary(
  summary: string | null | undefined,
  contentHtml: string | null | undefined,
  maxLength = SUMMARY_LENGTH,
): string | null {
  if (summary?.trim()) return summary.trim();
  const text = htmlToPlainText(contentHtml);
  if (!text) return null;
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
