import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import am from './locales/am.json';
import en from './locales/en.json';
import { useLocaleStore } from './locale-store';

/**
 * UI language (LEARNER_MOBILE_ARCHITECTURE.md §6.11).
 * Before login the device language / saved preference is used; after login the
 * auth feature calls `setLocale(user.locale)` so the server value wins.
 */

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, am: { translation: am } },
  lng: useLocaleStore.getState().locale,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

useLocaleStore.subscribe((state, prev) => {
  if (state.locale !== prev.locale) void i18n.changeLanguage(state.locale);
});

export { i18n };
export { getCurrentLocale, useLocaleStore } from './locale-store';
export { pickLocalized, useLocalized } from './localized';
