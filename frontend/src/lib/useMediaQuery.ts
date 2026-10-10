'use client';

import { useSyncExternalStore } from 'react';

/** Tailwind `md`: below this the dashboard sidebar becomes a drawer. */
export const MOBILE_QUERY = '(max-width: 767px)';
/** Tailwind `md`–`lg`: the dashboard sidebar starts as a collapsed icon rail. */
export const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';

/**
 * Live result of a CSS media query. Returns false during server rendering, so layout that must
 * be right on first paint should use Tailwind breakpoints and keep this for behaviour.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
