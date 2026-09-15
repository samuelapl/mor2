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

interface RichContentProps {
  html?: string | null;
  className?: string;
  placeholder?: string;
}

export function RichContent({ html, className, placeholder }: RichContentProps) {
  const sanitized = sanitizeRichContent(html ?? "");
  if (!sanitized.trim()) {
    return (
      <p className={cn("text-xs italic text-slate-400", className)}>
        {placeholder ?? "No written content for this lesson yet."}
      </p>
    );
  }
  return (
    // eslint-disable-next-line react/no-danger
    <div className={cn("rich-content", className)} dangerouslySetInnerHTML={{ __html: sanitized }} />
  );
}