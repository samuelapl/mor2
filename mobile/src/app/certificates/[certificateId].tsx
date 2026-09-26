import { useLocalSearchParams } from 'expo-router';
import { Award, Download } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Alert } from '@/core/utils/alert';
import { AppText, Button, Card, ErrorState, Screen, Skeleton } from '@/components/ui';
import { ApiError } from '@/core/api/errors';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { useLocaleStore, useLocalized } from '@/core/i18n';
import { palette } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/formatters';
import {
  CertificateHostUnreachableError,
  CertificatePdfPendingError,
  openCertificatePdf,
  useCertificate,
} from '@/features/certificates';

export default function CertificateScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const locale = useLocaleStore((s) => s.locale);
  const online = useIsOnline();
  const { certificateId } = useLocalSearchParams<{ certificateId: string }>();
  const certificate = useCertificate(certificateId);
  const [downloading, setDownloading] = useState(false);

  if (certificate.isPending) {
    return (
      <Screen>
        <Skeleton height={240} />
      </Screen>
    );
  }
  if (certificate.isError || !certificate.data) {
    return (
      <Screen>
        <ErrorState error={certificate.error} onRetry={() => void certificate.refetch()} />
      </Screen>
    );
  }
  const c = certificate.data;

  const download = async () => {
    setDownloading(true);
    try {
      await openCertificatePdf(c);
    } catch (error) {
      Alert.alert(
        t('certificates.download'),
        error instanceof CertificatePdfPendingError
          ? t('certificates.pdfPending')
          : error instanceof CertificateHostUnreachableError
            ? t('certificates.hostUnreachable')
            : error instanceof ApiError
              ? error.localizedMessage(locale)
              : t('certificates.downloadFailed'),
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Screen>
      <Card className="items-center gap-3 border-amber-200 py-8 dark:border-amber-900">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
          <Award size={34} color={palette.warning} />
        </View>
        <AppText variant="caption">{t('certificates.ofCompletion')}</AppText>
        <AppText variant="title" className="text-center">
          {localized(c.course, 'title')}
        </AppText>
        <AppText variant="muted">{c.course.code}</AppText>
      </Card>

      <Card className="gap-3">
        <Info label={t('certificates.number')} value={c.certificateNumber} />
        <Info label={t('certificates.issued')} value={formatDate(c.issuedAt, locale)} />
        {c.expiresAt ? (
          <Info label={t('certificates.expires')} value={formatDate(c.expiresAt, locale)} />
        ) : null}
        <Info label={t('certificates.verificationCode')} value={c.verificationCode} />
      </Card>

      <Button
        title={t('certificates.download')}
        icon={<Download size={18} color={palette.white} />}
        onPress={download}
        loading={downloading}
        disabled={!online}
        fullWidth
      />
      <AppText variant="caption" className="text-center">
        {online ? t('certificates.verifyHint') : t('common.offlineAction')}
      </AppText>
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <AppText variant="muted">{label}</AppText>
      <AppText selectable className="flex-shrink font-semibold text-slate-900 dark:text-slate-50">
        {value}
      </AppText>
    </View>
  );
}
