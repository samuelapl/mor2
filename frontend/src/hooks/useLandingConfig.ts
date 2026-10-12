'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocaleStore } from '@/lib/stores/locale-store';
import {
  DEFAULT_LANDING_PAGE_CONFIG,
  fetchPublicLandingConfig,
  type LandingPageConfig,
} from '@/lib/api/landing-page';

let cachedConfig: LandingPageConfig = DEFAULT_LANDING_PAGE_CONFIG;
let hasFetchedOnce = false;

export function useLandingConfig() {
  const [config, setConfig] = useState<LandingPageConfig>(cachedConfig);
  const [loading, setLoading] = useState(!hasFetchedOnce);
  const [error, setError] = useState<string | null>(null);
  const lang = useLocaleStore((s) => s.lang);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPublicLandingConfig();
      cachedConfig = data;
      hasFetchedOnce = true;
      setConfig(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load landing configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchPublicLandingConfig()
      .then((data) => {
        if (!cancelled && data) {
          cachedConfig = data;
          hasFetchedOnce = true;
          setConfig(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error loading landing page configuration');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const resolveText = useCallback(
    (en?: string, am?: string): string => {
      if (lang === 'am') {
        return (am && am.trim().length > 0) ? am : (en ?? '');
      }
      return (en && en.trim().length > 0) ? en : (am ?? '');
    },
    [lang],
  );

  return {
    config,
    loading,
    error,
    reload,
    resolveText,
    lang,
  };
}

