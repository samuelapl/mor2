'use client';

import { create } from 'zustand';

import type { Lang } from '@/types';

export const LOCALE_STORAGE_KEY = 'eltms_locale';

export function getStoredLocale(): Lang {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'am' || stored === 'en') return stored;
  } catch {}
  return 'en';
}

export function persistLocale(locale: Lang): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = locale;
    }
  } catch {}
}

let hydrated = false;

interface LocaleState {
  lang: Lang;
}

interface LocaleActions {
  /** Restores the language saved on this device. Runs once per page load. */
  hydrate: () => void;
  /** Switches the UI language on this device (saved to localStorage). Does not touch the profile. */
  setLang: (lang: Lang) => void;
}

export type LocaleStore = LocaleState & LocaleActions;

export const useLocaleStore = create<LocaleStore>()((set) => ({
  lang: 'en',

  hydrate: () => {
    if (hydrated) return;
    hydrated = true;
    const stored = getStoredLocale();
    if (stored) {
      set({ lang: stored });
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.lang = stored;
      }
    }
  },

  setLang: (lang) => {
    set({ lang });
    persistLocale(lang);
  },
}));
