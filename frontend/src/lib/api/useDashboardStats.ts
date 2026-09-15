"use client";

import { useEffect, useState } from "react";
import type { ApiDashboardStats } from "@/lib/api/types";
import { fetchDashboardStats } from "@/lib/api/dashboard";

/**
 * Loads the platform dashboard stats (system/training admins). Failures are
 * surfaced via the error state so pages can degrade gracefully.
 */
export function useDashboardStats() {
  const [stats, setStats] = useState<ApiDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDashboardStats()
      .then((res) => {
        if (!cancelled) {
          setStats(res);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load stats.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading, error };
}