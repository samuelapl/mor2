'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Landmark, Menu, X } from 'lucide-react';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { getRoleHomePath } from '@/constants/roles';
import { useLms } from '@/lib/lms-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

/** Institutional banner + sticky top bar shared by the landing page and the public news pages. */
export default function PublicHeader() {
  const { tBilingual, lang } = useTranslation();
  const { currentUser } = useLms();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Absolute "/#section" links so they also work from /news.
  const navLinks = [
    { label: tBilingual('Platform Overview', 'አጠቃላይ እይታ'), href: '/#capabilities' },
    { label: tBilingual('Role Workspaces', 'የስራ ድርሻ ቦታዎች'), href: '/#roles' },
    { label: tBilingual('Workflow', 'የስራ ሂደት'), href: '/#how-it-works' },
    { label: tBilingual('News', 'ዜና'), href: '/news' },
    { label: tBilingual('Desktop App', 'የዴስክቶፕ መተግበሪያ'), href: '/#desktop', desktopAppOnly: true },
    { label: tBilingual('FAQ', 'ተደጋጋሚ ጥያቄዎች'), href: '/#faq' },
  ];
  const isActive = (href: string) => href === '/news' && pathname.startsWith('/news');
  const dashboardHref = currentUser
    ? getRoleHomePath(currentUser.role, currentUser.permissions)
    : null;

  return (
    <>
      {/* INSTITUTIONAL STATUS BANNER */}
      <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-amber-50/50 px-4 py-2 text-center text-xs font-medium text-sky-950 dark:border-slate-800 dark:from-slate-950 dark:via-sky-950/20 dark:to-slate-950 dark:text-sky-300">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <Landmark className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>
            {tBilingual(
              'Federal Democratic Republic of Ethiopia • Ministry of Revenues Enterprise LMS',
              'የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ • የገቢዎች ሚኒስቴር የስልጠና ማዕከል',
            )}
          </span>
        </div>
      </div>

      {/* TOPBAR NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90">
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
                <span className="font-display text-base font-bold tracking-tight text-slate-950 dark:text-white">
                  MoR LMS
                </span>
                <span className="rounded bg-amber-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-amber-900 border border-amber-300/50 dark:bg-amber-950 dark:text-amber-300">
                  GOV
                </span>
              </div>
              <p className="text-[10px] font-medium text-sky-800 dark:text-sky-400">
                {tBilingual('Ministry of Revenues', 'የገቢዎች ሚኒስቴር')}
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
                  'text-xs font-semibold uppercase tracking-wider transition hover:text-sky-700 dark:hover:text-sky-400',
                  isActive(link.href)
                    ? 'text-sky-700 dark:text-sky-400'
                    : 'text-slate-600 dark:text-slate-400',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Controls & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <LanguageToggle />
            <ThemeToggle isAmharic={lang === 'am'} />

            {dashboardHref ? (
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-sky-600/20 transition hover:from-sky-500 hover:to-blue-600 active:scale-95"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tBilingual('My Dashboard', 'የእኔ ዳሽቦርድ')}</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-xl border border-slate-300/80 bg-white px-3.5 py-2 text-xs font-semibold sm:inline-flex text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {tBilingual('Sign In', 'ግባ')}
                </Link>

                <Link
                  href="/login"
                  className="hidden rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-600/20 transition hover:from-sky-500 hover:to-blue-600 active:scale-95 sm:inline-flex"
                >
                  {tBilingual('Get Started', 'ስርዓቱን ጀምር')}
                </Link>
              </>
            )}

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden dark:border-slate-800 dark:text-slate-300"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  {...(link.desktopAppOnly ? { 'data-desktop-app-only': 'true' } : {})}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900',
                    isActive(link.href)
                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400'
                      : 'text-slate-700 dark:text-slate-300',
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
                    ? tBilingual('My Dashboard', 'የእኔ ዳሽቦርድ')
                    : tBilingual('Sign In', 'ግባ')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
