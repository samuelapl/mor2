'use client';

import { RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { ScopeFilter } from '../types';
import { cardClass, filterInputClass, filterLabelClass } from '../styles';

interface QuestionFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  filterScope: ScopeFilter;
  onFilterScopeChange: (value: ScopeFilter) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

/** Search, question type and scope filters for the question list. */
export function QuestionFilters({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterScope,
  onFilterScopeChange,
  onRefresh,
  refreshing,
}: QuestionFiltersProps) {
  return (
    <div className={cn(cardClass, 'p-4')}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="qb-question-search" className={filterLabelClass}>
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="qb-question-search"
              type="text"
              placeholder="Search questions or answer options…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn(filterInputClass, 'pl-9')}
            />
          </div>
        </div>
        <div className="w-full sm:w-48">
          <label htmlFor="qb-filter-type" className={filterLabelClass}>
            Question type
          </label>
          <select
            id="qb-filter-type"
            value={filterType}
            onChange={(e) => onFilterTypeChange(e.target.value)}
            className={filterInputClass}
          >
            <option value="ALL">All Question Types</option>
            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="SHORT_ANSWER">Short Answer</option>
          </select>
        </div>
        <div className="w-full sm:w-56">
          <label htmlFor="qb-filter-scope" className={filterLabelClass}>
            Scope
          </label>
          <select
            id="qb-filter-scope"
            value={filterScope}
            onChange={(e) => onFilterScopeChange(e.target.value as ScopeFilter)}
            className={filterInputClass}
          >
            <option value="ALL">All Scopes (Course & Reusable)</option>
            <option value="COURSE">Course-specific Only</option>
            <option value="GLOBAL">Reusable (Across Courses)</option>
          </select>
        </div>
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh Question Bank"
          aria-label="Refresh Question Bank"
          className="px-3"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </Button>
      </div>
    </div>
  );
}
