'use client';

import type { ReactNode } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { COMMON_TRANSLATIONS } from '@/lib/i18n/translations';
import type { Role } from '@/types';

export interface BilingualText {
  en: string;
  am: string;
}

interface PageShellProps {
  role?: Role;
  title: string | BilingualText | ReactNode;
  description?: string | BilingualText | ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  showLanguageToggle?: boolean;
  centered?: boolean;
}

export default function PageShell({
  role,
  title,
  description,
  actions,
  children,
  centered = false,
}: PageShellProps) {
  const { lang, tRole } = useTranslation();
  const isAmharic = lang === 'am';

  const renderText = (value?: string | BilingualText | ReactNode): ReactNode => {
    if (!value) return null;
    if (typeof value === 'object' && value !== null && 'en' in value && 'am' in value) {
      const b = value as BilingualText;
      return isAmharic ? b.am : b.en;
    }
    if (typeof value === 'string') {
      // Check if known common translation key or English text matches
      for (const entry of Object.values(COMMON_TRANSLATIONS)) {
        if (entry.en.toLowerCase() === value.toLowerCase()) {
          return isAmharic ? entry.am : entry.en;
        }
      }
      return value;
    }
    return value;
  };

  return (
    <div className="w-full animate-fade-in px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div
        className={`mb-8 flex flex-wrap items-start gap-4 ${
          centered ? 'flex-col items-center text-center' : 'justify-between'
        }`}
      >
        <div>
          {role ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 dark:border-indigo-800/60 bg-white/70 dark:bg-slate-900/70 px-3 py-1 shadow-xs backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {tRole(role)}
              </p>
            </div>
          ) : null}
          <h1 className="mt-4 font-display text-2xl font-bold sm:text-[28px] leading-tight tracking-tight text-slate-900 dark:text-white">
            {renderText(title)}
          </h1>
          {description ? (
            <p
              className={`mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400 ${
                centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'
              }`}
            >
              {renderText(description)}
            </p>
          ) : null}
        </div>
        {actions ? <div className="pt-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
