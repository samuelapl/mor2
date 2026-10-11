'use client';

import type { ReactNode } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { matchCommonEnglish } from '@/lib/i18n';

interface PageSectionProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  centered?: boolean;
}

export default function PageSection({
  title,
  description,
  action,
  children,
  className = 'mb-8',
  centered = false,
}: PageSectionProps) {
  const { lang } = useTranslation();

  /** Plain English strings that match a `common` entry are shown in the current language. */
  const renderText = (value?: ReactNode): ReactNode => {
    if (!value) return null;
    if (typeof value === 'string') return matchCommonEnglish(value, lang) ?? value;
    return value;
  };

  return (
    <section className={className}>
      <div
        className={`mb-4 flex items-start gap-4 ${
          centered ? 'flex-col items-center text-center' : 'justify-between'
        }`}
      >
        <div>
          <h2 className="font-display text-base font-bold tracking-tight text-slate-900">
            {renderText(title)}
          </h2>
          {description ? (
            <p className="mt-1 text-xs text-slate-500">{renderText(description)}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
