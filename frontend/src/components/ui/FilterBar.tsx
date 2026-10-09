'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelect {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  onClear: () => void;
  hasActiveFilters: boolean;
  /**
   * Phones: search and the select(s) share one row, labels are visually hidden and
   * "Clear filters" shrinks to an icon. Only suits one select.
   */
  compact?: boolean;
}

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300 shadow-sm outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10';

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  selects = [],
  onClear,
  hasActiveFilters,
  compact = false,
}: FilterBarProps) {
  const labelClass = cn(
    'mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400',
    compact && 'sr-only sm:not-sr-only',
  );

  return (
    <div className="mb-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-soft ring-super-soft">
      <div
        className={cn(
          'flex gap-3',
          compact ? 'flex-row items-end gap-2 sm:gap-3' : 'flex-col lg:flex-row lg:items-end',
        )}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="list-search" className={labelClass}>
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="list-search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>
        {selects.map((select) => (
          <div key={select.id} className={cn(compact ? 'w-[8.5rem] shrink-0' : 'w-full', 'sm:w-44')}>
            <label htmlFor={select.id} className={labelClass}>
              {select.label}
            </label>
            <select
              id={select.id}
              value={select.value}
              onChange={(event) => select.onChange(event.target.value)}
              className={inputClass}
            >
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={onClear}
          disabled={!hasActiveFilters}
          aria-label="Clear filters"
          title="Clear filters"
          // Phones: only shown once there is something to clear, to leave the search room.
          className={cn(compact && 'shrink-0 px-3 sm:px-5', compact && !hasActiveFilters && 'hidden sm:inline-flex')}
        >
          <X className="h-4 w-4" />
          <span className={cn(compact && 'hidden sm:inline')}>Clear filters</span>
        </Button>
      </div>
    </div>
  );
}
