'use client';

import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface StageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

/** Title block at the top of each studio stage. */
export function StageHeader({ eyebrow, title, description, actions, onBack, backLabel = 'Back' }: StageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-indigo-700 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </button>
        )}
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
        <h2 className="mt-1 truncate font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
        {description && <div className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
