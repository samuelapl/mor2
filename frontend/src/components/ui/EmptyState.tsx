import type { ReactNode } from 'react';
import { Construction } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  children?: ReactNode;
}

export function EmptyState({
  title = 'Nothing here yet',
  description = 'Content will appear here once records are added.',
  children,
}: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-indigo-200/60 bg-white/60 px-6 py-16 text-center backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/60">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-40 dark:opacity-20" />
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-500 shadow-2xs ring-1 ring-indigo-200/60 dark:from-indigo-950 dark:to-violet-950 dark:text-indigo-400 dark:ring-indigo-900/40">
        <Construction className="h-7 w-7" />
      </div>
      <h2 className="relative mt-4 font-display text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
      <p className="relative mt-1 max-w-sm text-xs leading-relaxed text-slate-400 dark:text-slate-500">{description}</p>
      {children ? <div className="relative mt-4">{children}</div> : null}
    </div>
  );
}
