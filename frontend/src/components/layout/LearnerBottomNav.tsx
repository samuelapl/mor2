'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LayoutDashboard, Menu, Store, Video, type LucideIcon } from 'lucide-react';
import { navItemsForRole } from '@/constants/navigation';
import { usePermissions } from '@/lib/usePermissions';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { filterNavItems } from './Sidebar';

const TABS: { href: string; icon: LucideIcon; en: string; am: string }[] = [
  { href: '/learner', icon: LayoutDashboard, en: 'Home', am: 'መነሻ' },
  { href: '/learner/catalog', icon: Store, en: 'Catalog', am: 'ኮርሶች' },
  { href: '/learner/my-courses', icon: BookOpen, en: 'My courses', am: 'የእኔ' },
  { href: '/learner/live-sessions', icon: Video, en: 'Live', am: 'ቀጥታ' },
];

/**
 * Phone-only tab bar for the learner area: the four main destinations stay under the thumb,
 * "More" opens the sidebar drawer for everything else. Tabs the user lacks permission for
 * are dropped, following the sidebar.
 */
export default function LearnerBottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname() ?? '';
  const { canAny } = usePermissions();
  const { tBilingual } = useTranslation();

  const allowed = new Set(
    filterNavItems(navItemsForRole('learner'), canAny).flatMap((item) =>
      item.children ? item.children.map((c) => c.href) : [item.href],
    ),
  );
  const tabs = TABS.filter((tab) => allowed.has(tab.href));
  const isActive = (href: string) =>
    href === '/learner'
      ? pathname === '/learner' || pathname === '/learner/'
      : pathname === href || pathname.startsWith(`${href}/`);

  const itemClass = (active: boolean) =>
    cn(
      'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
      active
        ? 'text-indigo-600 dark:text-indigo-400'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
    );

  return (
    <nav
      aria-label={tBilingual('Learner navigation', 'የተማሪ ማውጫ')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="flex h-16 items-stretch">
        {tabs.map(({ href, icon: Icon, en, am }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={itemClass(active)}
            >
              <span
                className={cn(
                  'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                  active && 'bg-indigo-50 dark:bg-indigo-500/15',
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="max-w-full truncate px-1">{tBilingual(en, am)}</span>
            </Link>
          );
        })}
        <button type="button" onClick={onMore} className={itemClass(false)}>
          <span className="flex h-7 w-12 items-center justify-center rounded-full">
            <Menu className="h-5 w-5" />
          </span>
          <span className="max-w-full truncate px-1">{tBilingual('More', 'ተጨማሪ')}</span>
        </button>
      </div>
    </nav>
  );
}
