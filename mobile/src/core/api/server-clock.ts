import { useCallback, useEffect, useState } from 'react';

import { api } from './client';
import { endpoints } from './endpoints';

/**
 * Offset between the server clock and the phone clock, read once per app run and kept in
 * memory only (not in the persisted query cache: the phone clock may be corrected between
 * runs). Session join windows use it so a phone with a wrong clock or time zone neither opens
 * them early nor late.
 */
let offsetMs: number | null = null;
let pending: Promise<number> | null = null;

function loadOffset(): Promise<number> {
  if (offsetMs !== null) return Promise.resolve(offsetMs);
  if (!pending) {
    const sentAt = Date.now();
    pending = api
      .get<{ now: string }>(endpoints.time)
      // Assume the server read its clock halfway through the request.
      .then((res) => (offsetMs = new Date(res.now).getTime() - (sentAt + Date.now()) / 2))
      .catch(() => {
        pending = null; // try again next time a screen asks
        return 0;
      });
  }
  return pending;
}

/** Returns `now()` on the server clock; falls back to the phone clock until it is known. */
export function useServerNow(): () => number {
  const [offset, setOffset] = useState(offsetMs ?? 0);
  useEffect(() => {
    let active = true;
    void loadOffset().then((value) => active && setOffset(value));
    return () => {
      active = false;
    };
  }, []);
  return useCallback(() => Date.now() + offset, [offset]);
}
