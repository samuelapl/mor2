'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Lifts a full-screen studio (course creator, question bank) to <body> as a fixed layer,
 * above the dashboard chrome, and locks page scroll while it is open.
 */
export function StudioPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950">{children}</div>,
    document.body,
  );
}
