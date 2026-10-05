'use client';

import Link from 'next/link';
import { Newspaper } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function NewsNotFound() {
  const { tBilingual } = useTranslation();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <Newspaper className="h-10 w-10 text-slate-300 dark:text-slate-700" />
      <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
        {tBilingual('News not found', 'ዜናው አልተገኘም')}
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {tBilingual(
          'This news may have been removed or is no longer published.',
          'ይህ ዜና ተወግዶ ወይም ከህትመት ወርዶ ሊሆን ይችላል።',
        )}
      </p>
      <Link
        href="/news"
        className="mt-6 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-sky-500"
      >
        {tBilingual('See all news', 'ሁሉንም ዜናዎች ይመልከቱ')}
      </Link>
    </div>
  );
}
