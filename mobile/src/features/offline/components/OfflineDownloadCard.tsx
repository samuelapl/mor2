import { AlertCircle, CheckCircle2, Download, Trash2 } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Badge, Button, Card, ProgressBar } from '@/components/ui';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { palette, useThemeColors } from '@/core/theme/colors';
import { Alert } from '@/core/utils/alert';
import { formatFileSize } from '@/core/utils/formatters';

import { useOfflineStore } from '../offline-store';

export interface OfflineDownloadCardProps {
  courseId: string;
  enrolled: boolean;
}

export function OfflineDownloadCard({ courseId, enrolled }: OfflineDownloadCardProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const online = useIsOnline();

  const init = useOfflineStore((s) => s.init);
  const downloadedCourses = useOfflineStore((s) => s.downloadedCourses);
  const downloads = useOfflineStore((s) => s.downloads);
  const startDownload = useOfflineStore((s) => s.startDownload);
  const cancelDownload = useOfflineStore((s) => s.cancelDownload);
  const removeDownload = useOfflineStore((s) => s.removeDownload);

  useEffect(() => {
    void init();
  }, [init]);

  if (!enrolled) {
    return null;
  }

  const downloadedCourse = downloadedCourses.find((c) => c.id === courseId);
  const isDownloaded = Boolean(downloadedCourse);
  const progress = downloads[courseId];
  const isDownloading = progress?.status === 'downloading';
  const isError = progress?.status === 'error';

  const handleStartDownload = () => {
    if (!online) {
      Alert.alert(t('common.offline'), t('common.offlineAction'));
      return;
    }
    void startDownload(courseId);
  };

  const handleRemove = () => {
    Alert.alert(
      t('courses.removeDownloadTitle', { defaultValue: 'Remove Download' }),
      t('courses.removeDownloadConfirm', {
        defaultValue: 'Are you sure you want to delete downloaded offline content for this course?',
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: 'Delete' }),
          style: 'destructive',
          onPress: () => void removeDownload(courseId),
        },
      ],
    );
  };

  // State 1: Downloading
  if (isDownloading) {
    return (
      <Card className="gap-3 border-brand-200 bg-brand-50/50 dark:border-brand-900/60 dark:bg-brand-950/30">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Download size={18} color={palette.brand600} />
            <AppText className="font-semibold text-brand-900 dark:text-brand-300">
              {t('courses.downloading', { defaultValue: 'Downloading for Offline' })}
            </AppText>
          </View>
          <Badge label={`${Math.round(progress.percent)}%`} tone="brand" />
        </View>

        <ProgressBar percent={progress.percent} tone="brand" />

        <View className="flex-row items-center justify-between">
          <AppText variant="caption" className="flex-1 text-slate-600 dark:text-slate-400">
            {progress.currentStep ||
              (progress.totalBytes > 0
                ? `${formatFileSize(progress.downloadedBytes)} / ${formatFileSize(progress.totalBytes)}`
                : t('courses.downloadingMedia', { defaultValue: 'Saving course content…' }))}
          </AppText>
          <Button
            title={t('common.cancel')}
            variant="ghost"
            size="sm"
            onPress={() => cancelDownload(courseId)}
          />
        </View>
      </Card>
    );
  }

  // State 2: Downloaded
  if (isDownloaded && downloadedCourse) {
    return (
      <Card className="flex-row items-center justify-between gap-3 border-green-200 bg-green-50/50 dark:border-green-900/60 dark:bg-green-950/20">
        <View className="flex-1 flex-row items-center gap-3">
          <CheckCircle2 size={22} color={colors.success} />
          <View className="flex-1">
            <AppText className="font-semibold text-green-900 dark:text-green-300">
              {t('courses.availableOffline', { defaultValue: 'Downloaded for Offline' })}
            </AppText>
            {downloadedCourse.sizeBytes > 0 ? (
              <AppText variant="caption" className="text-slate-500 dark:text-slate-400">
                {formatFileSize(downloadedCourse.sizeBytes)}
              </AppText>
            ) : null}
          </View>
        </View>
        <Button
          title={t('courses.removeDownload', { defaultValue: 'Remove' })}
          variant="outline"
          size="sm"
          icon={<Trash2 size={14} color={colors.danger} />}
          onPress={handleRemove}
        />
      </Card>
    );
  }

  // State 3: Error state
  if (isError) {
    return (
      <Card className="gap-2 border-red-200 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20">
        <View className="flex-row items-center gap-2">
          <AlertCircle size={18} color={colors.danger} />
          <AppText className="font-semibold text-red-900 dark:text-red-300">
            {t('courses.downloadFailed', { defaultValue: 'Download Failed' })}
          </AppText>
        </View>
        <AppText variant="caption" className="text-slate-600 dark:text-slate-400">
          {progress?.error || t('courses.downloadFailedHint', { defaultValue: 'Please try again.' })}
        </AppText>
        <View className="flex-row gap-2 pt-1">
          <Button
            title={t('common.retry', { defaultValue: 'Retry' })}
            size="sm"
            variant="outline"
            onPress={handleStartDownload}
          />
          <Button
            title={t('common.dismiss', { defaultValue: 'Dismiss' })}
            size="sm"
            variant="ghost"
            onPress={() => cancelDownload(courseId)}
          />
        </View>
      </Card>
    );
  }

  // State 4: Not downloaded (Explicit download trigger)
  return (
    <Card className="flex-row items-center justify-between gap-3">
      <View className="flex-1">
        <AppText className="font-semibold text-slate-900 dark:text-slate-100">
          {t('courses.offlineLearning', { defaultValue: 'Offline Learning' })}
        </AppText>
        <AppText variant="caption">
          {t('courses.offlineHint', {
            defaultValue: 'Download lessons & quizzes to learn without internet.',
          })}
        </AppText>
      </View>
      <Button
        title={t('courses.downloadOffline', { defaultValue: 'Download' })}
        variant="secondary"
        size="sm"
        icon={<Download size={16} color={palette.brand600} />}
        onPress={handleStartDownload}
      />
    </Card>
  );
}
