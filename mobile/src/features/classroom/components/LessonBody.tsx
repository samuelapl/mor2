import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useThemeColors } from '@/core/theme/colors';

import { buildHtmlDocument, toSafeHtml } from '../utils/rich-content';

/** Renders lesson HTML/markdown (contentEn/contentAm) in an auto-sizing, non-scrolling WebView. */
export function LessonBody({ content }: { content: string | null | undefined }) {
  const colors = useThemeColors();
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

  if (!body) return null;

  return (
    <View style={{ height }}>
      <WebView
        originWhitelist={['about:blank', 'data:*']}
        source={{ html }}
        scrollEnabled={false}
        style={{ backgroundColor: 'transparent' }}
        onMessage={(event) => {
          const next = Number(event.nativeEvent.data);
          if (Number.isFinite(next) && next > 0 && Math.abs(next - height) > 2) setHeight(next);
        }}
        // Links inside lesson text open in the in-app browser instead of replacing the lesson.
        onShouldStartLoadWithRequest={(request) => {
          if (request.url.startsWith('http')) {
            void WebBrowser.openBrowserAsync(request.url);
            return false;
          }
          return true;
        }}
      />
    </View>
  );
}
