import React from 'react';
import { View } from 'react-native';
import { Calendar, Download, Eye, FileText, Scale } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Badge, Button, Card } from '@/components/ui';
import { useLocaleStore } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';

import type { LegalDocument } from '../types/laws.types';
import { LAW_STATUS_CONFIG } from '../types/laws.types';

export interface LawDocumentCardProps {
  document: LegalDocument;
  onOpen: (doc: LegalDocument) => void;
  onDownload?: (doc: LegalDocument) => void;
  isOpenLoading?: boolean;
  isDownloadLoading?: boolean;
}

export function LawDocumentCard({
  document,
  onOpen,
  onDownload,
  isOpenLoading = false,
  isDownloadLoading = false,
}: LawDocumentCardProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);

  const statusCfg = LAW_STATUS_CONFIG[document.status] || LAW_STATUS_CONFIG.IN_FORCE;
  const statusLabel = locale === 'am' ? statusCfg.labelAm : statusCfg.labelEn;
  const statusTone = statusCfg.badgeVariant;

  const docTitle =
    locale === 'am'
      ? document.titleAm || document.titleEn
      : document.titleEn || document.titleAm;

  const docDesc =
    locale === 'am'
      ? document.descriptionAm || document.descriptionEn
      : document.descriptionEn || document.descriptionAm;

  const categoryName = document.category
    ? locale === 'am'
      ? document.category.nameAm || document.category.nameEn
      : document.category.nameEn || document.category.nameAm
    : null;

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="gap-3 p-4">
      {/* 1. Header Badges */}
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-row flex-wrap items-center gap-1.5">
          {/* Document Number */}
          <View className="flex-row items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 dark:bg-brand-950/40">
            <FileText size={12} color={colors.primary} />
            <AppText className="text-xs font-semibold text-brand-700 dark:text-brand-300">
              {locale === 'am' ? 'ቁ.' : 'No.'} {document.documentNumber}
            </AppText>
          </View>

          {/* Status Badge */}
          <Badge label={statusLabel} tone={statusTone} />
        </View>

        {/* Issued Year */}
        {document.yearIssued && (
          <View className="flex-row items-center gap-1">
            <Calendar size={12} color={colors.textMuted} />
            <AppText variant="caption">{document.yearIssued}</AppText>
          </View>
        )}
      </View>

      {/* 2. Main Content & Stamp */}
      <View className="flex-row items-start gap-3">
        {/* Negarit Stamp Icon Box */}
        <View className="h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-amber-300/80 bg-amber-50 p-1 dark:border-amber-800/60 dark:bg-amber-950/40">
          <Scale size={20} color={colors.warning} />
          <AppText
            numberOfLines={2}
            className="mt-0.5 text-center text-[8px] font-bold tracking-tight text-amber-900 dark:text-amber-200"
          >
            {locale === 'am' ? 'ነጋሪት ጋዜጣ' : 'NEGARIT GAZETA'}
          </AppText>
        </View>

        {/* Title and Description */}
        <View className="flex-1 gap-1">
          <AppText
            className="font-bold text-slate-900 dark:text-slate-50"
            numberOfLines={3}
          >
            {docTitle}
          </AppText>

          {Boolean(docDesc) && (
            <AppText
              variant="caption"
              className="text-slate-600 dark:text-slate-300"
              numberOfLines={2}
            >
              {docDesc}
            </AppText>
          )}
        </View>
      </View>

      {/* 3. Footer: Category & File Details */}
      <View className="flex-row items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
        <View className="flex-1 pr-2">
          {categoryName && (
            <AppText variant="caption" numberOfLines={1} className="text-slate-500">
              {categoryName}
            </AppText>
          )}
        </View>

        {Boolean(document.fileSize) && (
          <AppText variant="caption" className="font-mono text-slate-400">
            {formatFileSize(document.fileSize)}
          </AppText>
        )}
      </View>

      {/* 4. Action Buttons */}
      <View className="flex-row items-center gap-2 pt-1">
        <Button
          title={t('laws.open', { defaultValue: 'Open' })}
          variant="primary"
          size="sm"
          loading={isOpenLoading}
          icon={<Eye size={16} color="#ffffff" />}
          className="flex-1"
          onPress={() => onOpen(document)}
        />

        {onDownload && (
          <Button
            title={t('laws.download', { defaultValue: 'Download' })}
            variant="outline"
            size="sm"
            loading={isDownloadLoading}
            icon={<Download size={16} color={colors.text} />}
            className="flex-1"
            onPress={() => onDownload(document)}
          />
        )}
      </View>
    </Card>
  );
}
