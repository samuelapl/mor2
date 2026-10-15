import * as sanitizeHtml from 'sanitize-html';

export const ALLOWED_RICH_TAGS = [
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
  'code',
  'pre',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
];

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/**
 * Sanitizes rich HTML content (e.g. from Tiptap/RichTextArea) before storing in DB.
 * Preserves safe formatting tags (headings, lists, bold, italic, code, tables, etc.)
 * while completely stripping executable scripts, event handlers, frames, and dangerous tags.
 */
export function sanitizeRichHtml(html: string): string;
export function sanitizeRichHtml(html: null): null;
export function sanitizeRichHtml(html: undefined): undefined;
export function sanitizeRichHtml(html: string | null | undefined): string | null | undefined;
export function sanitizeRichHtml(html: string | null | undefined): string | null | undefined {
  if (html === undefined) return undefined;
  if (html === null) return null;
  const trimmed = html.trim();
  if (!trimmed) return '';

  return sanitizeHtml(trimmed, {
    allowedTags: ALLOWED_RICH_TAGS,
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  }).trim();
}

/**
 * Strips all HTML tags and normalizes whitespace for plain text fields (titles, codes, comments).
 */
export function sanitizePlainText(text: string): string;
export function sanitizePlainText(text: null): null;
export function sanitizePlainText(text: undefined): undefined;
export function sanitizePlainText(text: string | null | undefined): string | null | undefined;
export function sanitizePlainText(text: string | null | undefined): string | null | undefined {
  if (text === undefined) return undefined;
  if (text === null) return null;
  const trimmed = text.trim();
  if (!trimmed) return '';

  const stripped = sanitizeHtml(trimmed, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });

  return stripped
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

