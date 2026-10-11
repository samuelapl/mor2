'use client';

import type { ReactNode } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { matchCommonEnglish } from '@/lib/i18n';
import type { Role } from '@/types';

interface PageShellProps {
  role?: Role;
  title: ReactNode;
  description?: ReactNode;
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

  /** Plain English strings that match a `common` entry are shown in the current language. */
  const renderText = (value?: ReactNode): ReactNode => {
    if (!value) return null;
    if (typeof value === 'string') return matchCommonEnglish(value, lang) ?? value;
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
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/70 px-3 py-1 shadow-xs backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                {tRole(role)}
              </p>
            </div>
          ) : null}
          <h1 className="mt-4 font-display text-2xl font-bold sm:text-[28px] leading-tight tracking-tight text-foreground">
            {renderText(title)}
          </h1>
          {description ? (
            <p
              className={`mt-2 text-sm leading-relaxed text-muted-foreground ${
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
