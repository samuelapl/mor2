'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { getRoleFromPath } from '@/constants/roles';
import { navItemsForRole, type NavItem } from '@/constants/navigation';
import { useLms } from '@/lib/lms-store';
import { usePermissions } from '@/lib/usePermissions';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import AccountMenu from '@/components/shared/account/AccountMenu';

function filterNavItems(items: NavItem[], canAny: (codes: string[]) => boolean): NavItem[] {
  return items
    .map((item) =>
      item.children ? { ...item, children: filterNavItems(item.children, canAny) } : item,
    )
    .filter((item) => {
      if (item.children) return item.children.length > 0;
      return !item.permission || canAny([item.permission].flat());
    });
}

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, logout } = useLms();
  const { canAny } = usePermissions();
  const { tNav, t, isAmharic } = useTranslation();
  const role = currentUser?.role ?? getRoleFromPath(pathname) ?? 'learner';
  const navItems = filterNavItems(navItemsForRole(role), canAny);

  const currentPath = pathname ? pathname.replace(/\/+$/, "") || "/" : "/";

  // Flatten all navigable hrefs in current nav to pick the single best (most specific/longest) match
  const allHrefs = useMemo(() => {
    const list: string[] = [];
    const collect = (items: NavItem[]) => {
      for (const item of items) {
        if (item.href) list.push(item.href.replace(/\/+$/, "") || "/");
        if (item.children) collect(item.children);
      }
    };
    collect(navItems);
    return list;
  }, [navItems]);

  const activeHref = useMemo(() => {
    // 1. Exact match has top priority
    const exact = allHrefs.find((h: string) => currentPath === h);
    if (exact) return exact;

    // 2. Otherwise find the longest prefix match so parent root routes (e.g. /learner)
    // do not steal highlight when the user navigates to a sub-route (e.g. /learner/catalog).
    const prefixMatches = allHrefs
      .filter((h: string) => currentPath.startsWith(`${h}/`))
      .sort((a: string, b: string) => b.length - a.length);

    return prefixMatches[0] ?? null;
  }, [allHrefs, currentPath]);

  const isActive = (href: string) => {
    const normalized = href ? href.replace(/\/+$/, "") || "/" : "/";
    return normalized === activeHref;
  };

  const isGroupActive = (item: NavItem): boolean =>
    item.children?.some((child) => (child.href ? isActive(child.href) : false)) ?? false;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const isGroupOpen = (item: NavItem) => openGroups[item.label] ?? isGroupActive(item);
  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !(prev[label] ?? false) }));

  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'relative flex shrink-0 flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      <div
        className={cn(
          'relative flex h-16 items-center gap-2 border-b border-slate-200 dark:border-slate-800 px-5',
          collapsed && 'justify-center px-3',
        )}
      >
        <Link
          href="/"
          title="Back to home"
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-lg transition-opacity hover:opacity-80',
            collapsed && 'flex-none justify-center',
          )}
        >
          <Image
            src="/logo.jpg"
            alt="Ministry of Revenues"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full object-contain"
          />
          {!collapsed ? (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                MoR LMS
              </p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {isAmharic ? 'የትምህርት አስተዳደር ሥርዓት' : 'Learning Management System'}
              </p>
            </div>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          title={
            collapsed
              ? isAmharic
                ? 'አስፋ'
                : 'Expand sidebar'
              : isAmharic
                ? 'አሳንስ'
                : 'Collapse sidebar'
          }
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {!collapsed ? (
        <p className="relative px-5 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {isAmharic ? 'አቅጣጫ መጠቆሚያ' : 'Navigation'}
        </p>
      ) : null}
      <nav
        className={cn(
          'relative flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 pb-4',
          collapsed && 'pt-4',
        )}
      >
        {/* overflow-x-hidden prevents label bleed during the width transition */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const translatedLabel = tNav(item.label);

          if (item.children) {
            const open = isGroupOpen(item);
            const groupActive = isGroupActive(item);
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(item.label)}
                  title={collapsed ? translatedLabel : undefined}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    collapsed && 'justify-center px-0',
                    groupActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                  {!collapsed ? <span className="flex-1 text-left">{translatedLabel}</span> : null}
                  {!collapsed ? (
                    <ChevronDown
                      className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
                    />
                  ) : null}
                </button>
                {open ? (
                  <div
                    className={cn(
                      'mt-1 space-y-1',
                      collapsed ? '' : 'ml-4 border-l border-slate-200 dark:border-slate-800 pl-3',
                    )}
                  >
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childTranslated = tNav(child.label);
                      const active = child.href ? isActive(child.href) : false;
                      return (
                        <Link
                          key={child.href}
                          href={child.href ?? '#'}
                          title={collapsed ? childTranslated : undefined}
                          className={cn(
                            'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
                            collapsed && 'justify-center px-0',
                            active
                              ? 'bg-gradient-to-r from-indigo-500/90 to-violet-500/80 text-white shadow-lg shadow-indigo-500/20'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200',
                          )}
                        >
                          <ChildIcon
                            className={cn(
                              'h-4 w-4 shrink-0 transition-colors',
                              active ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400',
                            )}
                          />
                          {!collapsed ? childTranslated : null}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          const active = item.href ? isActive(item.href) : false;
          return (
            <Link
              key={item.href}
              href={item.href ?? '#'}
              title={collapsed ? translatedLabel : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-gradient-to-r from-indigo-500/90 to-violet-500/80 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400',
                )}
              />
              {!collapsed ? translatedLabel : null}
              {active && !collapsed ? (
                <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgb(255_255_255/0.8)]" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-slate-200 dark:border-slate-800 p-3 space-y-1">
        <AccountMenu collapsed={collapsed} />
        <Link
          href="/login"
          onClick={() => logout()}
          title={collapsed ? (isAmharic ? 'መለያ ቀይር / ውጣ' : 'Switch role / Sign out') : undefined}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed ? (isAmharic ? 'መለያ ቀይር / ውጣ' : 'Switch role / Sign out') : null}
        </Link>
      </div>
    </aside>
  );
}
