import { useCallback } from 'react';

import type { Locale } from '../api/types';
import { useLocaleStore } from './locale-store';

type LocalizedBase = 'title' | 'description' | 'content' | 'body' | 'objectives';

type LocalizedEntity<B extends LocalizedBase> = Partial<
  Record<`${B}En` | `${B}Am`, string | null | undefined>
>;

/**
 * Picks `<base>Am` when the locale is Amharic and the value is non-empty, else `<base>En`.
 * Every backend entity exposes bilingual fields (titleEn/titleAm, contentEn/contentAm…).
 */
export function pickLocalized<B extends LocalizedBase>(
  entity: LocalizedEntity<B> | null | undefined,
  base: B,
  locale: Locale,
): string {
  if (!entity) return '';
  const am = entity[`${base}Am` as `${B}Am`];
  const en = entity[`${base}En` as `${B}En`];
  if (locale === 'am' && am && am.trim()) return am;
  return en ?? am ?? '';
}

/** Hook form of pickLocalized bound to the current UI locale. */
export function useLocalized() {
  const locale = useLocaleStore((s) => s.locale);
  return useCallback(
    <B extends LocalizedBase>(entity: LocalizedEntity<B> | null | undefined, base: B) =>
      pickLocalized(entity, base, locale),
    [locale],
  );
}
