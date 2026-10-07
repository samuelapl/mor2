import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Download, ExternalLink, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Badge, Button } from '@/components/ui';
import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';
import { useLocaleStore } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { useAppTheme } from '@/core/theme/theme-store';
import { cn } from '@/core/utils/cn';

import type { LegalDocument } from '../types/laws.types';

export interface LawPdfViewerModalProps {
  visible: boolean;
  document: LegalDocument | null;
  onClose: () => void;
  onDownloadAndOpen: (doc: LegalDocument) => Promise<void>;
}

export function LawPdfViewerModal({
  visible,
  document,
  onClose,
  onDownloadAndOpen,
}: LawPdfViewerModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { isDark } = useAppTheme();
  const locale = useLocaleStore((s) => s.locale);

  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!visible || !document) return null;

  const resolvedUrl = resolveMediaUrl(document.pdfUrl) || document.pdfUrl;
  const docTitle =
    locale === 'am'
      ? document.titleAm || document.titleEn
      : document.titleEn || document.titleAm;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await onDownloadAndOpen(document);
    } finally {
      setIsDownloading(false);
    }
  };

  // Google Docs viewer URL for embedded rendering, or direct on iOS
  const viewerUrl =
    Platform.OS === 'android'
      ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(resolvedUrl)}`
      : resolvedUrl;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        className={cn('flex-1 bg-white dark:bg-slate-900', isDark && 'dark')}
      >
        {/* HEADER BAR */}
        <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center gap-2">
              <Badge
                label={`${locale === 'am' ? 'ቁ.' : 'No.'} ${document.documentNumber}`}
                tone="brand"
              />
              {document.yearIssued && (
                <AppText variant="caption">{document.yearIssued}</AppText>
              )}
            </View>
            <AppText
              className="mt-1 font-bold text-slate-900 dark:text-slate-50"
              numberOfLines={1}
            >
              {docTitle}
            </AppText>
          </View>

          <View className="flex-row items-center gap-1">
            {/* Download & Open in System Reader */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('laws.download', { defaultValue: 'Download' })}
              onPress={handleDownload}
              className="rounded-lg p-2 active:bg-slate-100 dark:active:bg-slate-800"
            >
              <Download size={20} color={colors.primary} />
            </Pressable>

            {/* Close Modal */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close', { defaultValue: 'Close' })}
              onPress={onClose}
              className="rounded-lg p-2 active:bg-slate-100 dark:active:bg-slate-800"
            >
              <X size={22} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* QUICK ACTION BAR */}
        <View className="flex-row items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2 dark:border-slate-800/80 dark:bg-slate-950/40">
          <AppText variant="caption" className="flex-1 text-slate-500">
            {document.fileName}
          </AppText>

          <Button
            title={
              isDownloading
                ? t('common.loading', { defaultValue: 'Loading…' })
                : t('laws.share', { defaultValue: 'Open in App' })
            }
            variant="secondary"
            size="sm"
            loading={isDownloading}
            icon={<ExternalLink size={14} color={colors.primary} />}
            onPress={handleDownload}
          />
        </View>

        {/* WEBVIEW PDF VIEWER */}
        <View className="relative flex-1 bg-slate-100 dark:bg-slate-950">
          {isLoading && (
            <View className="absolute inset-0 z-10 items-center justify-center bg-white/80 dark:bg-slate-900/80">
              <ActivityIndicator size="large" color={colors.primary} />
              <AppText variant="caption" className="mt-2 text-slate-500">
                {t('common.loading', { defaultValue: 'Loading…' })}
              </AppText>
            </View>
          )}

          <WebView
            source={{ uri: viewerUrl }}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            scalesPageToFit
            className="flex-1"
          />
        </View>
      </View>
    </Modal>
  );
}
