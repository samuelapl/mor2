'use client';

import { useCallback } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useLocaleStore } from '@/lib/stores/locale-store';
import type { ActionResult, Lang, Role } from '@/types';
import {
  lookupIn,
  translateIn,
  type Namespace,
  type NamespaceKey,
  type TranslationKey,
  type TranslationVars,
} from './index';

export type BilingualInput = string | { en: string; am: string };

/** `t` for a namespace takes keys relative to it; without a namespace it takes full keys. */
type TFunction<K extends string> = (key: K, vars?: TranslationVars) => string;

export function useTranslation(): TranslationApi<TranslationKey>;
export function useTranslation<N extends Namespace>(namespace: N): TranslationApi<NamespaceKey<N>>;
export function useTranslation(namespace?: Namespace): TranslationApi<string> {
  const lang = useLocaleStore((s) => s.lang);
  const currentUser = useAuthStore((s) => s.currentUser);

  const t = useCallback(
    (key: string, vars?: TranslationVars): string =>
      translateIn(lang, namespace ? `${namespace}.${key}` : key, vars),
    [lang, namespace],
  );

  /** @deprecated Inline bilingual text — use `t('key')` with locales/en + locales/am. */
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
      return lookupIn(lang, `roles.names.${role}`) ?? role;
    },
    [lang],
  );

  const tRoleDesc = useCallback(
    (role?: Role | string | null): string => {
      if (!role) return '';
      return lookupIn(lang, `roles.descriptions.${role}`) ?? '';
    },
    [lang],
  );

  /** Sidebar/menu labels are looked up by their English label. */
  const tNav = useCallback(
    (label?: string | null): string => {
      if (!label) return '';
      return lookupIn(lang, `nav.${label}`) ?? label;
    },
    [lang],
  );

  /** Switches the UI language and, when signed in, saves it on the user's profile. */
  const changeLanguage = useCallback(async (next: Lang): Promise<ActionResult> => {
    useLocaleStore.getState().setLang(next);
    return useAuthStore.getState().syncLocale(next);
  }, []);

  return {
    t,
    tBilingual,
    tRole,
    tRoleDesc,
    tNav,
    lang,
    changeLanguage,
    currentUser,
    isAmharic: lang === 'am',
    isEnglish: lang === 'en',
  };
}

export interface TranslationApi<K extends string> {
  t: TFunction<K>;
  /** @deprecated Inline bilingual text — use `t('key')` with locales/en + locales/am. */
  tBilingual: (enOrEntry: BilingualInput, amFallback?: string) => string;
  tRole: (role?: Role | string | null) => string;
  tRoleDesc: (role?: Role | string | null) => string;
  tNav: (label?: string | null) => string;
  lang: Lang;
  changeLanguage: (next: Lang) => Promise<ActionResult>;
  currentUser: ReturnType<typeof useAuthStore.getState>['currentUser'];
  isAmharic: boolean;
  isEnglish: boolean;
}

export default useTranslation;
