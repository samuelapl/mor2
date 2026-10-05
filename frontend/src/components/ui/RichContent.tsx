import { cn } from '@/lib/utils';

const ALLOWED_TAGS = new Set([
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
]);

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const looksLikeHtml = (text: string) =>
  /<\s*(p|div|h[1-6]|ul|ol|li|br|strong|em|b|i)\b/i.test(text);

function inlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/** Minimal markdown → HTML: headings, lists, blockquotes, rules, paragraphs, bold/italic/code. */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];

  const closeParagraph = () => {
    if (paragraph.length) out.push(`<p>${paragraph.map(inlineMarkdown).join('<br>')}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);

    if (!line.trim()) {
      closeParagraph();
      closeList();
    } else if (heading) {
      closeParagraph();
      closeList();
      const level = heading[1]!.length;
      out.push(`<h${level}>${inlineMarkdown(heading[2]!)}</h${level}>`);
    } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      closeParagraph();
      closeList();
      out.push('<hr>');
    } else if (bullet || numbered) {
      closeParagraph();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inlineMarkdown((bullet ?? numbered)![1]!)}</li>`);
    } else if (line.startsWith('>')) {
      closeParagraph();
      closeList();
      out.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s?/, ''))}</blockquote>`);
    } else {
      closeList();
      paragraph.push(line);
    }
  }
  closeParagraph();
  closeList();
  return out.join('\n');
}

export function toSafeHtml(content: string | null | undefined): string {
  if (!content?.trim()) return '';
  return looksLikeHtml(content)
    ? sanitizeRichContent(content)
    : sanitizeRichContent(markdownToHtml(content));
}

const REMOVED_TAGS =
  /<\s*\/?\s*(script|style|iframe|object|embed|link|meta|form|input|button|textarea|select|option|svg|math|audio|video|source|img|a)\b[^>]*>/gi;

const TAG_PATTERN = /<\s*\/?\s*([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;

/**
 * Allow-list HTML sanitizer for lesson rich content. Emits only plain, safe
 * tags (no attributes) so it can be rendered with dangerouslySetInnerHTML.
 */
export function sanitizeRichContent(html: string): string {
  if (!html) return '';
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(REMOVED_TAGS, '')
    .replace(/(\s+on\w+\s*=\s*("|')[^"']*("|'))/gi, '')
    .replace(/([a-zA-Z]+)\s*:\s*\/\//gi, '$1&#58;//');
  return stripped.replace(TAG_PATTERN, (match, tag: string) => {
    const normalized = tag.toLowerCase();
    if (ALLOWED_TAGS.has(normalized)) {
      if (/^<\s*\//.test(match)) return `</${normalized}>`;
      return `<${normalized}>`;
    }
    return '';
  });
}

export function stripHtmlTags(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

interface RichContentProps {
  html?: string | null;
  className?: string;
  placeholder?: string;
  inline?: boolean;
  /** Take font size, line height and colour from the surrounding text (e.g. a question title). */
  inheritText?: boolean;
}

export function RichContent({ html, className, placeholder, inline = false, inheritText = false }: RichContentProps) {
  const sanitized = toSafeHtml(html);
  if (inheritText) {
    className = cn('[color:inherit] [font-size:inherit] [line-height:inherit]', className);
  }
  if (!sanitized.trim()) {
    if (!placeholder) return null;
    return inline ? (
      <span className={cn('text-xs italic text-slate-400', className)}>{placeholder}</span>
    ) : (
      <p className={cn('text-xs italic text-slate-400', className)}>{placeholder}</p>
    );
  }
  return inline ? (
    <span
      className={cn('rich-content rich-content-inline inline [&_p]:inline [&_p]:m-0', className)}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  ) : (
    // eslint-disable-next-line react/no-danger
    <div
      className={cn('rich-content', className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
