import { useLocalSearchParams } from 'expo-router';
import { Award, Download, Eye, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Card, ErrorState, Screen, Skeleton } from '@/components/ui';
import { ApiError } from '@/core/api/errors';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { useLocaleStore, useLocalized } from '@/core/i18n';
import { palette, useThemeColors } from '@/core/theme/colors';
import { Alert } from '@/core/utils/alert';
import { formatDate } from '@/core/utils/formatters';
import { useSessionStore } from '@/features/auth';
import {
  CertificateDocumentView,
  downloadCertificatePdf,
  useCertificate,
} from '@/features/certificates';

export default function CertificateScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);
  const online = useIsOnline();
  const user = useSessionStore((s) => s.user);

  const { certificateId } = useLocalSearchParams<{ certificateId: string }>();
  const certificate = useCertificate(certificateId);

  const [downloading, setDownloading] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();

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
  const learnerFullName =
    (c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() : '') ||
    (user ? `${user.firstName} ${user.lastName}`.trim() : '') ||
    'Learner';

  const handleDownload = async () => {
    if (!online) {
      Alert.alert(
        t('common.offline', { defaultValue: 'Offline' }),
        t('common.offlineAction', {
          defaultValue: 'An internet connection is required to download the PDF certificate.',
        }),
      );
      return;
    }

    setDownloading(true);
    try {
      const result = await downloadCertificatePdf(c, locale);
      Alert.alert(
        t('certificates.downloadSuccessTitle', { defaultValue: 'Certificate Downloaded' }),
        t('certificates.downloadSuccessBody', {
          defaultValue: 'The official certificate PDF has been saved to your device: {{fileName}}',
          fileName: result.fileName,
        }),
      );
    } catch (error: any) {
      Alert.alert(
        t('certificates.download', { defaultValue: 'Download Certificate' }),
        error instanceof ApiError
          ? error.localizedMessage(locale)
          : error?.message ||
              t('certificates.downloadFailed', {
                defaultValue: 'Could not download certificate PDF. Please try again.',
              }),
      );
    } finally {
      setDownloading(false);
    }
  };

  // Rotated 90°: the page's width runs along the screen height, its height along the width.
  const viewerHeaderHeight = 120 + insets.top;
  const landscapeWidth = Math.min(
    window.height - viewerHeaderHeight - insets.bottom - 24,
    ((window.width - 24) * 842) / 595,
  );

  const handleOpenView = () => {
    setViewModalVisible(true);
  };

  return (
    <Screen>
      {/* Course & Certificate Header Summary */}
      <Card className="items-center gap-3 border-amber-200 py-6 dark:border-amber-900/60">
        <View className="h-16 w-16 items-center justify-center rounded-full border border-amber-300 bg-amber-100 dark:border-amber-700 dark:bg-amber-900/40">
          <Award size={34} color={palette.warning} />
        </View>
        <AppText
          variant="caption"
          className="font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400"
        >
          {t('certificates.ofCompletion', { defaultValue: 'Official Certificate of Completion' })}
        </AppText>
        <AppText
          variant="title"
          className="px-2 text-center font-bold text-slate-900 dark:text-white"
        >
          {localized(c.course, 'title')}
        </AppText>
        <AppText variant="muted" className="font-medium">
          {c.course.code}
        </AppText>
      </Card>

      {/* In-App Interactive Certificate Preview */}
      <View className="my-1">
        <View className="overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-700">
          <CertificateDocumentView certificate={c} width={window.width - 34} lang={locale} />
        </View>
      </View>

      {/* Certificate Authenticity & Metadata Card */}
      <Card className="gap-3">
        <Info
          label={t('certificates.recipient', { defaultValue: 'Recipient' })}
          value={learnerFullName}
        />
        <Info
          label={t('certificates.number', { defaultValue: 'Certificate Number' })}
          value={c.certificateNumber}
        />
        <Info
          label={t('certificates.issued', { defaultValue: 'Issued Date' })}
          value={formatDate(c.issuedAt, locale)}
        />
        {c.expiresAt ? (
          <Info
            label={t('certificates.expires', { defaultValue: 'Expiration Date' })}
            value={formatDate(c.expiresAt, locale)}
          />
        ) : null}
        <Info
          label={t('certificates.verificationCode', { defaultValue: 'Verification Code' })}
          value={c.verificationCode}
        />
      </Card>

      {/* Exactly TWO Action Buttons: [View] and [Download] */}
      <View className="flex-row items-center gap-3 pt-2">
        {/* [View] Action Button */}
        <View className="flex-1">
          <Button
            title={t('certificates.view', { defaultValue: 'View' })}
            variant="outline"
            icon={<Eye size={18} color={colors.primary} />}
            onPress={handleOpenView}
            fullWidth
          />
        </View>

        {/* [Download] Action Button */}
        <View className="flex-1">
          <Button
            title={t('certificates.download', { defaultValue: 'Download' })}
            variant="primary"
            icon={<Download size={18} color="#ffffff" />}
            onPress={handleDownload}
            loading={downloading}
            disabled={!online}
            fullWidth
          />
        </View>
      </View>

      <AppText variant="caption" className="mt-1 text-center text-slate-400">
        {online
          ? t('certificates.verifyHint', {
              defaultValue: 'Official credential issued by MoR Tele ETIMS Training Academy.',
            })
          : t('common.offlineAction', {
              defaultValue: 'Device is offline. PDF download requires internet connectivity.',
            })}
      </AppText>

      {/* ------------------------------------------------------------------ */}
      {/* In-App Full Certificate Viewer Modal                              */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        visible={viewModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View className="flex-1 bg-slate-950">
          {/* Top Modal Navigation Bar */}
          <View className="flex-row items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 pt-12">
            <View className="flex-1 flex-row items-center gap-2 pr-2">
              <Award size={20} color={palette.warning} />
              <AppText className="text-base font-bold text-white" numberOfLines={1}>
                {t('certificates.modalTitle', { defaultValue: 'Certificate of Completion' })}
              </AppText>
            </View>

            <View className="flex-row items-center gap-2">
              <Button
                title={t('certificates.download', { defaultValue: 'Download' })}
                size="sm"
                variant="primary"
                icon={<Download size={14} color="#ffffff" />}
                onPress={handleDownload}
                loading={downloading}
                disabled={!online}
              />
              <Pressable
                onPress={() => setViewModalVisible(false)}
                className="h-9 w-9 items-center justify-center rounded-xl bg-slate-800 active:bg-slate-700"
              >
                <X size={20} color="#94a3b8" />
              </Pressable>
            </View>
          </View>

          {/* Landscape viewing hint */}
          <View className="border-b border-slate-800/80 bg-slate-900/90 px-4 py-2">
            <AppText className="text-center text-xs text-slate-400">
              {t('certificates.landscapeHint', {
                defaultValue: 'Same layout as the downloaded PDF · Turn your phone to read it',
              })}
            </AppText>
          </View>

          {/* Full page, turned to landscape so the A4 page fills the phone screen */}
          <View className="flex-1 items-center justify-center">
            <View
              style={{
                width: landscapeWidth,
                height: (landscapeWidth * 595) / 842,
                transform: [{ rotate: '90deg' }],
              }}
            >
              <CertificateDocumentView certificate={c} width={landscapeWidth} lang={locale} />
            </View>
          </View>
        </View>
      </Modal>
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
