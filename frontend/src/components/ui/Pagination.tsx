'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface PaginationProps {
  /** 1-based current page */
  page: number;
  /** Total number of pages available */
  totalPages: number;
  /** Callback invoked when page changes */
  onPageChange: (page: number) => void;
  /** Total count of items across all pages */
  totalItems?: number;
  /** Items per page */
  pageSize?: number;
  /** Callback when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
  /** Page size options for selector */
  pageSizeOptions?: number[];
  /** Whether to show total count and range text */
  showTotal?: boolean;
  /** Whether to show numbered pill buttons */
  showPageNumbers?: boolean;
  /** Whether to show first and last fast-jump buttons */
  showFirstLast?: boolean;
  /** Optional container class name */
  className?: string;
  /** Force compact mode */
  compact?: boolean;
  /** Whether to hide when totalPages <= 1 */
  hideOnSinglePage?: boolean;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  showTotal = true,
  showPageNumbers = true,
  showFirstLast = true,
  className,
  compact = false,
  hideOnSinglePage = false,
}: PaginationProps) {
  const { t, tRich } = useTranslation('common');

  // Hide pagination only when there are no items, no pages, or hideOnSinglePage is explicitly requested
  if (totalItems !== undefined && totalItems === 0) {
    return null;
  }
  if (totalPages <= 0) {
    return null;
  }
  if (hideOnSinglePage && totalPages <= 1) {
    return null;
  }
  if (totalPages <= 1 && totalItems === undefined && !onPageSizeChange) {
    return null;
  }

  const safePage = Math.max(1, Math.min(page, Math.max(1, totalPages)));

  // Ensure current pageSize is present in the selector dropdown options
  const resolvedPageSizeOptions = useMemo(() => {
    if (!pageSize) return pageSizeOptions;
    if (pageSizeOptions.includes(pageSize)) return pageSizeOptions;
    return [...pageSizeOptions, pageSize].sort((a, b) => a - b);
  }, [pageSize, pageSizeOptions]);

  // Generate the page numbers list with smart ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis-left' | 'ellipsis-right')[] = [];

    if (safePage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('ellipsis-right');
      pages.push(totalPages);
    } else if (safePage >= totalPages - 3) {
      pages.push(1);
      pages.push('ellipsis-left');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('ellipsis-left');
      pages.push(safePage - 1);
      pages.push(safePage);
      pages.push(safePage + 1);
      pages.push('ellipsis-right');
      pages.push(totalPages);
    }

    return pages;
  }, [safePage, totalPages]);

  // Item range text calculations
  const rangeStart = pageSize ? (safePage - 1) * pageSize + 1 : 1;
  const rangeEnd = pageSize
    ? totalItems
      ? Math.min(safePage * pageSize, totalItems)
      : safePage * pageSize
    : null;

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={cn(
        'mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 py-3 shadow-2xs backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {/* Information text & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
        {showTotal && (
          <div className="flex items-center gap-1 font-medium">
            {totalItems !== undefined && rangeEnd !== null ? (
              <span>
                {tRich('pagination.showingRange', {
                  range: (
                    <strong className="font-semibold text-slate-800 dark:text-slate-200">
                      {rangeStart} - {rangeEnd}
                    </strong>
                  ),
                  total: <strong className="font-semibold text-slate-800 dark:text-slate-200">{totalItems}</strong>,
                })}
              </span>
            ) : (
              <span>
                {tRich('pagination.pageOf', {
                  page: <strong className="font-semibold text-slate-800 dark:text-slate-200">{safePage}</strong>,
                  pages: <strong className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</strong>,
                })}
              </span>
            )}
          </div>
        )}

        {/* Page Size Selector */}
        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-1.5 border-l border-slate-200/90 dark:border-slate-800 pl-3">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {t('pagination.perPage')}
            </span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label={t('pagination.itemsPerPage')}
              className="h-7 cursor-pointer rounded-lg border border-slate-200/90 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-2 py-0 text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 outline-none transition hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/10"
            >
              {resolvedPageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-1 sm:justify-end">
        {/* Fast jump to First Page */}
        {showFirstLast && totalPages > 2 && !compact && (
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(1)}
            title={t('pagination.firstPage')}
            aria-label={t('pagination.firstPage')}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 dark:text-slate-200 active:scale-95 disabled:pointer-events-none disabled:opacity-40',
              safePage <= 1 ? 'hidden sm:flex' : '',
            )}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Previous Page Button */}
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label={t('pagination.previousPage')}
          className="flex h-8 items-center gap-1 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-2xs transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden xs:inline sm:inline">{t('previous')}</span>
        </button>

        {/* Page Numbers Pill List (Hidden on compact / very small screens) */}
        {showPageNumbers && !compact && (
          <div className="hidden items-center gap-1 sm:flex">
            {pageNumbers.map((item, idx) => {
              if (item === 'ellipsis-left') {
                return (
                  <button
                    key={`ellipsis-left-${idx}`}
                    type="button"
                    onClick={() => onPageChange(Math.max(1, safePage - 3))}
                    title={t('pagination.jumpBack3Pages')}
                    aria-label="Previous pages ellipsis"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-300 transition"
                  >
                    •••
                  </button>
                );
              }

              if (item === 'ellipsis-right') {
                return (
                  <button
                    key={`ellipsis-right-${idx}`}
                    type="button"
                    onClick={() => onPageChange(Math.min(totalPages, safePage + 3))}
                    title={t('pagination.jumpForward3Pages')}
                    aria-label="Next pages ellipsis"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-300 transition"
                  >
                    •••
                  </button>
                );
              }

              const isCurrent = item === safePage;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-current={isCurrent ? 'page' : undefined}
                  aria-label={`${t('page')} ${item}`}
                  className={cn(
                    'flex h-8 min-w-8 items-center justify-center rounded-xl px-2.5 text-xs font-semibold transition-all duration-150 active:scale-95',
                    isCurrent
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs shadow-indigo-500/25 ring-2 ring-indigo-500/20'
                      : 'border border-transparent text-slate-600 dark:text-slate-300 hover:border-slate-200/80 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  {item}
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile-only page counter display */}
        <div className="flex items-center px-2 text-xs font-semibold text-slate-700 sm:hidden">
          {safePage} / {totalPages}
        </div>

        {/* Next Page Button */}
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label={t('pagination.nextPage')}
          className="flex h-8 items-center gap-1 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-2xs transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          <span className="hidden xs:inline sm:inline">{t('next')}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {/* Fast jump to Last Page */}
        {showFirstLast && totalPages > 2 && !compact && (
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            title={t('pagination.lastPage')}
            aria-label={t('pagination.lastPage')}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 dark:text-slate-200 active:scale-95 disabled:pointer-events-none disabled:opacity-40',
              safePage >= totalPages ? 'hidden sm:flex' : '',
            )}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </nav>
  );
}

export default Pagination;
