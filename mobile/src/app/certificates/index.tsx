import { router } from 'expo-router';
import { Award, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Button, Card, EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { useLocaleStore, useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/formatters';
import { useMyCertificates } from '@/features/certificates';

export default function CertificatesScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);
  const certificates = useMyCertificates();

  return (
    <Screen refreshing={certificates.isRefetching} onRefresh={() => void certificates.refetch()}>
      {certificates.isPending ? (
        <Skeleton height={100} />
      ) : certificates.isError && !certificates.data ? (
        <ErrorState error={certificates.error} onRetry={() => void certificates.refetch()} />
      ) : certificates.data.length === 0 ? (
        <>
          <EmptyState
            icon={<Award size={44} color={colors.textMuted} />}
            title={t('certificates.empty')}
            description={t('certificates.emptyHint')}
          />
          <Button
            title={t('tabs.myCourses')}
            variant="secondary"
            onPress={() => router.navigate('/my-courses')}
          />
        </>
      ) : (
        certificates.data.map((c) => (
          <Card
            key={c.id}
            onPress={() =>
              router.push({
                pathname: '/certificates/[certificateId]',
                params: { certificateId: c.id },
              })
            }
            className="flex-row items-center gap-3"
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900">
              <Award size={24} color={colors.warning} />
            </View>
            <View className="flex-1 gap-0.5">
              <AppText
                className="font-semibold text-slate-900 dark:text-slate-50"
                numberOfLines={2}
              >
                {localized(c.course, 'title')}
              </AppText>
              <AppText variant="caption">
                {c.certificateNumber} · {formatDate(c.issuedAt, locale)}
              </AppText>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </Card>
        ))
      )}
    </Screen>
  );
}
