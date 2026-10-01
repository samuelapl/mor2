'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CheckCheck, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { getRoleFromPath, ROLE_LABELS } from '@/constants/roles';
import { useLms } from '@/lib/lms-store';
import {
  fetchMyNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api/notifications';
import type { ApiNotification } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import AccountModal from '@/components/shared/account/AccountModal';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useTranslation } from '@/lib/i18n/useTranslation';

function getInitials(label: string) {
  return label
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface ApiNotificationListItem extends ApiNotification {}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useLms();
  const { lang, tRole } = useTranslation();
  const isAmharic = lang === 'am';
  const role = currentUser?.role ?? getRoleFromPath(pathname);
  const roleLabel = role ? tRole(role) : isAmharic ? 'ዳሽቦርድ' : 'Dashboard';
  const demoUser = currentUser;

  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<ApiNotificationListItem[]>([]);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const [res, count] = await Promise.all([
        fetchMyNotifications({ limit: 15 }),
        fetchUnreadCount(),
      ]);
      setNotifications(res.data);
      setUnread(count.unreadCount);
    } catch {
      setNotifications([]);
      setUnread(0);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const readOne = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnread((prev) => Math.max(0, prev - 1));
    try {
      await markNotificationRead(id);
    } catch {
      void load();
    }
  };

  const readAll = async () => {
    try {
      await markAllNotificationsRead();
    } catch {
      // ignore
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    setUnread(0);
  };

  const title = (n: ApiNotificationListItem) =>
    isAmharic ? (n.titleAm ?? n.titleEn) : (n.titleEn ?? n.titleAm);
  const bodyText = (n: ApiNotificationListItem) =>
    isAmharic ? (n.bodyAm ?? n.bodyEn) : (n.bodyEn ?? n.bodyAm);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6">
      <div />

      <div className="flex items-center gap-3">
        <LanguageToggle />
        <ThemeToggle isAmharic={isAmharic} />

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            aria-label={isAmharic ? 'ማሳወቂያዎች' : 'Notifications'}
            onClick={() => {
              if (!open) void load();
              setOpen((prev) => !prev);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 shadow-sm backdrop-blur transition-all hover:border-indigo-200 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-md active:scale-95"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-800">
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </button>

          {open ? (
            <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl dark:shadow-slate-900/50">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isAmharic ? 'ማሳወቂያዎች' : 'Notifications'}
                </p>
                <button
                  type="button"
                  onClick={() => void readAll()}
                  className="flex items-center gap-1 text-[11px] font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {isAmharic ? 'ሁሉንም አንብብ' : 'Mark all read'}
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                    {isAmharic ? 'ምንም ማሳወቂያዎች የሉም' : 'No notifications yet'}
                  </p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => void readOne(n.id)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b border-slate-50 dark:border-slate-700/30 px-4 py-3 text-left transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-700/60',
                        !n.readAt ? 'bg-indigo-50/40 dark:bg-indigo-900/20' : '',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          n.readAt ? 'bg-slate-200 dark:bg-slate-600' : 'bg-indigo-500',
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {title(n)}
                        </span>
                        {bodyText(n) ? (
                          <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                            {bodyText(n)}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* User Account / Profile Button with Separate Actions */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            onClick={() => setMenuOpen((prev) => !prev)}
            title={demoUser?.name ?? 'Profile'}
            className="flex items-center gap-2.5 rounded-xl border-l border-slate-200/80 dark:border-slate-700/80 pl-3 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
          >
            {demoUser?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={demoUser.avatarUrl}
                alt="Avatar"
                className="h-9 w-9 rounded-xl object-cover shadow-md ring-1 ring-white/30 dark:ring-white/10"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 ring-1 ring-white/30 dark:ring-white/10">
                {getInitials(demoUser?.name ?? roleLabel)}
              </div>
            )}
            <div className="hidden text-left leading-tight lg:block">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{demoUser?.name ?? 'Demo User'}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{demoUser?.email}</p>
            </div>
            <ChevronDown
              className={cn(
                'hidden h-4 w-4 text-slate-400 transition-transform duration-200 lg:block',
                menuOpen && 'rotate-180 text-slate-600 dark:text-slate-200',
              )}
            />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl dark:shadow-slate-900/50 animate-fade-in-up">
              {/* Profile summary */}
              <div className="border-b border-slate-100 dark:border-slate-700/60 p-3">
                <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                  {demoUser?.name ?? 'User'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {demoUser?.email}
                </p>
                <div className="mt-1.5">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 capitalize">
                    {roleLabel}
                  </span>
                </div>
              </div>

              {/* Separate actions: Account Settings & Log out */}
              <div className="p-1.5 space-y-1">
                {/* 1. Account Settings */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setAccountOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer"
                >
                  <UserIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span>{isAmharic ? 'የመለያ ቅንብሮች' : 'Account Settings'}</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />

                {/* 2. Log out */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                    router.push('/login');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span>{isAmharic ? 'ውጣ' : 'Log out'}</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </header>
  );
}
