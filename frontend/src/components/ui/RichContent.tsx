import { cn } from "@/lib/utils";

const ALLOWED_TAGS = new Set([
  "b",
  "i",
  "u",
  "s",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "p",
  "br",
  "span",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
]);

const REMOVED_TAGS = /<\s*\/?\s*(script|style|iframe|object|embed|link|meta|form|input|button|textarea|select|option|svg|math|audio|video|source|img|a)\b[^>]*>/gi;

const TAG_PATTERN = /<\s*\/?\s*([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;

/**
 * Allow-list HTML sanitizer for lesson rich content. Emits only plain, safe
 * tags (no attributes) so it can be rendered with dangerouslySetInnerHTML.
 */
export function sanitizeRichContent(html: string): string {
  if (!html) return "";
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(REMOVED_TAGS, "")
    .replace(/(\s+on\w+\s*=\s*("|')[^"']*("|'))/gi, "")
    .replace(/([a-zA-Z]+)\s*:\s*\/\//gi, "$1&#58;//");
  return stripped.replace(TAG_PATTERN, (match, tag: string) => {
    const normalized = tag.toLowerCase();
    if (ALLOWED_TAGS.has(normalized)) {
      if (/^<\s*\//.test(match)) return `</${normalized}>`;
      return `<${normalized}>`;
    }
    return "";
  });
}

export function stripHtmlTags(html?: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

interface RichContentProps {
  html?: string | null;
  className?: string;
  placeholder?: string;
  inline?: boolean;
}

export function RichContent({ html, className, placeholder, inline = false }: RichContentProps) {
  const sanitized = sanitizeRichContent(html ?? "");
  if (!sanitized.trim()) {
    if (!placeholder) return null;
    return inline ? (
      <span className={cn("text-xs italic text-slate-400", className)}>
        {placeholder}
      </span>
    ) : (
      <p className={cn("text-xs italic text-slate-400", className)}>
        {placeholder}
      </p>
    );
  }
  return inline ? (
    <span
      className={cn("rich-content rich-content-inline inline [&_p]:inline [&_p]:m-0", className)}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  ) : (
    // eslint-disable-next-line react/no-danger
    <div className={cn("rich-content", className)} dangerouslySetInnerHTML={{ __html: sanitized }} />
  );
}