'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { fetchNewsBySlug, fetchNewsList, recordNewsView } from '@/lib/api/news';
import type { ApiNewsCard, ApiNewsDetail } from '@/lib/api/types';
import { useLms } from '@/lib/lms-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { NewsArticleView } from './NewsArticleView';
import { NewsCard } from './NewsCard';
import { NewsComments } from './NewsComments';
import { NewsReactions } from './NewsReactions';
import { NewsShare } from './NewsShare';

/** Counts one view per post per browser session; storage can be unavailable, so it is best-effort. */
function useRecordView(newsId: string) {
  useEffect(() => {
    const key = `news-viewed:${newsId}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    } catch {
      // private mode / blocked storage — still count the view
    }
    void recordNewsView(newsId).catch(() => undefined);
  }, [newsId]);
}

/** Client part of /news/[slug]. `initial` comes from the server render (anonymous). */
export function NewsDetailView({ initial }: { initial: ApiNewsDetail }) {
  const { ready, currentUser } = useLms();
  const { tBilingual } = useTranslation();
  const [news, setNews] = useState(initial);
  const [more, setMore] = useState<ApiNewsCard[]>([]);

  useRecordView(initial.id);

  // The server render is anonymous; refetch with the session to get the reader's own reaction.
  useEffect(() => {
    if (!ready || !currentUser) return;
    fetchNewsBySlug(initial.slug)
      .then(setNews)
      .catch(() => undefined);
  }, [ready, currentUser, initial.slug]);

  useEffect(() => {
    fetchNewsList({ limit: 4 })
      .then((res) => setMore(res.data.filter((n) => n.id !== initial.id).slice(0, 3)))
      .catch(() => undefined);
  }, [initial.id]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <Link
        href="/news"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-400"
      >
        <ArrowLeft className="h-4 w-4" />
        {tBilingual('All news', 'ሁሉም ዜናዎች')}
      </Link>

      <NewsArticleView news={news} />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 dark:border-slate-800">
        <NewsReactions newsId={news.id} likeCount={news.likeCount} myReaction={news.myReaction} />
        <NewsShare newsId={news.id} slug={news.slug} headline={news.headline} />
      </div>

      <NewsComments newsId={news.id} allowComments={news.allowComments} />

      {more.length > 0 && (
        <section className="mt-14 border-t border-slate-200 pt-8 dark:border-slate-800">
          <h2 className="mb-5 font-display text-lg font-bold text-slate-900 dark:text-white">
            {tBilingual('More news', 'ተጨማሪ ዜናዎች')}
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {more.map((n) => (
              <NewsCard key={n.id} news={n} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
