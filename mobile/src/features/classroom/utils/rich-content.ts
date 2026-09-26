/**
 * Lesson bodies (contentEn/contentAm) are HTML from the web editor, but seed data uses plain
 * markdown. Both become a small, sanitized HTML document rendered in a WebView.
 * The allow-list mirrors frontend/src/components/ui/RichContent.tsx.
 */

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
const REMOVED_BLOCKS =
  /<\s*(script|style|iframe|object|embed|svg|math|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;
const TAG_PATTERN = /<\s*\/?\s*([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(REMOVED_BLOCKS, '')
    .replace(TAG_PATTERN, (match, tag: string) => {
      const name = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return '';
      return /^<\s*\//.test(match) ? `</${name}>` : `<${name}>`;
    });
}

const looksLikeHtml = (text: string) =>
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
  return looksLikeHtml(content) ? sanitizeHtml(content) : markdownToHtml(content);
}

export interface HtmlTheme {
  text: string;
  muted: string;
  primary: string;
  border: string;
  background: string;
}

/** Full HTML document; posts its height to React Native so the WebView can auto-size. */
export function buildHtmlDocument(body: string, theme: HtmlTheme): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  html,body{margin:0;padding:0;background:${theme.background};}
  body{font-family:-apple-system,Roboto,"Noto Sans Ethiopic",sans-serif;font-size:16px;line-height:1.6;color:${theme.text};word-wrap:break-word;}
  h1,h2,h3,h4{line-height:1.3;margin:1.1em 0 .5em;color:${theme.text};}
  h1{font-size:1.5em}h2{font-size:1.3em}h3{font-size:1.15em}h4{font-size:1em}
  p{margin:0 0 .9em}ul,ol{padding-left:1.3em;margin:0 0 .9em}li{margin:.25em 0}
  blockquote{margin:0 0 .9em;padding:.4em .9em;border-left:3px solid ${theme.primary};color:${theme.muted};}
  code,pre{font-family:monospace;background:${theme.border};border-radius:4px;padding:.1em .3em}
  pre{padding:.7em;overflow-x:auto}hr{border:0;border-top:1px solid ${theme.border};margin:1.2em 0}
  table{border-collapse:collapse;width:100%;margin:0 0 .9em}th,td{border:1px solid ${theme.border};padding:.4em;text-align:left}
  body>*:first-child{margin-top:0}
</style></head><body>${body}
<script>
  function post(){var h=String(document.documentElement.scrollHeight);if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(h);}else if(window.parent!==window){window.parent.postMessage({eltmsHeight:Number(h)},'*');}}
  window.addEventListener('load',post);new ResizeObserver(post).observe(document.body);setTimeout(post,50);
</script></body></html>`;
}

/** youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID → embed URL, else null. */
export function toYoutubeEmbed(url: string): string | null {
  const match =
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(
      url,
    );
  return match ? `https://www.youtube.com/embed/${match[1]}?playsinline=1&rel=0` : null;
}
