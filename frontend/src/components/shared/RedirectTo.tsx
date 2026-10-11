'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectTo({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [router, href]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted text-sm text-muted-foreground">
      Redirecting…
    </div>
  );
}
