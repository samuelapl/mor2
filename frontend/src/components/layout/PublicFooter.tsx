'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

/** Footer shared by the landing page and the public news pages. */
export default function PublicFooter() {
  const { tBilingual } = useTranslation();

  return (
    <footer className="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="Ministry of Revenues"
              width={38}
              height={38}
              className="h-9 w-9 object-contain"
            />
            <div>
              <p className="font-display text-sm font-bold text-slate-950 dark:text-white">
                MoR LMS
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {tBilingual('Ministry of Revenues • Ethiopia', 'የገቢዎች ሚኒስቴር • ኢትዮጵያ')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Link href="/#capabilities" className="hover:text-sky-700 dark:hover:text-sky-400">
              {tBilingual('Capabilities', 'ችሎታዎች')}
            </Link>
            <Link href="/#roles" className="hover:text-sky-700 dark:hover:text-sky-400">
              {tBilingual('Roles', 'የስራ ድርሻዎች')}
            </Link>
            <Link href="/#how-it-works" className="hover:text-sky-700 dark:hover:text-sky-400">
              {tBilingual('Workflow', 'የስራ ሂደት')}
            </Link>
            <Link href="/news" className="hover:text-sky-700 dark:hover:text-sky-400">
              {tBilingual('News', 'ዜና')}
            </Link>
            <Link
              href="/#desktop"
              data-desktop-app-only="true"
              className="hover:text-sky-700 dark:hover:text-sky-400"
            >
              {tBilingual('Windows Client', 'የዴስክቶፕ መተግበሪያ')}
            </Link>
            <Link href="/login" className="hover:text-sky-700 dark:hover:text-sky-400">
              {tBilingual('Sign In', 'መግቢያ')}
            </Link>
          </div>

          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()}{' '}
            {tBilingual('Ministry of Revenues. All rights reserved.', 'የገቢዎች ሚኒስቴር። መብቱ በህግ የተጠበቀ ነው።')}
          </p>
        </div>
      </div>
    </footer>
  );
}
