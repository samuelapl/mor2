import type { Role, Lang } from '@/types';

import { catalogs } from './index';

/**
 * Legacy `{ en, am }` views over the JSON catalog (locales/en + locales/am), kept for the
 * remaining callers (PageShell, PageSection, constants/labels `tr`). Removed in i18n Phase 5.
 */
export interface TranslationEntry {
  en: string;
  am: string;
}

function pair<T extends Record<string, string>>(en: T, am: T): Record<string, TranslationEntry> {
  return Object.fromEntries(Object.keys(en).map((key) => [key, { en: en[key], am: am[key] ?? en[key] }]));
}

export const ROLE_TRANSLATIONS = pair(catalogs.en.roles.names, catalogs.am.roles.names) as Record<Role, TranslationEntry>;
export const ROLE_DESCRIPTIONS = pair(catalogs.en.roles.descriptions, catalogs.am.roles.descriptions) as Record<Role, TranslationEntry>;
export const NAV_TRANSLATIONS: Record<string, TranslationEntry> = pair(catalogs.en.nav, catalogs.am.nav);
export const COMMON_TRANSLATIONS: Record<string, TranslationEntry> = pair(catalogs.en.common, catalogs.am.common);

/**
 * Helper to get a translation by key with optional fallbacks
 */
export function getTranslation(
  key: string,
  lang: Lang,
  fallback?: { en?: string; am?: string },
): string {
  if (COMMON_TRANSLATIONS[key]) {
    return COMMON_TRANSLATIONS[key][lang];
  }
  if (NAV_TRANSLATIONS[key]) {
    return NAV_TRANSLATIONS[key][lang];
  }
  if (fallback) {
    return lang === 'am' ? (fallback.am ?? fallback.en ?? key) : (fallback.en ?? key);
  }
  return key;
}
