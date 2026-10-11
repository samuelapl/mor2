import { Directory, File, Paths } from 'expo-file-system';
import { Presentation } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { AppText, Card } from '@/components/ui';
import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';
import { palette } from '@/core/theme/colors';

import { buildDeckViewerHtml, type DeckViewerMessage } from '../utils/deck-viewer-html';
import { deckKind } from '../utils/lesson-blocks';
import { FileRow } from './FileRow';
import { WebContentStage } from './WebContentStage';

/** Stable cache file name for a deck URL. */
function cacheName(url: string, ext: string) {
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = (Math.imul(31, hash) + url.charCodeAt(i)) | 0;
  return `deck_${(hash >>> 0).toString(36)}.${ext}`;
}

/**
 * The deck's bytes as base64: a downloaded (offline) file is read from the phone; a remote
 * one is cached first, so reopening the lesson does not download it again.
 */
async function readDeck(url: string, ext: string): Promise<string> {
  if (url.startsWith('file://')) return new File(url).base64();
  const dir = new Directory(Paths.cache, 'slide_decks');
  if (!dir.exists) dir.create({ intermediates: true });
  const target = new File(dir, cacheName(url, ext));
  if (!target.exists) await File.downloadFileAsync(url, target, { idempotent: true });
  return target.base64();
}

/**
 * A slide deck (PDF / PPTX) shown in the lesson as a scrollable column of pages, like the
 * web's SlideDeckViewer. Google Slides use Google's embed; other files fall back to a file row.
 * Give it a `key` that includes the url, so another deck starts from a fresh state.
 */
export function SlideDeckStage({ url, fileName, title }: { url: string; fileName?: string; title?: string }) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const resolved = resolveMediaUrl(url) ?? url;
  const kind = deckKind(url, fileName);
  const name = fileName || title || decodeURIComponent(url.split('?')[0]?.split('/').pop() ?? '');

  const webview = useRef<WebView>(null);
  const [pages, setPages] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const bytes = useRef<string | null>(null);
  const viewerReady = useRef(false);
  const delivered = useRef(false);

  const html = useMemo(
    () =>
      kind === 'pdf' || kind === 'pptx'
        ? buildDeckViewerHtml(kind, {
            loading: t('classroom.deckLoading'),
            failed: t('classroom.deckFailed'),
          })
        : null,
    [kind, t],
  );

  // Hand the bytes over once both the file and the viewer page are ready. They are kept: if
  // the WebView reloads (Android may restart it), the page posts `ready` again.
  const deliver = () => {
    if (!viewerReady.current || !bytes.current || delivered.current) return;
    delivered.current = true;
    webview.current?.injectJavaScript(`window.__loadDeck(${JSON.stringify(bytes.current)});true;`);
  };

  useEffect(() => {
    if (!html) return;
    let cancelled = false;
    bytes.current = null;
    delivered.current = false;
    readDeck(resolved, kind === 'pdf' ? 'pdf' : 'pptx')
      .then((b64) => {
        if (cancelled) return;
        bytes.current = b64;
        deliver();
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, html]);

  const onMessage = (e: WebViewMessageEvent) => {
    let message: DeckViewerMessage;
    try {
      message = JSON.parse(e.nativeEvent.data) as DeckViewerMessage;
    } catch {
      return;
    }
    if (message.type === 'ready') {
      viewerReady.current = true;
      delivered.current = false;
      deliver();
    } else if (message.type === 'pages') {
      setPages(message.count);
    } else if (message.type === 'error') {
      setFailed(true);
    }
  };

  if (kind === 'google') {
    return <WebContentStage url={resolved.replace(/\/(edit|pub)\b.*$/, '/embed')} />;
  }
  if (!html || failed) {
    // Not something the viewer draws (or it could not): offer the file instead.
    return <FileRow url={resolved} fileName={name} />;
  }

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <View className="flex-row items-center gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
        <Presentation size={16} color={palette.brand600} />
        <AppText variant="label" className="flex-1" numberOfLines={1}>
          {name || t('classroom.slideDeck')}
        </AppText>
        {pages ? <AppText variant="caption">{t('classroom.deckPages', { count: pages })}</AppText> : null}
      </View>
      <View style={{ height: Math.max(420, Math.round(height * 0.7)) }} className="bg-slate-900">
        <WebView
          ref={webview}
          source={{ html, baseUrl: 'http://localhost' }}
          originWhitelist={['*']}
          javaScriptEnabled
          onMessage={onMessage}
          // Scroll the pages inside the lesson's own scroll view (Android).
          nestedScrollEnabled
          setBuiltInZoomControls
          setDisplayZoomControls={false}
          style={{ flex: 1, backgroundColor: '#0f172a' }}
        />
      </View>
    </Card>
  );
}
