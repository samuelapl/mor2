'use client';

import { useCallback } from 'react';
import { useLms } from '@/lib/lms-store';
import type { Lang, Role } from '@/types';
import {
  COMMON_TRANSLATIONS,
  NAV_TRANSLATIONS,
  ROLE_TRANSLATIONS,
  ROLE_DESCRIPTIONS,
  getTranslation,
  type TranslationEntry,
} from './translations';

export type BilingualInput = string | { en: string; am: string };

export function useTranslation() {
  const { lang, setLang, updateLocale, currentUser } = useLms();

  const t = useCallback(
    (key: string, fallback?: string | { en?: string; am?: string }): string => {
      if (typeof fallback === 'object') {
        return getTranslation(key, lang, fallback);
      }
      if (COMMON_TRANSLATIONS[key]) {
        return COMMON_TRANSLATIONS[key][lang];
      }
      if (NAV_TRANSLATIONS[key]) {
        return NAV_TRANSLATIONS[key][lang];
      }
      return fallback ?? key;
    },
    [lang],
  );

  const tBilingual = useCallback(
    (enOrEntry: BilingualInput, amFallback?: string): string => {
      if (typeof enOrEntry === 'object' && enOrEntry !== null) {
        return lang === 'am' ? enOrEntry.am : enOrEntry.en;
      }
      return lang === 'am' ? (amFallback ?? enOrEntry) : enOrEntry;
    },
    [lang],
  );

  const tRole = useCallback(
    (role?: Role | string | null): string => {
      if (!role) return '';
      return ROLE_TRANSLATIONS[role as Role]?.[lang] ?? role;
    },
    [lang],
  );

  const tRoleDesc = useCallback(
    (role?: Role | string | null): string => {
      if (!role) return '';
      return ROLE_DESCRIPTIONS[role as Role]?.[lang] ?? '';
    },
    [lang],
  );

  const tNav = useCallback(
    (label?: string | null): string => {
      if (!label) return '';
      return NAV_TRANSLATIONS[label]?.[lang] ?? label;
    },
    [lang],
  );

  return {
    t,
    tBilingual,
    tRole,
    tRoleDesc,
    tNav,
    lang,
    setLang,
    updateLocale,
    currentUser,
    isAmharic: lang === 'am',
    isEnglish: lang === 'en',
  };
}

export default useTranslation;
