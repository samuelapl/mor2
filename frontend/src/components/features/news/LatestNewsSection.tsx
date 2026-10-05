'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { fetchFeaturedNews } from '@/lib/api/news';
import type { ApiNewsCard } from '@/lib/api/types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { NewsCard } from './NewsCard';

/** "Latest News" strip on the landing page; the whole section is hidden until there is news. */
export function LatestNewsSection() {
  const { tBilingual } = useTranslation();
  const [items, setItems] = useState<ApiNewsCard[]>([]);

  useEffect(() => {
    fetchFeaturedNews()
      .then(setItems)
      .catch(() => undefined);
  }, []);

  if (items.length === 0) return null;

  return (
    <section id="news" className="scroll-mt-16 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              {tBilingual('Ministry of Revenues', 'የገቢዎች ሚኒስቴር')}
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              {tBilingual('Latest News', 'የቅርብ ጊዜ ዜናዎች')}
            </h2>
          </div>
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:underline dark:text-sky-400"
          >
            {tBilingual('View all news', 'ሁሉንም ዜናዎች ይመልከቱ')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((n) => (
            <NewsCard key={n.id} news={n} />
          ))}
        </div>
      </div>
    </section>
  );
}
