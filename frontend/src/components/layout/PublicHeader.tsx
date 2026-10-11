'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Landmark, Menu, X } from 'lucide-react';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { getRoleHomePath } from '@/constants/roles';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

/** Institutional banner + sticky top bar shared by the landing page and the public news pages. */
export default function PublicHeader() {
  const { lang, t } = useTranslation('common');
  const currentUser = useAuthStore((s) => s.currentUser);
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Absolute "/#section" links so they also work from /news.
  const navLinks = [
    { label: t('publicHeader.platformOverview'), href: '/#capabilities' },
    { label: t('publicHeader.roleWorkspaces'), href: '/#roles' },
    { label: t('publicFooter.workflow'), href: '/#how-it-works' },
    { label: t('publicFooter.news'), href: '/news' },
    { label: t('publicHeader.desktopApp'), href: '/#desktop', desktopAppOnly: true },
    { label: t('publicHeader.faq'), href: '/#faq' },
  ];
  const isActive = (href: string) => href === '/news' && pathname.startsWith('/news');
  const dashboardHref = currentUser
    ? getRoleHomePath(currentUser.role, currentUser.permissions)
    : null;

  return (
    <>
      {/* INSTITUTIONAL STATUS BANNER */}
      <div className="border-b border-info/15 bg-gradient-to-r from-info-soft via-background to-warning-soft/50 px-4 py-2 text-center text-xs font-medium text-info">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <Landmark className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>
            {t('publicHeader.federalDemocraticRepublicOfEthiopiaMinis')}
          </span>
        </div>
      </div>

      {/* TOPBAR NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Identity - Clean logo without circle frame */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="Ministry of Revenues"
              width={42}
              height={42}
              className="h-10 w-10 object-contain"
              priority
            />
            {/* Brand text hides on phones so the controls fit on one line. */}
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base font-bold tracking-tight text-foreground">
                  MoR LMS
                </span>
                <span className="rounded bg-warning-soft px-1.5 py-0.2 font-mono text-[9px] font-bold text-warning border border-warning/30">
                  GOV
                </span>
              </div>
              <p className="text-[10px] font-medium text-info">
                {t('publicHeader.ministryOfRevenues')}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                {...(link.desktopAppOnly ? { 'data-desktop-app-only': 'true' } : {})}
                className={cn(
                  'text-xs font-semibold uppercase tracking-wider transition hover:text-info',
                  isActive(link.href)
                    ? 'text-info'
                    : 'text-secondary-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Controls & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <LanguageToggle />
            <ThemeToggle />

            {dashboardHref ? (
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-sky-600/20 transition hover:from-sky-500 hover:to-blue-600 active:scale-95"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('publicHeader.myDashboard')}</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-xl border border-input/80 bg-card px-3.5 py-2 text-xs font-semibold sm:inline-flex text-secondary-foreground shadow-sm transition hover:bg-muted"
                >
                  {t('publicFooter.signIn')}
                </Link>

                <Link
                  href="/login"
                  className="hidden rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-600/20 transition hover:from-sky-500 hover:to-blue-600 active:scale-95 sm:inline-flex"
                >
                  {t('publicHeader.getStarted')}
                </Link>
              </>
            )}

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-secondary-foreground lg:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-b border-border bg-background px-5 py-4 lg:hidden">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  {...(link.desktopAppOnly ? { 'data-desktop-app-only': 'true' } : {})}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary',
                    isActive(link.href)
                      ? 'bg-info-soft text-info'
                      : 'text-secondary-foreground',
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2">
                <Link
                  href={dashboardHref ?? '/login'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full rounded-xl bg-sky-600 py-2.5 text-center text-xs font-semibold text-white shadow-md"
                >
                  {dashboardHref
                    ? t('publicHeader.myDashboard')
                    : t('publicFooter.signIn')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
