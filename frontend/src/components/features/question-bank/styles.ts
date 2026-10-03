import { cn } from '@/lib/utils';

export const inputClass =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10';
export const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-700';

// Shared surfaces, matching the FilterBar / card styling used across the dashboard.
export const cardClass =
  'rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-soft ring-super-soft';
export const sectionTitleClass = 'flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white';
export const filterLabelClass = 'mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400';
export const filterInputClass =
  'h-10 w-full rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300 shadow-sm outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10';
export const iconButtonClass =
  'rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200';
export const treeAddButtonClass =
  'shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30';

export const segmentClass = (active: boolean) =>
  cn(
    'h-full rounded-lg px-3 transition',
    active
      ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
  );

export const treeRowClass = (active: boolean) =>
  cn(
    'flex items-center gap-1 rounded-lg pr-1 text-xs transition',
    active
      ? 'bg-indigo-50 text-indigo-800 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:ring-indigo-800'
      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70',
  );

export const countPillClass = (active: boolean) =>
  cn(
    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold leading-none',
    active
      ? 'bg-indigo-600 text-white'
      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  );

export const codeChipClass = (active: boolean) =>
  cn(
    'shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold',
    active
      ? 'bg-indigo-600 text-white'
      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  );

export const answerChipClass = (correct: boolean) =>
  cn(
    'flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium',
    correct
      ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
      : 'border-slate-200/80 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400',
  );
