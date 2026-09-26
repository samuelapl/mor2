import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, ProgressBar } from '@/components/ui';
import { palette, useThemeColors } from '@/core/theme/colors';
import { formatClock } from '@/core/utils/formatters';

import type { MediaStageProps } from './VideoStage';

/** Audio lesson player (expo-audio) with play/pause and ±15 s skip. */
export function AudioStage({
  url,
  startAt,
  onPlayingChange,
  onPosition,
  onPause,
  onEnded,
}: MediaStageProps) {
  const colors = useThemeColors();
  const player = useAudioPlayer(url, { updateInterval: 1000 });
  const status = useAudioPlayerStatus(player);
  const seeked = useRef(false);
  const wasPlaying = useRef(false);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  useEffect(() => {
    if (status.isLoaded && !seeked.current) {
      seeked.current = true;
      if (startAt > 0 && (status.duration === 0 || startAt < status.duration - 5))
        void player.seekTo(startAt);
    }
  }, [status.isLoaded, status.duration, startAt, player]);

  useEffect(() => {
    if (status.playing !== wasPlaying.current) {
      wasPlaying.current = status.playing;
      onPlayingChange(status.playing);
      if (!status.playing) onPause();
    }
  }, [status.playing, onPlayingChange, onPause]);

  useEffect(() => {
    if (status.playing) onPosition(status.currentTime);
  }, [status.currentTime, status.playing, onPosition]);

  useEffect(() => {
    if (status.didJustFinish) onEnded();
  }, [status.didJustFinish, onEnded]);

  useEffect(() => () => onPause(), [onPause]);

  const percent = status.duration > 0 ? (status.currentTime / status.duration) * 100 : 0;
  const skip = (delta: number) => void player.seekTo(Math.max(0, status.currentTime + delta));

  return (
    <View className="gap-4 rounded-2xl bg-brand-600 p-5">
      <ProgressBar percent={percent} className="bg-brand-400" />
      <View className="flex-row justify-between">
        <AppText className="text-xs text-brand-100">{formatClock(status.currentTime)}</AppText>
        <AppText className="text-xs text-brand-100">{formatClock(status.duration)}</AppText>
      </View>
      <View className="flex-row items-center justify-center gap-8">
        <Pressable accessibilityLabel="Back 15 seconds" hitSlop={10} onPress={() => skip(-15)}>
          <RotateCcw size={28} color={palette.white} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status.playing ? 'Pause' : 'Play'}
          onPress={() => (status.playing ? player.pause() : player.play())}
          className="h-16 w-16 items-center justify-center rounded-full bg-white"
        >
          {status.playing ? (
            <Pause size={30} color={colors.primary} />
          ) : (
            <Play size={30} color={colors.primary} />
          )}
        </Pressable>
        <Pressable accessibilityLabel="Forward 15 seconds" hitSlop={10} onPress={() => skip(15)}>
          <RotateCw size={28} color={palette.white} />
        </Pressable>
      </View>
    </View>
  );
}
