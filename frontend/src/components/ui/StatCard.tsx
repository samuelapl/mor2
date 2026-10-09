import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  iconClassName?: string;
}

export function StatCard({ icon: Icon, label, value, hint, iconClassName }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-soft ring-super-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400/10 via-violet-400/10 to-transparent opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
      {/* Narrow cards (2 per row on phones): icon above the text. Side by side from `sm`. */}
      <div className="relative flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:text-[11px]">
            {label}
          </p>
          <p className="mt-1.5 font-display text-xl font-bold sm:mt-2 sm:text-2xl tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p> : null}
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/5 transition-transform duration-200 group-hover:scale-110',
            iconClassName,
          )}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}
