'use client';

import Link from 'next/link';
import { Newspaper } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function NewsNotFound() {
  const { t } = useTranslation('news');
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <Newspaper className="h-10 w-10 text-subtle-foreground" />
      <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
        {t('newsNotFound.newsNotFound')}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('newsNotFound.thisNewsMayHaveBeenRemoved')}
      </p>
      <Link
        href="/news"
        className="mt-6 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-sky-500"
      >
        {t('newsNotFound.seeAllNews')}
      </Link>
    </div>
  );
}
