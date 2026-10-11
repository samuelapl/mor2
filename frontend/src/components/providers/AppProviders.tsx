'use client';

import type { ReactNode } from 'react';
import { ToastContainer } from '@/components/ui/Toast';
import { SessionSync } from './SessionSync';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
      {/* After children so its effects run after theirs, as LmsProvider's did. */}
      <SessionSync />
    </>
  );
}
