import type { Lang } from '@/types';
import { COMMON_TRANSLATIONS } from '@/lib/i18n/translations';

export type TranslationKey = keyof typeof COMMON_TRANSLATIONS | string;

export function tr(lang: Lang, key: TranslationKey): string {
  const entry = (COMMON_TRANSLATIONS as Record<string, { en: string; am: string }>)[key];
  if (entry) {
    return entry[lang] ?? entry.en;
  }
  return key;
}

export { COMMON_TRANSLATIONS as TRANSLATIONS };
