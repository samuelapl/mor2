'use client';

import Link from 'next/link';
import { MessageCircle, Star, ThumbsUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatNewsDate, newsPath, newsTextLang } from '@/lib/news';
import type { ApiNewsCard } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { NewsCategoryBadge } from './NewsBadges';
import { NewsCover } from './NewsCover';

interface NewsCardProps {
  news: ApiNewsCard;
  /** hero: wide two-column lead story; compact: small row for dashboards. */
  variant?: 'default' | 'hero' | 'compact';
}

export function NewsCard({ news, variant = 'default' }: NewsCardProps) {
  const { lang, tBilingual } = useTranslation();
  const textLang = newsTextLang(news.headline, news.summary);
  const date = formatNewsDate(news.eventDate ?? news.publishedAt, lang);

  if (variant === 'compact') {
    return (
      <Link
        href={newsPath(news.slug)}
        className="group flex gap-3 rounded-xl p-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        <NewsCover
          src={news.coverImageUrl}
          alt={news.headline}
          className="h-16 w-24 shrink-0 rounded-lg"
        />
        <div className="min-w-0">
          <p
            lang={textLang}
            className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400"
          >
            {news.headline}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{date}</p>
        </div>
      </Link>
    );
  }

  const isHero = variant === 'hero';
  return (
    <Link
      href={newsPath(news.slug)}
      className={cn(
        'group flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900',
        isHero ? 'flex-col lg:flex-row' : 'flex-col',
      )}
    >
      {isHero ? (
        // The text column sets the height on large screens; the photo fills it and crops.
        <div className="relative aspect-[16/9] w-full shrink-0 lg:aspect-auto lg:min-h-[340px] lg:w-3/5">
          <NewsCover
            src={news.coverImageUrl}
            alt={news.headline}
            className="absolute inset-0 h-full w-full"
          />
        </div>
      ) : (
        <NewsCover src={news.coverImageUrl} alt={news.headline} className="aspect-[16/9] w-full" />
      )}
      <div className={cn('flex flex-1 flex-col p-5', isHero && 'lg:p-8')}>
        <div className="flex flex-wrap items-center gap-2">
          <NewsCategoryBadge category={news.category} />
          {news.isFeatured && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <Star className="h-3 w-3 fill-current" />
              {tBilingual('Featured', 'ተለይቶ የቀረበ')}
            </span>
          )}
        </div>
        <h3
          lang={textLang}
          className={cn(
            'mt-3 font-display font-bold leading-snug text-slate-950 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400',
            isHero ? 'text-xl lg:text-2xl' : 'line-clamp-3 text-base',
          )}
        >
          {news.headline}
        </h3>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {date}
          {news.source ? ` (${news.source})` : ''}
        </p>
        {news.summary && (
          <p
            lang={textLang}
            className={cn(
              'mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300',
              isHero ? 'line-clamp-5' : 'line-clamp-3',
            )}
          >
            {news.summary}
          </p>
        )}
        <div className="mt-auto flex items-center gap-4 pt-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5" />
            {news.likeCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {news.commentCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
