import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: '404' }} />
      <Screen>
        <EmptyState title={t('common.nothingHere')} />
        <Link href="/" asChild>
          <Button title={t('common.back')} variant="secondary" />
        </Link>
      </Screen>
    </>
  );
}
