import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Download,
  FolderDown,
  HardDrive,
  PlayCircle,
  RefreshCw,
  Square,
  Trash2,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { AppText, Badge, Button, Card, ProgressBar } from '@/components/ui';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { palette, useThemeColors } from '@/core/theme/colors';
import { Alert } from '@/core/utils/alert';
import { formatFileSize } from '@/core/utils/formatters';

import type { ApiCourseDetail } from '../../courses/types/course.types';
import { offlineDb } from '../offline-db';
import { useOfflineStore } from '../offline-store';

export interface OfflineDownloadCardProps {
  courseId: string;
  enrolled: boolean;
  course?: ApiCourseDetail;
}

export function OfflineDownloadCard({ courseId, enrolled, course }: OfflineDownloadCardProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const online = useIsOnline();

  const init = useOfflineStore((s) => s.init);
  const downloadedCourses = useOfflineStore((s) => s.downloadedCourses);
  const downloads = useOfflineStore((s) => s.downloads);
  const isSyncing = useOfflineStore((s) => s.isSyncing);
  const startDownload = useOfflineStore((s) => s.startDownload);
  const cancelDownload = useOfflineStore((s) => s.cancelDownload);
  const removeDownload = useOfflineStore((s) => s.removeDownload);

  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [showModuleSelector, setShowModuleSelector] = useState(false);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    let mounted = true;
    void offlineDb.getPendingCountForCourse(courseId).then((count) => {
      if (mounted) setPendingSyncCount(count);
    });
    return () => {
      mounted = false;
    };
  }, [courseId, isSyncing]);

  if (!enrolled) {
    return null;
  }

  const downloadedCourse = downloadedCourses.find((c) => c.id === courseId);
  const isDownloaded = Boolean(downloadedCourse);
  const progress = downloads[courseId];
  const isDownloading = progress?.status === 'downloading';
  const isError = progress?.status === 'error';

  const handleStartDownloadAll = () => {
    if (!online) {
      Alert.alert(t('common.offline'), t('common.offlineAction'));
      return;
    }
    void startDownload(courseId);
  };

  const handleStartDownloadModule = (moduleId: string) => {
    if (!online) {
      Alert.alert(t('common.offline'), t('common.offlineAction'));
      return;
    }
    void startDownload(courseId, { moduleIds: [moduleId] });
  };

  const handleStartDownloadSelected = () => {
    if (!online) {
      Alert.alert(t('common.offline'), t('common.offlineAction'));
      return;
    }
    if (selectedModuleIds.length === 0) {
      Alert.alert(t('offline.selectModule', { defaultValue: 'Select Modules' }), t('offline.selectModuleHint', { defaultValue: 'Please select at least one module to download.' }));
      return;
    }
    void startDownload(courseId, { moduleIds: selectedModuleIds });
  };

  const toggleSelectModule = (moduleId: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId],
    );
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

  // State 1: Syncing
  if (isSyncing || (online && pendingSyncCount > 0 && isDownloaded)) {
    return (
      <Card className="gap-3 border-sky-800/40 bg-sky-950/20 p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <ActivityIndicator size="small" color="#38bdf8" />
            <AppText className="text-base font-bold text-sky-200">
              {t('courses.syncing', { defaultValue: 'Syncing Offline Progress…' })}
            </AppText>
          </View>
          <Badge label="Syncing" tone="brand" />
        </View>
        <AppText className="text-sm text-slate-300 leading-5">
          {t('courses.syncingDescription', {
            defaultValue:
              'Uploading recorded offline quiz attempts and study time to the server for verification.',
          })}
        </AppText>
      </Card>
    );
  }

  // State 2: Downloading with progress
  if (isDownloading) {
    return (
      <Card className="gap-3 border-brand-500/40 bg-brand-950/20 p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <Download size={20} color={palette.brand500} />
            <AppText className="text-base font-bold text-white">
              {t('courses.downloading', { defaultValue: 'Downloading for Offline' })}
            </AppText>
          </View>
          <Badge label={`${Math.round(progress.percent)}%`} tone="brand" />
        </View>

        <ProgressBar percent={progress.percent} tone="brand" />

        <View className="flex-row items-center justify-between pt-1">
          <AppText className="flex-1 text-xs text-slate-300">
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

  // State 3: Available Offline
  if (isDownloaded && downloadedCourse) {
    return (
      <Card className="gap-3.5 border-emerald-500/30 bg-emerald-950/15 p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1">
            <View className="h-8 w-8 rounded-full bg-emerald-500/20 items-center justify-center">
              <CheckCircle2 size={18} color="#10b981" />
            </View>
            <View className="flex-1">
              <AppText className="text-base font-bold text-emerald-200">
                {t('courses.availableOffline', { defaultValue: 'Available Offline' })}
              </AppText>
              {downloadedCourse.sizeBytes > 0 ? (
                <AppText className="text-xs text-slate-400">
                  {formatFileSize(downloadedCourse.sizeBytes)} stored on device
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
        </View>
        <AppText className="text-xs text-slate-400 leading-4">
          All downloaded lessons, attached documents, and quizzes are ready for offline learning.
        </AppText>
        
        {/* Quick actions for downloaded course */}
        <View className="flex-row items-center gap-2 pt-1">
          <View className="flex-1">
            <Button
              title={t('offline.viewMyDownloads', { defaultValue: 'View in My Downloads' })}
              variant="primary"
              size="sm"
              icon={<PlayCircle size={16} color="#fff" />}
              onPress={() => router.push('/downloads')}
              fullWidth
            />
          </View>
          <Button
            title={t('offline.updateContent', { defaultValue: 'Update' })}
            variant="outline"
            size="sm"
            icon={<RefreshCw size={14} color={colors.primary} />}
            onPress={handleStartDownloadAll}
          />
        </View>
      </Card>
    );
  }

  // State 4: Download failed / Retry
  if (isError) {
    return (
      <Card className="gap-3 border-red-500/40 bg-red-950/20 p-4">
        <View className="flex-row items-center gap-2.5">
          <View className="h-8 w-8 rounded-full bg-red-500/20 items-center justify-center">
            <AlertCircle size={18} color={colors.danger} />
          </View>
          <View className="flex-1">
            <AppText className="text-base font-bold text-red-200">
              {t('courses.downloadFailed', { defaultValue: 'Download Failed' })}
            </AppText>
            <AppText className="text-xs text-slate-300 mt-0.5">
              {progress?.error ||
                t('courses.downloadFailedHint', {
                  defaultValue: 'An error occurred during download. Please check your connection and retry.',
                })}
            </AppText>
          </View>
        </View>
        <View className="flex-row items-center gap-2 pt-1">
          <Button
            title={t('common.retry', { defaultValue: 'Retry Download' })}
            size="sm"
            variant="primary"
            onPress={handleStartDownloadAll}
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

  // State 5: Download Available Content (Full Download + Selective Module Download)
  const modules = course?.modules ?? [];

  return (
    <Card className="gap-3.5 border border-brand-500/30 bg-brand-950/20 p-4">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <View className="h-8 w-8 rounded-full bg-brand-500/20 items-center justify-center">
            <Download size={18} color="#38bdf8" />
          </View>
          <AppText className="text-base font-bold text-white">
            {t('courses.downloadAvailableContent', { defaultValue: 'Offline Learning & Downloads' })}
          </AppText>
        </View>
        <Badge label="Offline Ready" tone="brand" />
      </View>

      <AppText className="text-[14px] text-slate-300 leading-relaxed font-normal">
        {t('courses.downloadAvailableHint', {
          defaultValue:
            'Download eligible content to study offline without internet. Choose to download all or select specific modules below.',
        })}
      </AppText>

      {/* Main Download All Button */}
      <Button
        title={t('offline.downloadAll', { defaultValue: 'Download All (Entire Course)' })}
        variant="primary"
        icon={<Download size={16} color="#fff" />}
        onPress={handleStartDownloadAll}
        fullWidth
      />

      {/* Selective Module Download Toggle */}
      {modules.length > 0 && (
        <View className="border-t border-slate-800/80 pt-3 gap-2.5">
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowModuleSelector((prev) => !prev)}
            className="flex-row items-center justify-between py-1"
          >
            <View className="flex-row items-center gap-2">
              <FolderDown size={16} color={palette.brand500} />
              <AppText className="text-sm font-semibold text-slate-200">
                {t('offline.selectModules', { defaultValue: 'Select Specific Modules to Download' })}
              </AppText>
            </View>
            {showModuleSelector ? (
              <ChevronDown size={18} color={colors.textMuted} />
            ) : (
              <ChevronRight size={18} color={colors.textMuted} />
            )}
          </Pressable>

          {showModuleSelector && (
            <View className="gap-2 pt-1">
              <AppText variant="caption" className="text-slate-400">
                Tap a module to select, or download individual modules directly:
              </AppText>

              {modules.map((m, idx) => {
                const isSelected = selectedModuleIds.includes(m.id);
                const title = m.title ?? m.titleEn ?? `Module ${idx + 1}`;
                const lessonCount = m.lessons?.length ?? 0;

                return (
                  <View
                    key={m.id}
                    className="flex-row items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800"
                  >
                    <Pressable
                      onPress={() => toggleSelectModule(m.id)}
                      className="flex-row items-center gap-2.5 flex-1 pr-2"
                    >
                      {isSelected ? (
                        <CheckSquare size={18} color={palette.brand500} />
                      ) : (
                        <Square size={18} color={colors.textMuted} />
                      )}
                      <View className="flex-1">
                        <AppText className="text-sm font-semibold text-white" numberOfLines={1}>
                          {title}
                        </AppText>
                        <AppText variant="caption">
                          {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
                        </AppText>
                      </View>
                    </Pressable>

                    <Button
                      title={`Download`}
                      size="sm"
                      variant="outline"
                      icon={<Download size={14} color={colors.primary} />}
                      onPress={() => handleStartDownloadModule(m.id)}
                    />
                  </View>
                );
              })}

              {selectedModuleIds.length > 0 && (
                <Button
                  title={`Download Selected (${selectedModuleIds.length} Modules)`}
                  size="sm"
                  variant="primary"
                  icon={<Download size={16} color="#fff" />}
                  onPress={handleStartDownloadSelected}
                  fullWidth
                />
              )}
            </View>
          )}
        </View>
      )}

      {/* Link to My Downloads */}
      <Pressable
        onPress={() => router.push('/downloads')}
        className="flex-row items-center justify-center gap-2 pt-1 py-1.5"
      >
        <HardDrive size={15} color={colors.textMuted} />
        <AppText className="text-xs font-semibold text-sky-400">
          {t('offline.openMyDownloads', { defaultValue: 'View My Downloaded Files & Recordings' })}
        </AppText>
        <ArrowRight size={14} color="#38bdf8" />
      </Pressable>
    </Card>
  );
}
