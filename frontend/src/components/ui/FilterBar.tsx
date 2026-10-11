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

/**
 * Underlined filter field: no box, just a bottom border that turns primary on focus.
 * Exported so hand-built filter rows can match the shared bar.
 */
export const filterInputClass =
  'h-10 w-full rounded-none border-0 border-b border-border bg-transparent px-1 text-sm text-foreground outline-none transition-colors placeholder:text-subtle-foreground hover:border-muted-foreground focus:border-primary [&>option]:bg-card [&>option]:text-foreground';

/** Search field variant: leaves room for a magnifier icon at `left-1`. */
export const filterSearchInputClass = `${filterInputClass} pl-7`;

export const filterSearchIconClass =
  'pointer-events-none absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground';

export const filterLabelClass = 'mb-1 block text-xs font-medium text-muted-foreground';

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
    filterLabelClass,
    compact && 'sr-only sm:not-sr-only',
  );

  return (
    <div className="mb-5">
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
            <Search className={filterSearchIconClass} />
            <input
              id="list-search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className={filterSearchInputClass}
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
              className={filterInputClass}
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
          variant="ghost"
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
