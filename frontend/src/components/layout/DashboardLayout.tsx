'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import LearnerBottomNav from '@/components/layout/LearnerBottomNav';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Check specifically for classroom route (/learner/courses/[id]/learn), not just any /learner page
  const isClassroom = Boolean(pathname && /\/courses\/[^/]+\/learn(\/|$)/.test(pathname));
  // The staff course review page (/courses/[id]) is full-screen too, like the creator studio.
  const isCourseReview = Boolean(pathname && /^\/courses\/[^/]+\/?$/.test(pathname));
  // Learner pages get a bottom tab bar on phones.
  const isLearnerArea = Boolean(pathname && /^\/learner(\/|$)/.test(pathname));

  // Phones: the sidebar is a drawer. Close it on navigation and with Escape.
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // When inside the classroom or course review, cover everything (no dashboard sidebar, no dashboard header)
  if (isClassroom || isCourseReview) {
    return <div className="relative h-dvh w-screen overflow-hidden bg-slate-50 dark:bg-slate-900">{children}</div>;
  }

  // Regular dashboard layout
  return (
    <div className="relative flex h-dvh overflow-hidden bg-slate-50/70 dark:bg-slate-950">
      <Sidebar mobileOpen={drawerOpen} onMobileClose={() => setDrawerOpen(false)} />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col bg-white dark:bg-slate-900">
        <Header onMenuClick={() => setDrawerOpen(true)} menuOpen={drawerOpen} />
        <main
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/50 dark:bg-slate-950',
            // Room for the bottom tab bar (and the iPhone home indicator) on phones.
            isLearnerArea && 'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0',
          )}
        >
          {children}
        </main>
      </div>
      {isLearnerArea ? <LearnerBottomNav onMore={() => setDrawerOpen(true)} /> : null}
    </div>
  );
}
