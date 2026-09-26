import { useEffect, useRef } from 'react';

/** Runs `callback` every `delayMs`; pass `null` to pause. Always calls the latest callback. */
export function useInterval(callback: () => void, delayMs: number | null): void {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;
    const timer = setInterval(() => saved.current(), delayMs);
    return () => clearInterval(timer);
  }, [delayMs]);
}
