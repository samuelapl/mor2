"use client";

import { useEffect, useState } from "react";
import type { ApiCourseProgress } from "@/lib/api/types";
import { fetchCourseProgress } from "@/lib/api/progress";

/**
 * Fetches live progress for a set of courses and returns a map keyed by course id.
 * Individual failures are skipped so a single failure does not blank the page.
 */
export function useCourseProgress(courseIds: string[]) {
  const idsKey = Array.from(new Set(courseIds)).sort().join("|");
  const [progress, setProgress] = useState<Record<string, ApiCourseProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const ids = idsKey ? idsKey.split("|") : [];
    if (ids.length === 0) {
      setProgress({});
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            return { id, progress: await fetchCourseProgress(id) };
          } catch {
            return { id, progress: null };
          }
        }),
      );
      if (cancelled) return;
      const map: Record<string, ApiCourseProgress> = {};
      for (const entry of entries) {
        if (entry.progress) map[entry.id] = entry.progress;
      }
      setProgress(map);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return { progress, loading };
}