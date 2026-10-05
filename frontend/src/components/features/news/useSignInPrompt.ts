'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/lib/toast';

/** Toast with a "Sign in" action that comes back to the current page after login. */
export function useSignInPrompt() {
  const router = useRouter();
  const pathname = usePathname();
  const { tBilingual } = useTranslation();

  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;
  const prompt = useCallback(
    (message: { en: string; am: string }) =>
      toast.info(tBilingual(message), {
        action: { label: tBilingual('Sign in', 'ግባ'), onClick: () => router.push(loginHref) },
      }),
    [router, loginHref, tBilingual],
  );

  return { prompt, loginHref };
}
