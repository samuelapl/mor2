'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Eye, MessageCircle, Plus, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Table, TableRow, Td } from '@/components/ui/Table';
import { NewsCategoryBadge, NewsStatusBadge } from '@/components/features/news/NewsBadges';
import { NewsCover } from '@/components/features/news/NewsCover';
import { adminListNews } from '@/lib/api/news';
import type { ApiAdminNews, ApiMeta, NewsCategory, NewsStatus } from '@/lib/api/types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { usePermissions } from '@/lib/usePermissions';
import {
  NEWS_CATEGORIES,
  NEWS_CATEGORY_LABELS,
  NEWS_PERMISSIONS,
  NEWS_STATUS_LABELS,
  formatNewsDate,
  newsPath,
  newsTextLang,
} from '@/lib/news';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const PAGE_SIZE = 15;
const STATUS_TABS: (NewsStatus | 'ALL')[] = [
  'ALL',
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
];

export default function NewsManagementPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const { tBilingual, lang } = useTranslation();
  const canManage = can(NEWS_PERMISSIONS.manage);
  const canPublish = can(NEWS_PERMISSIONS.publish);

  const [status, setStatus] = useState<NewsStatus | 'ALL'>('ALL');
  const [category, setCategory] = useState<NewsCategory | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ApiAdminNews[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, pending] = await Promise.all([
        adminListNews({
          page,
          limit: PAGE_SIZE,
          status: status === 'ALL' ? undefined : status,
          category: category || undefined,
          search: search || undefined,
        }),
        adminListNews({ status: 'PENDING_REVIEW', limit: 1 }),
      ]);
      setItems(list.data);
      setMeta(list.meta);
      setPendingCount(pending.meta.total);
    } catch {
      setItems([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [page, status, category, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const chooseStatus = (next: NewsStatus | 'ALL') => {
    setStatus(next);
    setPage(1);
  };

  return (
    <PageShell
      title={{ en: 'News Management', am: 'የዜና አስተዳደር' }}
      description={{
        en: 'Write Ministry news, send it for review and publish it to the public site.',
        am: 'የሚኒስቴሩን ዜናዎች ይጻፉ፣ ለግምገማ ይላኩ እና በህዝብ ገጽ ላይ ያትሙ።',
      }}
      actions={
        canManage ? (
          <Link href="/news-management/new">
            <Button icon={<Plus className="h-4 w-4" />}>{tBilingual('New news', 'አዲስ ዜና')}</Button>
          </Link>
        ) : null
      }
    >
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((s) => {
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => chooseStatus(s)}
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-indigo-700 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700',
              )}
            >
              {s === 'ALL' ? tBilingual('All', 'ሁሉም') : tBilingual(NEWS_STATUS_LABELS[s])}
              {s === 'PENDING_REVIEW' && pendingCount > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px] tabular-nums',
                    active ? 'bg-white/25' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
                  )}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <FilterBar
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={tBilingual('Search headlines…', 'ርዕሶችን ይፈልጉ…')}
        selects={[
          {
            id: 'category',
            label: tBilingual('Category', 'ምድብ'),
            value: category,
            onChange: (v) => {
              setCategory(v as NewsCategory | '');
              setPage(1);
            },
            options: [
              { value: '', label: tBilingual('All categories', 'ሁሉም ምድቦች') },
              ...NEWS_CATEGORIES.map((c) => ({ value: c, label: tBilingual(NEWS_CATEGORY_LABELS[c]) })),
            ],
          },
        ]}
        onClear={() => {
          setSearchInput('');
          setCategory('');
          setPage(1);
        }}
        hasActiveFilters={Boolean(searchInput || category)}
      />

      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title={tBilingual('No news here', 'እዚህ ምንም ዜና የለም')}
          description={
            status === 'PENDING_REVIEW' && canPublish
              ? tBilingual('Nothing is waiting for review.', 'ግምገማ የሚጠብቅ ምንም የለም።')
              : canManage
                ? tBilingual('Create a news post to get started.', 'ለመጀመር የዜና ጽሑፍ ይፍጠሩ።')
                : undefined
          }
        />
      ) : (
        <>
          <Table
            columns={[
              { name: 'headline', label: tBilingual('News', 'ዜና') },
              { name: 'status', label: tBilingual('Status', 'ሁኔታ') },
              { name: 'author', label: tBilingual('Author', 'ጸሐፊ') },
              { name: 'updated', label: tBilingual('Updated', 'የተሻሻለው') },
              {
                name: 'engagement',
                label: tBilingual('Engagement', 'ተሳትፎ'),
                className: 'hidden lg:table-cell',
              },
              { name: 'actions', label: '' },
            ]}
          >
            {items.map((n) => (
              <TableRow
                key={n.id}
                className="cursor-pointer"
                onClick={() => router.push(`/news-management/${n.id}`)}
              >
                <Td>
                  <div className="flex min-w-[260px] items-center gap-3">
                    <NewsCover src={n.coverImageUrl} alt="" className="h-12 w-16 shrink-0 rounded-lg" />
                    <div className="min-w-0">
                      <p
                        lang={newsTextLang(n.headline)}
                        className="line-clamp-2 font-semibold text-slate-900 dark:text-white"
                      >
                        {n.isFeatured && (
                          <Star className="mr-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        )}
                        {n.headline}
                      </p>
                      <NewsCategoryBadge category={n.category} className="mt-1" />
                    </div>
                  </div>
                </Td>
                <Td>
                  <NewsStatusBadge status={n.status} />
                </Td>
                <Td className="whitespace-nowrap text-xs">
                  {n.createdBy.firstName} {n.createdBy.lastName}
                </Td>
                <Td className="whitespace-nowrap text-xs">{formatNewsDate(n.updatedAt, lang)}</Td>
                <Td className="hidden whitespace-nowrap text-xs tabular-nums lg:table-cell">
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                    <EngagementStat icon={ThumbsUp} value={n.likeCount} label={tBilingual('Likes', 'ወደድኩት')} />
                    <EngagementStat icon={ThumbsDown} value={n.dislikeCount} label={tBilingual('Dislikes', 'አልወደድኩትም')} />
                    <EngagementStat icon={MessageCircle} value={n.commentCount} label={tBilingual('Comments', 'አስተያየቶች')} />
                    <EngagementStat icon={Eye} value={n.viewCount} label={tBilingual('Views', 'እይታዎች')} />
                  </div>
                </Td>
                <Td className="text-right">
                  {n.status === 'PUBLISHED' && (
                    <Link
                      href={newsPath(n.slug)}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      aria-label={tBilingual('View public page', 'የህዝብ ገጹን ይመልከቱ')}
                      title={tBilingual('View public page', 'የህዝብ ገጹን ይመልከቱ')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                </Td>
              </TableRow>
            ))}
          </Table>
          {meta && (
            <Pagination
              className="mt-6"
              page={meta.page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              pageSize={meta.limit}
              onPageChange={setPage}
              hideOnSinglePage
            />
          )}
        </>
      )}
    </PageShell>
  );
}

function EngagementStat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{label}:</span>
      {value}
    </span>
  );
}
