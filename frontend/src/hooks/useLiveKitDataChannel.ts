import { useCallback, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import type { LiveKitDataEvent } from '@/types/livekit-events';

/**
 * Hook for LiveKit WebRTC Data Channel broadcasting and event listening.
 * Uses sub-50ms reliable WebRTC channels for real-time live quizzes, polls, and hand-raising.
 */
export function useLiveKitDataChannel(
  optionsOrHandler?:
    ((event: LiveKitDataEvent) => void) | { onEvent?: (event: LiveKitDataEvent) => void },
) {
  const room = useRoomContext();
  const onEvent =
    typeof optionsOrHandler === 'function' ? optionsOrHandler : optionsOrHandler?.onEvent;

  const broadcast = useCallback(
    async (event: LiveKitDataEvent) => {
      if (!room || room.state !== 'connected') {
        console.warn('Cannot broadcast LiveKit data: room not connected');
        return;
      }
      try {
        const payload = new TextEncoder().encode(JSON.stringify(event));
        await room.localParticipant.publishData(payload, { reliable: true });
      } catch (err) {
        console.error('Failed to broadcast LiveKit data channel message:', err);
      }
    },
    [room],
  );

  useEffect(() => {
    if (!room || !onEvent) return;

    const handleData = (payload: Uint8Array) => {
      try {
        const str = new TextDecoder().decode(payload);
        const data = JSON.parse(str) as LiveKitDataEvent;
        if (data && data.type) {
          onEvent(data);
        }
      } catch {
        // ignore non-json or malformed packets
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, onEvent]);

  return {
    broadcast,
    isConnected: room?.state === 'connected',
    participantCount: room?.numParticipants ?? 0,
  };
}
