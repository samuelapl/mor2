import { useCallback, useEffect, useRef, useState } from 'react';
import { addLessonTime } from '@/lib/api/progress';

interface UseClassroomHeartbeatProps {
  activeItemId: string | null;
  initialSeconds?: number;
  requiredSeconds?: number;
  onRequirementSatisfied?: () => void;
}

export function useClassroomHeartbeat({
  activeItemId,
  initialSeconds = 0,
  requiredSeconds = 0,
  onRequirementSatisfied,
}: UseClassroomHeartbeatProps) {
  const [liveSeconds, setLiveSeconds] = useState<Record<string, number>>({});
  const lastFlushRef = useRef<{ itemId: string; at: number } | null>(null);
  const satisfiedNotifiedRef = useRef<Record<string, boolean>>({});
  /** Seconds the server has confirmed per item, so a flush can tell the target is already saved. */
  const savedSecondsRef = useRef<Record<string, number>>({});
  /** Study time stops at the required time (lessons without one keep counting). */
  const reachedTarget = (seconds: number) => requiredSeconds > 0 && seconds >= requiredSeconds;

  // Synchronize initial baseline when active item changes or initialSeconds arrives
  useEffect(() => {
    if (!activeItemId) return;
    setLiveSeconds((prev) => {
      const current = prev[activeItemId] ?? 0;
      if (initialSeconds > current) {
        return { ...prev, [activeItemId]: initialSeconds };
      }
      return prev;
    });
  }, [activeItemId, initialSeconds]);

  const flushHeartbeat = useCallback(
    async (itemId: string) => {
      const ref = lastFlushRef.current;
      if (!ref || ref.itemId !== itemId) return null;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return null;

      const now = Date.now();
      const deltaSeconds = Math.min(300, Math.round((now - ref.at) / 1000));
      if (deltaSeconds <= 0) return null;
      lastFlushRef.current = { itemId, at: now };
      // Nothing left to record once the server has the full required time. (Until then the
      // last stretch is still sent, even if the local timer already reached the target.)
      if (reachedTarget(savedSecondsRef.current[itemId] ?? initialSeconds)) return null;

      try {
        const res = await addLessonTime(itemId, deltaSeconds);
        savedSecondsRef.current[itemId] = res.timeSpentSeconds;
        setLiveSeconds((prev) => ({ ...prev, [itemId]: res.timeSpentSeconds }));
        if (res.satisfied && onRequirementSatisfied && !satisfiedNotifiedRef.current[itemId]) {
          satisfiedNotifiedRef.current[itemId] = true;
          onRequirementSatisfied();
        }
        return res;
      } catch {
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onRequirementSatisfied, initialSeconds, requiredSeconds],
  );

  useEffect(() => {
    if (!activeItemId) {
      lastFlushRef.current = null;
      return;
    }

    lastFlushRef.current = { itemId: activeItemId, at: Date.now() };

    // 1. Tick local seconds every 1 second when active & tab is visible
    const tickInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

      setLiveSeconds((prev) => {
        const previous = prev[activeItemId] ?? initialSeconds;
        if (reachedTarget(previous)) return prev;
        const current = previous + 1;
        if (
          requiredSeconds > 0 &&
          current >= requiredSeconds &&
          !satisfiedNotifiedRef.current[activeItemId]
        ) {
          satisfiedNotifiedRef.current[activeItemId] = true;
          if (onRequirementSatisfied) {
            onRequirementSatisfied();
          }
        }
        return { ...prev, [activeItemId]: current };
      });
    }, 1000);

    // 2. Periodic background flush to backend every 15 seconds
    const flushInterval = setInterval(() => {
      void flushHeartbeat(activeItemId);
    }, 15000);

    return () => {
      clearInterval(tickInterval);
      clearInterval(flushInterval);
      if (activeItemId) {
        void flushHeartbeat(activeItemId);
      }
    };
  }, [activeItemId, flushHeartbeat, initialSeconds, requiredSeconds, onRequirementSatisfied]);

  return {
    liveSeconds,
    flushHeartbeat,
  };
}
