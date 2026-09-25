'use client';

import type { ReactNode } from 'react';
import { LmsProvider } from '@/lib/lms-store';
import { ToastContainer } from '@/components/ui/Toast';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LmsProvider>
      {children}
      <ToastContainer />
    </LmsProvider>
  );
}
