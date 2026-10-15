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
import { useLandingConfig } from '@/hooks/useLandingConfig';
import { cn } from '@/lib/utils';

/** Institutional banner + sticky top bar shared by the landing page and the public news pages. */
export default function PublicHeader() {
  const { t } = useTranslation('common');
  const currentUser = useAuthStore((s) => s.currentUser);
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { config, resolveText } = useLandingConfig();

  // Active navigation links sorted by user-configured order
  const navLinks = (config.header?.navLinks || [])
    .filter((link) => link.isVisible)
    .sort((a, b) => a.order - b.order)
    .map((link) => ({
      id: link.id,
      label: resolveText(link.labelEn, link.labelAm) || link.labelEn,
      href: link.href,
      desktopOnly: link.desktopOnly,
      isExternal: link.isExternal,
    }));

  const isActive = (href: string) => href === '/news' && pathname.startsWith('/news');
  const dashboardHref = currentUser
    ? getRoleHomePath(currentUser.role, currentUser.permissions)
    : null;

  return (
    <>
      {/* INSTITUTIONAL STATUS BANNER */}
      {config.branding?.showTopBanner !== false && (
        <div className="border-b border-info/15 bg-gradient-to-r from-info-soft via-background to-warning-soft/50 px-4 py-2 text-center text-xs font-medium text-info">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
            <Landmark className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>
              {resolveText(config.branding?.topBannerTextEn, config.branding?.topBannerTextAm) ||
                t('publicHeader.federalDemocraticRepublicOfEthiopiaMinis')}
            </span>
          </div>
        </div>
      )}

      {/* TOPBAR NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Brand Identity */}
          <Link href="/" className="flex shrink-0 items-center gap-3 transition-opacity hover:opacity-90">
            <Image
              src={config.branding?.logoUrl || '/logo.jpg'}
              alt={resolveText(config.branding?.systemNameEn, config.branding?.systemNameAm) || 'Ministry of Revenues'}
              width={42}
              height={42}
              unoptimized
              className="h-10 w-10 shrink-0 object-contain rounded-lg"
              priority
            />
            {/* Brand text hides on phones so the controls fit on one line. */}
            <div className="hidden sm:flex sm:flex-col shrink-0 whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base font-bold tracking-tight text-foreground">
                  {resolveText(config.branding?.systemNameEn, config.branding?.systemNameAm) || 'MoR LMS'}
                </span>
                {config.branding?.showGovBadge !== false && (
                  <span className="rounded bg-warning-soft px-1.5 py-0.2 font-mono text-[9px] font-bold text-warning border border-warning/30">
                    GOV
                  </span>
                )}
              </div>
              <p className="text-[10px] font-medium text-info leading-tight">
                {resolveText(config.branding?.subtitleEn, config.branding?.subtitleAm) ||
                  t('publicHeader.ministryOfRevenues')}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation - Sharp, modern, consistent */}
          <nav className="hidden items-center gap-2 xl:gap-3 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.id || link.href}
                href={link.href}
                {...(link.desktopOnly ? { 'data-desktop-app-only': 'true' } : {})}
                {...(link.isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-sm font-semibold tracking-normal transition-all duration-150',
                  isActive(link.href)
                    ? 'bg-info-soft text-info font-bold shadow-xs'
                    : 'text-secondary-foreground hover:bg-info-soft hover:text-info active:scale-95',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Controls & Actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
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
                {config.header?.showSignInButton !== false && (
                  <Link
                    href="/login"
                    className="hidden rounded-xl border border-input/80 bg-card px-3.5 py-2 text-xs font-semibold sm:inline-flex text-secondary-foreground shadow-sm transition hover:bg-muted"
                  >
                    {t('publicFooter.signIn')}
                  </Link>
                )}

                {config.header?.showGetStartedButton !== false && (
                  <Link
                    href="/register"
                    className="hidden rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-600/20 transition hover:from-sky-500 hover:to-blue-600 active:scale-95 sm:inline-flex"
                  >
                    {t('publicHeader.getStarted')}
                  </Link>
                )}
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
                  key={link.id || link.href}
                  href={link.href}
                  {...(link.desktopOnly ? { 'data-desktop-app-only': 'true' } : {})}
                  {...(link.isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium hover:bg-info-soft hover:text-info transition-colors',
                    isActive(link.href)
                      ? 'bg-info-soft text-info font-bold'
                      : 'text-secondary-foreground',
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 flex flex-col gap-2">
                {dashboardHref ? (
                  <Link
                    href={dashboardHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-sky-600/20 transition hover:from-sky-500 hover:to-blue-600"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {t('publicHeader.myDashboard')}
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-input/80 bg-card px-4 py-2.5 text-xs font-semibold text-secondary-foreground shadow-sm transition hover:bg-muted"
                    >
                      {t('publicFooter.signIn')}
                    </Link>
                    {config.header?.showGetStartedButton !== false && (
                      <Link
                        href="/register"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-sky-600/20 transition hover:from-sky-500 hover:to-blue-600"
                      >
                        {t('publicHeader.getStarted')}
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
