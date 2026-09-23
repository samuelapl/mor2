"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Check specifically for classroom route (/learner/courses/[id]/learn), not just any /learner page
  const isClassroom = Boolean(pathname && /\/courses\/[^/]+\/learn(\/|$)/.test(pathname));

  // When inside the classroom, cover everything (no dashboard sidebar, no dashboard header)
  if (isClassroom) {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-slate-50">
        {children}
      </div>
    );
  }

  // Regular dashboard layout
  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-50">
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-indigo-50/60 via-transparent to-violet-50/40" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-grid opacity-70" />
      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}