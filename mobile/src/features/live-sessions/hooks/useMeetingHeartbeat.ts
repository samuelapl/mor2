import { onlineManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useMeetingStore } from '../store/meeting-store';

const BEAT_EVERY_MS = 30_000;

/**
 * Mounted once at the app root. Sends attendance heartbeats every 30 s while a virtual
 * session is active, and catches up immediately when the app returns to the foreground or
 * reconnects (e.g. coming back from Zoom).
 */
export function useMeetingHeartbeat(): void {
  const active = useMeetingStore((s) => s.active);
  const beat = useMeetingStore((s) => s.beat);
  const leave = useMeetingStore((s) => s.leave);
  const hasMeeting = active !== null;

  useEffect(() => {
    if (!hasMeeting) return;
    void beat();
    const timer = setInterval(() => void beat(), BEAT_EVERY_MS);
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') void beat();
    });
    const online = onlineManager.subscribe((isOnline) => {
      if (isOnline) void beat();
    });
    return () => {
      clearInterval(timer);
      appState.remove();
      online();
    };
  }, [hasMeeting, beat]);

  // A meeting past its end (plus grace) is closed automatically.
  useEffect(() => {
    if (active && Date.now() > active.endsAt) void leave();
  }, [active, leave]);
}
