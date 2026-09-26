import { View } from 'react-native';
import { WebView } from 'react-native-webview';

/** INTERACTIVE / SCORM packages and YouTube embeds rendered in a WebView. */
export function WebContentStage({
  url,
  aspect = 'tall',
}: {
  url: string;
  aspect?: 'video' | 'tall';
}) {
  return (
    <View className={aspect === 'video' ? 'aspect-video w-full bg-black' : 'h-[520px] w-full'}>
      <WebView
        source={{ uri: url }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        style={{ flex: 1 }}
      />
    </View>
  );
}
