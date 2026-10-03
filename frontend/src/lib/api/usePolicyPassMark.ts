'use client';

import { useEffect, useState } from 'react';
import { fetchCoursePolicy } from './policy';

/** Backend default when the policy row has no value (PolicyService.getPassingScorePercent). */
export const FALLBACK_PASS_MARK = 50;

let cached: number | null = null;
let inflight: Promise<number> | null = null;

function loadPassMark(): Promise<number> {
  inflight ??= fetchCoursePolicy()
    .then((p) => (cached = p.passingScorePercent ?? FALLBACK_PASS_MARK))
    .catch(() => {
      inflight = null; // let a later caller retry
      return FALLBACK_PASS_MARK;
    });
  return inflight;
}

/**
 * The global pass mark from Policy Settings: the default for new assessments and the
 * course grade a learner needs for a certificate. `null` until loaded.
 */
export function usePolicyPassMark(): number | null {
  const [value, setValue] = useState<number | null>(cached);
  useEffect(() => {
    if (cached !== null) return;
    let alive = true;
    void loadPassMark().then((v) => alive && setValue(v));
    return () => {
      alive = false;
    };
  }, []);
  return value;
}
