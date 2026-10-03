'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Check specifically for classroom route (/learner/courses/[id]/learn), not just any /learner page
  const isClassroom = Boolean(pathname && /\/courses\/[^/]+\/learn(\/|$)/.test(pathname));
  // The staff course review page (/courses/[id]) is full-screen too, like the creator studio.
  const isCourseReview = Boolean(pathname && /^\/courses\/[^/]+\/?$/.test(pathname));

  // When inside the classroom or course review, cover everything (no dashboard sidebar, no dashboard header)
  if (isClassroom || isCourseReview) {
    return <div className="relative h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-900">{children}</div>;
  }

  // Regular dashboard layout
  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-50/70 dark:bg-slate-950">
      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col bg-white dark:bg-slate-900">
        <Header />
        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950">{children}</main>
      </div>
    </div>
  );
}
