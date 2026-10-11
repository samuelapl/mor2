import { cn } from '@/lib/utils';

export const inputClass =
  'w-full rounded-xl border border-border/90 bg-card px-3.5 py-2.5 text-sm text-secondary-foreground shadow-xs outline-none transition placeholder:text-subtle-foreground focus:border-ring focus:ring-4 focus:ring-ring/10';
export const labelClass = 'mb-1.5 block text-xs font-semibold text-secondary-foreground';

// Shared surfaces, matching the FilterBar / card styling used across the dashboard.
export const cardClass =
  'rounded-2xl border border-border/80 bg-card shadow-soft ring-super-soft';
export const sectionTitleClass = 'flex items-center gap-2 text-sm font-semibold text-foreground';
// Filter fields reuse the shared FilterBar's underlined style.
export {
  filterInputClass,
  filterLabelClass,
  filterSearchIconClass,
  filterSearchInputClass,
} from '@/components/ui/FilterBar';
export const iconButtonClass =
  'rounded-lg p-1.5 text-subtle-foreground transition hover:bg-secondary hover:text-secondary-foreground';
export const treeAddButtonClass =
  'shrink-0 rounded-md p-1 text-subtle-foreground transition hover:bg-primary-soft hover:text-primary';

export const segmentClass = (active: boolean) =>
  cn(
    'h-full rounded-lg px-3 transition',
    active
      ? 'bg-card text-primary shadow-xs'
      : 'text-secondary-foreground hover:text-foreground',
  );

export const treeRowClass = (active: boolean) =>
  cn(
    'flex items-center gap-1 rounded-lg pr-1 text-xs transition',
    active
      ? 'bg-primary-soft text-primary ring-1 ring-inset ring-ring/20'
      : 'text-secondary-foreground hover:bg-muted',
  );

export const countPillClass = (active: boolean) =>
  cn(
    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold leading-none',
    active
      ? 'bg-indigo-600 text-white'
      : 'bg-secondary text-muted-foreground',
  );

export const codeChipClass = (active: boolean) =>
  cn(
    'shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold',
    active
      ? 'bg-indigo-600 text-white'
      : 'bg-secondary text-secondary-foreground',
  );

export const answerChipClass = (correct: boolean) =>
  cn(
    'flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium',
    correct
      ? 'border-success/30 bg-success-soft font-semibold text-success'
      : 'border-border/80 bg-muted text-secondary-foreground',
  );
