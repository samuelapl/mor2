import type { Lang } from '@/types';
import { useLocaleStore } from '@/lib/stores/locale-store';

import enAdmin from './locales/en/admin.json';
import enAuth from './locales/en/auth.json';
import enCertificates from './locales/en/certificates.json';
import enClassroom from './locales/en/classroom.json';
import enCommon from './locales/en/common.json';
import enCourses from './locales/en/courses.json';
import enDashboard from './locales/en/dashboard.json';
import enLanding from './locales/en/landing.json';
import enLaws from './locales/en/laws.json';
import enNav from './locales/en/nav.json';
import enNews from './locales/en/news.json';
import enQuiz from './locales/en/quiz.json';
import enRoles from './locales/en/roles.json';
import enSessions from './locales/en/sessions.json';
import enUsers from './locales/en/users.json';

import amAdmin from './locales/am/admin.json';
import amAuth from './locales/am/auth.json';
import amCertificates from './locales/am/certificates.json';
import amClassroom from './locales/am/classroom.json';
import amCommon from './locales/am/common.json';
import amCourses from './locales/am/courses.json';
import amDashboard from './locales/am/dashboard.json';
import amLanding from './locales/am/landing.json';
import amLaws from './locales/am/laws.json';
import amNav from './locales/am/nav.json';
import amNews from './locales/am/news.json';
import amQuiz from './locales/am/quiz.json';
import amRoles from './locales/am/roles.json';
import amSessions from './locales/am/sessions.json';
import amUsers from './locales/am/users.json';

/** English is the reference catalog: its shape defines the valid keys. */
const en = {
  common: enCommon,
  nav: enNav,
  roles: enRoles,
  auth: enAuth,
  dashboard: enDashboard,
  courses: enCourses,
  sessions: enSessions,
  classroom: enClassroom,
  certificates: enCertificates,
  users: enUsers,
  admin: enAdmin,
  news: enNews,
  laws: enLaws,
  quiz: enQuiz,
  landing: enLanding,
};

export type Catalog = typeof en;
export type Namespace = keyof Catalog;

/** `am` must have every key `en` has (a missing key is a type error here). */
const am: Catalog = {
  common: amCommon,
  nav: amNav,
  roles: amRoles,
  auth: amAuth,
  dashboard: amDashboard,
  courses: amCourses,
  sessions: amSessions,
  classroom: amClassroom,
  certificates: amCertificates,
  users: amUsers,
  admin: amAdmin,
  news: amNews,
  laws: amLaws,
  quiz: amQuiz,
  landing: amLanding,
};

export const catalogs: Record<Lang, Catalog> = { en, am };

/** Dotted paths to every string in `T`, e.g. 'schedule.title'. */
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends Record<string, unknown>
      ? Leaves<T[K], `${P}${K}.`>
      : never;
}[keyof T & string];

/** Keys per namespace, computed once (keeps the generic `NamespaceKey<N>` cheap for the compiler). */
type KeysByNamespace = { [N in Namespace]: Leaves<Catalog[N]> };

/** A key inside one namespace, e.g. NamespaceKey<'sessions'> = 'schedule.title' | … */
export type NamespaceKey<N extends Namespace> = KeysByNamespace[N];
/** A full key such as 'sessions.schedule.title'. */
export type TranslationKey = { [N in Namespace]: `${N}.${KeysByNamespace[N]}` }[Namespace];

export type TranslationVars = Record<string, string | number>;

function lookup(lang: Lang, key: string): string | undefined {
  let node: unknown = catalogs[lang];
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** The text for `key` in `lang` only (no fallback), or undefined. */
export function lookupIn(lang: Lang, key: string): string | undefined {
  return lookup(lang, key);
}

/** Replaces `{name}` placeholders with values from `vars`; unknown placeholders are left as is. */
export function format(template: string, vars?: TranslationVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * Translates a full key in `lang`. Falls back to English, then to the key itself,
 * so a missing translation never renders blank.
 */
export function translateIn(lang: Lang, key: string, vars?: TranslationVars): string {
  const text = lookup(lang, key) ?? (lang === 'en' ? undefined : lookup('en', key));
  if (text === undefined) {
    if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  return format(text, vars);
}

/**
 * Translates a full key in the current UI language. For code outside React components
 * (stores, utilities, toasts fired from stores) — components use `useTranslation()`.
 */
export function translate(key: TranslationKey, vars?: TranslationVars): string {
  return translateIn(useLocaleStore.getState().lang, key, vars);
}
