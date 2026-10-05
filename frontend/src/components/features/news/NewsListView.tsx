'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { fetchNewsList } from '@/lib/api/news';
import type { ApiMeta, ApiNewsCard, NewsCategory } from '@/lib/api/types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { NEWS_CATEGORIES, NEWS_CATEGORY_LABELS } from '@/lib/news';
import { cn } from '@/lib/utils';
import { NewsCard } from './NewsCard';

const PAGE_SIZE = 6;
const MAX_FEATURED = 3;
const SITE_HEADER_HEIGHT = 64; // PublicHeader's sticky bar (h-16)

/**
 * Client part of /news. The title, category tabs and search stay pinned under the site
 * header (tablet and up) while the posts scroll. Featured posts lead page 1 in their own
 * section; the paginated grid below holds the rest, 6 per page. Filtering or searching
 * covers every post, featured included, so nothing becomes unfindable.
 */
export function NewsListView() {
  const { tBilingual } = useTranslation();
  const [category, setCategory] = useState<NewsCategory | undefined>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [featured, setFeatured] = useState<ApiNewsCard[]>([]);
  const [items, setItems] = useState<ApiNewsCard[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const listTop = useRef<HTMLDivElement>(null);
  const pinnedBar = useRef<HTMLDivElement>(null);
  const scrollAfterLoad = useRef(false);

  const filtering = Boolean(category || search);

  // Debounce typing so each keystroke does not hit the API.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    fetchNewsList({ featured: true, limit: MAX_FEATURED })
      .then((res) => setFeatured(res.data))
      .catch(() => setFeatured([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetchNewsList({
      page,
      limit: PAGE_SIZE,
      category,
      search: search || undefined,
      featured: filtering ? undefined : false,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setMeta(res.meta);
      })
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, category, search, filtering]);

  const chooseCategory = (next: NewsCategory | undefined) => {
    setCategory(next);
    setPage(1);
  };

  // Scroll once the new page has rendered: page 1's featured section disappears on page 2,
  // so a position measured before the load would land too far down.
  useEffect(() => {
    if (loading || !scrollAfterLoad.current) return;
    scrollAfterLoad.current = false;
    // Land at the top of the posts, just below whatever is pinned (header + filter bar).
    const bar = pinnedBar.current;
    const pinned = bar && getComputedStyle(bar).position === 'sticky';
    const offset = (pinned ? SITE_HEADER_HEIGHT + bar.offsetHeight : 0) + 16;
    const top = listTop.current?.getBoundingClientRect().top ?? 0;
    window.scrollTo({ top: Math.max(0, window.scrollY + top - offset), behavior: 'smooth' });
  }, [loading]);

  const changePage = (next: number) => {
    scrollAfterLoad.current = true;
    setPage(next);
  };

  const showFeatured = !filtering && page === 1 && featured.length > 0;
  const [lead, ...otherFeatured] = featured;

  const tabClass = (active: boolean) =>
    cn(
      'whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition',
      active
        ? 'bg-sky-600 text-white shadow-sm'
        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-sky-700 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700',
    );

  return (
    <div>
      {/* Pinned below the 64px site header from tablet width up; on phones it would eat the screen. */}
      <div
        ref={pinnedBar}
        className="z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 md:sticky md:top-16"
      >
        <div className="mx-auto max-w-7xl px-4 pb-5 pt-8 sm:px-6 lg:px-8 lg:pt-10">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
            {tBilingual('Ministry of Revenues', 'የገቢዎች ሚኒስቴር')}
          </span>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {tBilingual('News & Announcements', 'ዜናዎች እና ማስታወቂያዎች')}
          </h1>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
              <button type="button" onClick={() => chooseCategory(undefined)} className={tabClass(!category)}>
                {tBilingual('All', 'ሁሉም')}
              </button>
              {NEWS_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => chooseCategory(c)}
                  className={tabClass(category === c)}
                >
                  {tBilingual(NEWS_CATEGORY_LABELS[c])}
                </button>
              ))}
            </div>
            <label className="relative block w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={tBilingual('Search headlines…', 'ርዕሶችን ይፈልጉ…')}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {showFeatured && (
          <section className="mb-12" aria-label={tBilingual('Featured news', 'ተለይተው የቀረቡ ዜናዎች')}>
            <NewsCard news={lead} variant="hero" />
            {/* A single extra featured post goes full width; two sit side by side. */}
            {otherFeatured.length === 1 && (
              <div className="mt-6">
                <NewsCard news={otherFeatured[0]} variant="hero" />
              </div>
            )}
            {otherFeatured.length > 1 && (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {otherFeatured.map((n) => (
                  <NewsCard key={n.id} news={n} />
                ))}
              </div>
            )}
          </section>
        )}

        <div ref={listTop}>
          {showFeatured && (
            <h2 className="mb-5 font-display text-lg font-bold text-slate-900 dark:text-white">
              {tBilingual('Latest news', 'የቅርብ ጊዜ ዜናዎች')}
            </h2>
          )}

          {loading ? (
            <CardSkeleton count={PAGE_SIZE} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" />
          ) : failed ? (
            <EmptyState
              title={tBilingual('Could not load news', 'ዜናዎችን መጫን አልተቻለም')}
              description={tBilingual('Please try again in a moment.', 'እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።')}
            />
          ) : items.length === 0 ? (
            // Featured posts alone are already on screen; only say "nothing" when there truly is nothing.
            showFeatured ? null : (
              <EmptyState
                title={tBilingual('No news found', 'ምንም ዜና አልተገኘም')}
                description={
                  filtering
                    ? tBilingual('Try another search or category.', 'ሌላ ፍለጋ ወይም ምድብ ይሞክሩ።')
                    : tBilingual('Check back soon for announcements.', 'ለማስታወቂያዎች በቅርቡ ይመለሱ።')
                }
              />
            )
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((n) => (
                <NewsCard key={n.id} news={n} />
              ))}
            </div>
          )}

          {meta && !loading && !failed && (
            <Pagination
              className="mt-10"
              page={meta.page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              pageSize={meta.limit}
              onPageChange={changePage}
              hideOnSinglePage
            />
          )}
        </div>
      </div>
    </div>
  );
}
