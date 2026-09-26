import { getLocales } from 'expo-localization';
import { create } from 'zustand';

import type { Locale } from '../api/types';
import { preferencesStorage } from '../storage/kv-storage';

const LOCALE_KEY = 'locale';

export function initialLocale(): Locale {
  const saved = preferencesStorage.getString(LOCALE_KEY);
  if (saved === 'en' || saved === 'am') return saved;
  return getLocales()[0]?.languageCode === 'am' ? 'am' : 'en';
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

/** Subscribers (i18next) react to changes in index.ts. */
export const useLocaleStore = create<LocaleState>((set) => ({
  locale: initialLocale(),
  setLocale: (locale) => {
    preferencesStorage.set(LOCALE_KEY, locale);
    set({ locale });
  },
}));

export const getCurrentLocale = (): Locale => useLocaleStore.getState().locale;
