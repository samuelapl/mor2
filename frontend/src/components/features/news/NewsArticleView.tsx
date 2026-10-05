'use client';

import { RichContent } from '@/components/ui/RichContent';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatNewsDate, newsTextLang } from '@/lib/news';
import type { ApiNewsImage, NewsCategory } from '@/lib/api/types';
import { NewsCategoryBadge } from './NewsBadges';
import { NewsCover } from './NewsCover';
import { NewsGallery } from './NewsGallery';

export interface NewsArticleData {
  headline: string;
  content: string;
  coverImageUrl: string | null;
  category: NewsCategory;
  source: string;
  eventDate: string | null;
  publishedAt: string | null;
  images: ApiNewsImage[];
}

/**
 * The article as readers see it: cover → headline → "date (source)" → body → gallery.
 * Used by the public page and by the editor's preview, so both always match.
 */
export function NewsArticleView({ news }: { news: NewsArticleData }) {
  const { lang } = useTranslation();
  const textLang = newsTextLang(news.headline, news.content);
  const date = formatNewsDate(news.eventDate ?? news.publishedAt, lang);

  return (
    <article lang={textLang}>
      <NewsCover
        src={news.coverImageUrl}
        alt={news.headline}
        className="aspect-[16/9] w-full rounded-2xl shadow-sm"
      />
      <div className="mt-6">
        <NewsCategoryBadge category={news.category} />
      </div>
      <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-slate-950 dark:text-white sm:text-3xl">
        {news.headline}
      </h1>
      {(date || news.source) && (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {date}
          {news.source ? ` (${news.source})` : ''}
        </p>
      )}
      <RichContent
        html={news.content}
        className="mt-6 text-base leading-8 [&_p]:mb-5 sm:text-[17px]"
      />
      <NewsGallery images={news.images} />
    </article>
  );
}
