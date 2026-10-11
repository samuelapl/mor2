'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { NamespaceKey } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/lib/toast';

/** Toast with a "Sign in" action that comes back to the current page after login. */
export function useSignInPrompt() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation('news');

  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;
  const prompt = useCallback(
    (messageKey: NamespaceKey<'news'>) =>
      toast.info(t(messageKey), {
        action: { label: t('newsComments.signIn'), onClick: () => router.push(loginHref) },
      }),
    [router, loginHref, t],
  );

  return { prompt, loginHref };
}
