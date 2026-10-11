'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Bell, CheckCheck, LogOut, Menu, UserCircle } from 'lucide-react';
import { getRoleFromPath, ROLE_LABELS } from '@/constants/roles';
import { useAuthStore } from '@/lib/stores/auth-store';
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

interface HeaderProps {
  /** Phones: opens the sidebar drawer. */
  onMenuClick?: () => void;
  menuOpen?: boolean;
}

export default function Header({ onMenuClick, menuOpen: drawerOpen = false }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const { lang, tRole, t } = useTranslation('common');
  const isAmharic = lang === 'am';
  const role = currentUser?.role ?? getRoleFromPath(pathname);
  const roleLabel = role ? tRole(role) : t('dashboard');
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
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 sm:px-6">
      {/* Phones have no sidebar: menu button + logo instead. */}
      <div className="flex min-w-0 items-center gap-1 md:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={t('header.openMenu')}
          aria-controls="dashboard-sidebar"
          aria-expanded={drawerOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-secondary-foreground transition-colors hover:bg-secondary"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="flex min-w-0 items-center gap-2" title="MoR LMS">
          <Image
            src="/logo.jpg"
            alt="Ministry of Revenues"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-full object-contain"
          />
          <span className="truncate font-display text-sm font-bold text-foreground">
            MoR LMS
          </span>
        </Link>
      </div>
      <div className="hidden md:block" />

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Below `sm` these live in the sidebar drawer instead. */}
        <LanguageToggle className="hidden sm:inline-block" />
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            aria-label={t('notifications')}
            onClick={() => {
              if (!open) void load();
              setOpen((prev) => !prev);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card/70 text-muted-foreground shadow-sm backdrop-blur transition-all hover:border-primary/30 hover:text-primary hover:shadow-md active:scale-95"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-card">
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </button>

          {open ? (
            <div className="fixed inset-x-3 top-[4.5rem] z-50 overflow-hidden rounded-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-80 border border-border/80 bg-popover text-popover-foreground shadow-xl dark:shadow-slate-900/50">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  {t('notifications')}
                </p>
                <button
                  type="button"
                  onClick={() => void readAll()}
                  className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t('markAllRead')}
                </button>
              </div>
              <div className="max-h-[min(24rem,calc(100dvh-9rem))] overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-subtle-foreground">
                    {t('noNotifications')}
                  </p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => void readOne(n.id)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-muted/60',
                        !n.readAt ? 'bg-primary-soft/40' : '',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          n.readAt ? 'bg-input' : 'bg-primary',
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-foreground">
                          {title(n)}
                        </span>
                        {bodyText(n) ? (
                          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                            {bodyText(n)}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-[10px] text-subtle-foreground">
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
            className="flex items-center gap-2.5 rounded-xl py-1 sm:border-l sm:border-border/80 sm:pl-3 transition-colors hover:bg-muted cursor-pointer"
          >
            {demoUser?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={demoUser.avatarUrl}
                alt="Avatar"
                className="h-9 w-9 rounded-xl object-cover shadow-md ring-1 ring-card/30"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 ring-1 ring-card/30">
                {getInitials(demoUser?.name ?? roleLabel)}
              </div>
            )}
            <div className="hidden text-left leading-tight lg:block">
              <p className="text-sm font-medium text-foreground">{demoUser?.name ?? 'Demo User'}</p>
              <p className="text-[11px] text-muted-foreground">{demoUser?.email}</p>
            </div>
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-12 z-50 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-border/80 bg-popover text-popover-foreground shadow-xl dark:shadow-slate-900/50 animate-fade-in-up">
              {/* Profile summary with avatar, name, and email */}
              <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
                {demoUser?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={demoUser.avatarUrl}
                    alt="Avatar"
                    className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-semibold text-info">
                    {getInitials(demoUser?.name ?? roleLabel)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {demoUser?.name ?? 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {demoUser?.email}
                  </p>
                </div>
              </div>

              {/* Actions: Account & Log out */}
              <div className="p-1.5 space-y-0.5">
                {/* 1. Account */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setAccountOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-normal text-secondary-foreground transition-colors hover:bg-secondary cursor-pointer"
                >
                  <UserCircle className="h-5 w-5 text-muted-foreground" />
                  <span>{t('header.account')}</span>
                </button>

                {/* 2. Log out */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                    router.push('/login');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-normal text-secondary-foreground transition-colors hover:bg-danger-soft hover:text-danger cursor-pointer group"
                >
                  <LogOut className="h-5 w-5 text-muted-foreground group-hover:text-danger" />
                  <span>{t('header.logOut')}</span>
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
