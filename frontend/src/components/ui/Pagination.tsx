'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useLms } from '@/lib/lms-store';
import { cn } from '@/lib/utils';

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
  const { lang } = useLms();
  const isAmharic = lang === 'am';

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
        'mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-2xs backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {/* Information text & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {showTotal && (
          <div className="flex items-center gap-1 font-medium">
            {totalItems !== undefined && rangeEnd !== null ? (
              isAmharic ? (
                <span>
                  ከ <strong className="font-semibold text-slate-800">{totalItems}</strong> ውስጥ{' '}
                  <strong className="font-semibold text-slate-800">
                    {rangeStart} - {rangeEnd}
                  </strong>{' '}
                  በማሳየት ላይ
                </span>
              ) : (
                <span>
                  Showing{' '}
                  <strong className="font-semibold text-slate-800">
                    {rangeStart} - {rangeEnd}
                  </strong>{' '}
                  of <strong className="font-semibold text-slate-800">{totalItems}</strong> results
                </span>
              )
            ) : (
              <span>
                {isAmharic ? (
                  <>
                    ገጽ <strong className="font-semibold text-slate-800">{safePage}</strong> ከ{' '}
                    <strong className="font-semibold text-slate-800">{totalPages}</strong>
                  </>
                ) : (
                  <>
                    Page <strong className="font-semibold text-slate-800">{safePage}</strong> of{' '}
                    <strong className="font-semibold text-slate-800">{totalPages}</strong>
                  </>
                )}
              </span>
            )}
          </div>
        )}

        {/* Page Size Selector */}
        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-1.5 border-l border-slate-200/90 pl-3">
            <span className="text-[11px] text-slate-400">
              {isAmharic ? 'በአንድ ገጽ:' : 'Per page:'}
            </span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label={isAmharic ? 'በአንድ ገጽ የሚታዩ ንጥሎች' : 'Items per page'}
              className="h-7 cursor-pointer rounded-lg border border-slate-200/90 bg-slate-50/70 px-2 py-0 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
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
            title={isAmharic ? 'ወደ መጀመሪያው ገጽ' : 'First page'}
            aria-label={isAmharic ? 'ወደ መጀመሪያው ገጽ' : 'First page'}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-800 active:scale-95 disabled:pointer-events-none disabled:opacity-40',
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
          aria-label={isAmharic ? 'ቀዳሚ ገጽ' : 'Previous page'}
          className="flex h-8 items-center gap-1 rounded-xl border border-slate-200/80 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden xs:inline sm:inline">{isAmharic ? 'ቀዳሚ' : 'Previous'}</span>
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
                    title={isAmharic ? '3 ገጾች ወደ ኋላ ዝለል' : 'Jump back 3 pages'}
                    aria-label="Previous pages ellipsis"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
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
                    title={isAmharic ? '3 ገጾች ወደ ፊት ዝለል' : 'Jump forward 3 pages'}
                    aria-label="Next pages ellipsis"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
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
                  aria-label={`${isAmharic ? 'ገጽ' : 'Page'} ${item}`}
                  className={cn(
                    'flex h-8 min-w-8 items-center justify-center rounded-xl px-2.5 text-xs font-semibold transition-all duration-150 active:scale-95',
                    isCurrent
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs shadow-indigo-500/25 ring-2 ring-indigo-500/20'
                      : 'border border-transparent text-slate-600 hover:border-slate-200/80 hover:bg-slate-100 hover:text-slate-900',
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
          aria-label={isAmharic ? 'ቀጣይ ገጽ' : 'Next page'}
          className="flex h-8 items-center gap-1 rounded-xl border border-slate-200/80 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          <span className="hidden xs:inline sm:inline">{isAmharic ? 'ቀጣይ' : 'Next'}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {/* Fast jump to Last Page */}
        {showFirstLast && totalPages > 2 && !compact && (
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            title={isAmharic ? 'ወደ መጨረሻው ገጽ' : 'Last page'}
            aria-label={isAmharic ? 'ወደ መጨረሻው ገጽ' : 'Last page'}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-800 active:scale-95 disabled:pointer-events-none disabled:opacity-40',
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
