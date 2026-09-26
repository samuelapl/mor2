import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Badge, Button, Card } from '@/components/ui';
import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { API_URL } from '@/core/config';
import { useLocaleStore } from '@/core/i18n';

/**
 * Phase 1 smoke-check tools (LEARNER_MOBILE_IMPLEMENTATION_PHASES.md §1.6).
 * Rendered only in development builds.
 */
export function DevPanel() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const health = useMutation({
    mutationFn: () => api.get<unknown>(endpoints.health, { skipAuth: true }),
  });

  if (!__DEV__) return null;

  return (
    <Card className="gap-3">
      <AppText variant="heading">Developer</AppText>

      <View className="gap-1">
        <AppText variant="label">{t('dev.apiUrl')}</AppText>
        <AppText variant="caption" selectable>
          {API_URL}
        </AppText>
      </View>

      <Button
        title={t('dev.healthCheck')}
        variant="outline"
        loading={health.isPending}
        onPress={() => health.mutate()}
      />
      {health.isSuccess ? (
        <View className="gap-1">
          <Badge label={t('dev.healthOk')} tone="success" />
          <AppText variant="caption" selectable>
            {JSON.stringify(health.data)}
          </AppText>
        </View>
      ) : null}
      {health.isError ? (
        <View className="gap-1">
          <Badge label={t('dev.healthFail')} tone="danger" />
          <AppText variant="caption" selectable>
            {health.error.message}
          </AppText>
        </View>
      ) : null}

      <View className="flex-row items-center gap-2">
        <AppText variant="label" className="flex-1">
          {t('dev.language')}
        </AppText>
        <Button
          title="English"
          size="sm"
          variant={locale === 'en' ? 'primary' : 'outline'}
          onPress={() => setLocale('en')}
        />
        <Button
          title="አማርኛ"
          size="sm"
          variant={locale === 'am' ? 'primary' : 'outline'}
          onPress={() => setLocale('am')}
        />
      </View>

      <Link href="/dev/ui-gallery" asChild>
        <Button title={t('screens.uiGallery')} variant="ghost" />
      </Link>
    </Card>
  );
}
