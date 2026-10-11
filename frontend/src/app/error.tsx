'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-6 text-center">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          The page encountered an unexpected issue while loading.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition active:scale-95"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-secondary-foreground hover:bg-muted transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

