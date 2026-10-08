import { escapeHtml } from './escape';

/**
 * Content of one email. Every field is plain text: `renderLayout` escapes it, so templates
 * never build HTML from user input themselves.
 */
export interface EmailContent {
  appName: string;
  paragraphs: string[];
  /** A one-time code, shown large and spaced ("123 456"). */
  code?: string;
  button?: { label: string; url: string };
  /** Small grey text under the body (expiry notice, "ignore this if..."). */
  notes?: string[];
}

export function renderLayout(content: EmailContent): { html: string; text: string } {
  const { appName, paragraphs, code, button, notes = [] } = content;
  // Format as "123 456" for easy readability in the email body.
  const displayCode = code ? `${code.slice(0, 3)} ${code.slice(3)}` : undefined;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#1e293b;margin:0 0 8px">${escapeHtml(appName)}</h2>
      ${paragraphs
        .map((p) => `<p style="color:#475569;font-size:14px;line-height:1.6">${escapeHtml(p)}</p>`)
        .join('\n')}
      ${
        displayCode
          ? `<p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#4f46e5;background:#eef2ff;display:inline-block;padding:12px 24px;border-radius:8px;margin:16px 0">${escapeHtml(displayCode)}</p>`
          : ''
      }
      ${
        button
          ? `<p style="margin:20px 0"><a href="${escapeHtml(button.url)}" style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;display:inline-block">${escapeHtml(button.label)}</a></p>`
          : ''
      }
      ${
        notes.length
          ? `<p style="color:#94a3b8;font-size:12px">${notes.map(escapeHtml).join('<br/>')}</p>`
          : ''
      }
    </div>
  `;

  const text = [
    ...paragraphs,
    ...(code ? [code] : []),
    ...(button ? [`${button.label}: ${button.url}`] : []),
    ...notes,
  ].join('\n\n');

  return { html, text };
}
