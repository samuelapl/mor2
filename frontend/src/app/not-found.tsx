'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-6 text-center">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-foreground">404 - Page Not Found</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          The requested page could not be found.
        </p>
        <div className="mt-6 flex items-center justify-center">
          <Link
            href="/"
            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
