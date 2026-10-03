'use client';

import { useLayoutEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { PageLoader } from '@/components/ui/Spinner';

/** How long the spinner shows on every page change. Set to 0 to disable. */
const PAGE_TRANSITION_MS = 2000;

// Module-level, not refs: DashboardLayout swaps its whole tree when entering or
// leaving a full-screen page (classroom, course review), which remounts this
// component. A ref would forget the previous page and skip the loader.
let lastSeenPath: string | null = null;
let loaderUntil = 0;

/**
 * Shows the page loader for a fixed time whenever the URL path changes. The new
 * page is mounted (hidden) right away, so it loads its data during the wait.
 * The first page load and query-string changes do not trigger it.
 */
export function PageTransitionLoader({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  // Layout effect so the new page is hidden before it is ever painted.
  useLayoutEffect(() => {
    if (lastSeenPath !== null && lastSeenPath !== pathname) {
      loaderUntil = Date.now() + PAGE_TRANSITION_MS;
    }
    lastSeenPath = pathname;

    // Works from the end time, so a remount (or React's dev double-run) resumes
    // the same loader instead of skipping or restarting it.
    const remaining = loaderUntil - Date.now();
    if (remaining <= 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), remaining);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      {loading && <PageLoader />}
      <div className={loading ? 'hidden' : 'contents'} aria-hidden={loading || undefined}>
        {children}
      </div>
    </>
  );
}
