import { useEffect, useMemo, useRef, useState } from 'react';

import { useThemeColors } from '@/core/theme/colors';

import { buildHtmlDocument, toSafeHtml } from '../utils/rich-content';

/** Web build of LessonBody: a sandboxed, auto-sizing iframe instead of a WebView. */
export function LessonBody({ content }: { content: string | null | undefined }) {
  const colors = useThemeColors();
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(40);
  const body = toSafeHtml(content);
  const html = useMemo(
    () =>
      buildHtmlDocument(body, {
        text: colors.text,
        muted: colors.textMuted,
        primary: colors.primary,
        border: colors.border,
        background: colors.background,
      }),
    [body, colors],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.source === frame.current?.contentWindow &&
        typeof event.data?.eltmsHeight === 'number'
      ) {
        setHeight(event.data.eltmsHeight);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!body) return null;
  return (
    <iframe
      ref={frame}
      title="lesson"
      srcDoc={html}
      // Scripts only for the height reporter; links open in a new tab.
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      style={{ width: '100%', height, border: 0, background: 'transparent' }}
    />
  );
}
