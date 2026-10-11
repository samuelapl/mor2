import type { ReactNode } from 'react';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

export default function NewsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-muted/40">
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </main>
  );
}
