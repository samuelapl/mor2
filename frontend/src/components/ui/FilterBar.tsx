"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
}

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  selects = [],
  onClear,
  hasActiveFilters,
}: FilterBarProps) {
  return (
    <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft ring-super-soft">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="list-search" className="mb-1.5 block text-xs font-semibold text-slate-600">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
          <div key={select.id} className="w-full sm:w-44">
            <label htmlFor={select.id} className="mb-1.5 block text-xs font-semibold text-slate-600">
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
        <Button type="button" variant="outline" onClick={onClear} disabled={!hasActiveFilters}>
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      </div>
    </div>
  );
}
