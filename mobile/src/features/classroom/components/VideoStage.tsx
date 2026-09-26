import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

export interface MediaStageProps {
  url: string;
  /** Seconds to resume from. */
  startAt: number;
  onPlayingChange: (playing: boolean) => void;
  onPosition: (seconds: number) => void;
  /** Pause / leaving — commit the playhead. */
  onPause: () => void;
  onEnded: () => void;
}

/** Native video (expo-video) with PiP and fullscreen (architecture §6.3). */
export function VideoStage({
  url,
  startAt,
  onPlayingChange,
  onPosition,
  onPause,
  onEnded,
}: MediaStageProps) {
  const seeked = useRef(false);
  const player = useVideoPlayer(url, (p) => {
    p.timeUpdateEventInterval = 1;
  });

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay' && !seeked.current) {
      seeked.current = true;
      const duration = player.duration;
      if (startAt > 0 && (duration === 0 || startAt < duration - 5)) {
        player.seekBy(startAt - player.currentTime);
      }
    }
  });
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    onPlayingChange(isPlaying);
    if (!isPlaying) onPause();
  });
  useEventListener(player, 'timeUpdate', ({ currentTime }) => onPosition(currentTime));
  useEventListener(player, 'playToEnd', onEnded);

  // Leaving the lesson commits the position.
  useEffect(() => () => onPause(), [onPause]);

  return (
    <View className="aspect-video w-full overflow-hidden bg-black">
      <VideoView
        player={player}
        style={{ width: '100%', height: '100%' }}
        nativeControls
        contentFit="contain"
        allowsPictureInPicture
        fullscreenOptions={{ enable: true }}
      />
    </View>
  );
}
