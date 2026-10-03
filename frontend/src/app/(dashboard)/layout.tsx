import type { ReactNode } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { PageTransitionLoader } from '@/components/layout/PageTransitionLoader';

export default function DashboardRouteLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell>
      <PageTransitionLoader>{children}</PageTransitionLoader>
    </DashboardShell>
  );
}
