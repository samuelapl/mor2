'use client';

import type { ReactNode } from 'react';
import { LmsProvider } from '@/lib/lms-store';
import { ThemeProvider } from '@/lib/theme';
import { ToastContainer } from '@/components/ui/Toast';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LmsProvider>
        {children}
        <ToastContainer />
      </LmsProvider>
    </ThemeProvider>
  );
}
