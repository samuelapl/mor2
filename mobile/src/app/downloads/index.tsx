import React, { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ChevronRight,
  DownloadCloud,
  HardDrive,
  PlayCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';

import { AppText, Badge, Button, Card, Screen, Skeleton } from '@/components/ui';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { palette, useThemeColors } from '@/core/theme/colors';
import { downloadAndOpen } from '@/features/classroom/utils/open-file';
import { useMyEnrollments } from '@/features/courses';
import { useOfflineStore, type OfflineCourse } from '@/features/offline';
import {
  DownloadedCourseCard,
  formatBytes,
} from '@/features/offline/components/DownloadedCourseCard';
import { useCourseProgress } from '@/features/progress';
import { syncOfflineProgress } from '@/features/offline/offline-sync';
import { Directory, File, Paths } from 'expo-file-system';

export default function DownloadsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const online = useIsOnline();

  const { downloadedCourses, init, refresh, removeDownload, isInitialized } = useOfflineStore();

  const [loading, setLoading] = useState(!isInitialized);
  const [syncing, setSyncing] = useState(false);
  const [offlineRecordings, setOfflineRecordings] = useState<
    Array<{ name: string; uri: string; size: number }>
  >([]);

  // Load offline courses & recordings
  const loadData = useCallback(async () => {
    try {
      await init();

      // Scan for downloaded recordings
      try {
        const recordingsDir = new Directory(Paths.document, 'offline_recordings');
        if (recordingsDir.exists) {
          const contents = recordingsDir.list();
          const recs: Array<{ name: string; uri: string; size: number }> = [];
          for (const item of contents) {
            if (item instanceof File && item.name.endsWith('.mp4')) {
              recs.push({
                name: item.name,
                uri: item.uri,
                size: item.size ?? 0,
              });
            }
          }
          setOfflineRecordings(recs);
        }
      } catch (recErr) {
        console.warn('[DownloadsScreen] Error listing recordings:', recErr);
      }
    } finally {
      setLoading(false);
    }
  }, [init]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Remove a course from offline storage
  const handleRemoveCourse = (course: OfflineCourse) => {
    Alert.alert(
      t('offline.removeTitle', { defaultValue: 'Remove Download' }),
      t('offline.removeConfirm', {
        defaultValue:
          'Are you sure you want to remove {{title}} from your device? Downloaded lessons and files will be deleted.',
        title: course.title,
      }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('common.remove', { defaultValue: 'Remove' }),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeDownload(course.id);
              await refresh();
            } catch (err: any) {
              Alert.alert(t('common.somethingWrong', { defaultValue: 'Error' }), err?.message);
            }
          },
        },
      ],
    );
  };

  // Remove a downloaded recording
  const handleRemoveRecording = (rec: { name: string; uri: string }) => {
    Alert.alert(
      t('offline.removeRecordingTitle', { defaultValue: 'Remove Recording' }),
      t('offline.removeRecordingConfirm', {
        defaultValue: 'Delete {{name}} from device storage?',
        name: rec.name,
      }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('common.remove', { defaultValue: 'Remove' }),
          style: 'destructive',
          onPress: async () => {
            try {
              const file = new File(new Directory(Paths.document, 'offline_recordings'), rec.name);
              if (file.exists) file.delete();
              setOfflineRecordings((prev) => prev.filter((r) => r.uri !== rec.uri));
            } catch (err: any) {
              Alert.alert(t('common.somethingWrong', { defaultValue: 'Error' }), err?.message);
            }
          },
        },
      ],
    );
  };

  // Manual Sync trigger
  const handleManualSync = async () => {
    if (!online) {
      Alert.alert(
        t('common.offline', { defaultValue: 'Offline' }),
        t('offline.syncOfflineNotice', {
          defaultValue: 'Internet connection is required to sync offline progress.',
        }),
      );
      return;
    }
    setSyncing(true);
    try {
      const res = await syncOfflineProgress();
      Alert.alert(
        t('offline.syncCompleted', { defaultValue: 'Sync Complete' }),
        t('offline.syncSuccessBody', {
          defaultValue: 'Synced {{lessons}} lesson progress updates and {{quizzes}} quiz attempts.',
          lessons: res.syncedProgress,
          quizzes: res.syncedQuizzes,
        }),
      );
      await refresh();
    } catch (err: any) {
      Alert.alert(t('common.somethingWrong', { defaultValue: 'Sync Failed' }), err?.message);
    } finally {
      setSyncing(false);
    }
  };

  // Enrolled courses not on the phone yet. Offline download is OPEN-progression only, and the
  // mode is platform-wide, so one course's progress tells us whether to offer it at all.
  const enrollments = useMyEnrollments();
  const downloadedIds = new Set(downloadedCourses.map((c) => c.id));
  const notDownloaded = (enrollments.data ?? []).filter(
    (e) => e.status !== 'DROPPED' && !downloadedIds.has(e.courseId),
  );
  const modeProbe = useCourseProgress(enrollments.data?.[0]?.courseId);
  const canDownload = modeProbe.data?.progressionMode === 'OPEN';

  const totalBytes =
    downloadedCourses.reduce((sum, c) => sum + (c.sizeBytes || 0), 0) +
    offlineRecordings.reduce((sum, r) => sum + r.size, 0);

  if (loading) {
    return (
      <Screen>
        <Card className="gap-3 p-4">
          <Skeleton className="h-6 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
          <Skeleton className="h-10 w-full rounded" />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="gap-4 p-4 pb-12">
      {/* Storage Summary Card */}
      <Card className="gap-3 border-brand-200 bg-brand-50/60 p-4 dark:border-slate-700 dark:bg-slate-800">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40">
              <HardDrive size={20} color={colors.primary} />
            </View>
            <View>
              <AppText className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                {t('offline.offlineStorage', { defaultValue: 'Offline Storage' })}
              </AppText>
              <AppText className="text-lg font-bold text-slate-900 dark:text-white">
                {formatBytes(totalBytes)}
              </AppText>
            </View>
          </View>

          <Button
            title={
              syncing
                ? t('common.syncing', { defaultValue: 'Syncing...' })
                : t('common.sync', { defaultValue: 'Sync' })
            }
            size="sm"
            variant="outline"
            icon={<RefreshCw size={14} color={colors.primary} />}
            onPress={handleManualSync}
            disabled={syncing}
          />
        </View>

        <View className="flex-row items-center justify-between border-t border-brand-100 pt-2.5 dark:border-slate-700/60">
          <AppText variant="caption">
            {downloadedCourses.length}{' '}
            {t('offline.coursesDownloaded', { defaultValue: 'courses available offline' })}
          </AppText>
          <Badge
            label={
              online
                ? t('common.online', { defaultValue: 'Online' })
                : t('common.offline', { defaultValue: 'Offline' })
            }
            tone={online ? 'success' : 'warning'}
          />
        </View>
      </Card>

      {/* No Downloads Empty State */}
      {downloadedCourses.length === 0 && offlineRecordings.length === 0 ? (
        <Card className="items-center gap-3 p-8 text-center">
          <View className="mb-1 h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <DownloadCloud size={32} color={colors.textMuted} />
          </View>
          <AppText className="text-center text-base font-bold text-slate-900 dark:text-white">
            {t('offline.noDownloadsTitle', { defaultValue: 'No Offline Content Yet' })}
          </AppText>
          <AppText variant="muted" className="px-4 text-center">
            {t('offline.noDownloadsBody', {
              defaultValue:
                'Download course content to study lessons, read PDFs, and take quizzes without an internet connection.',
            })}
          </AppText>
          <Button
            title={t('offline.browseCourses', { defaultValue: 'Browse Courses' })}
            variant="primary"
            onPress={() => router.push('/(tabs)/catalog' as any)}
          />
        </Card>
      ) : (
        <View className="gap-3">
          <AppText variant="heading">
            {t('screens.downloads', { defaultValue: 'Downloaded Courses' })}
          </AppText>

          {downloadedCourses.map((c, index) => (
            <DownloadedCourseCard
              key={c.id}
              course={c}
              defaultOpen={index === 0}
              onRemove={() => handleRemoveCourse(c)}
            />
          ))}
        </View>
      )}

      {/* Enrolled courses that can still be downloaded */}
      {online && canDownload && notDownloaded.length > 0 ? (
        <View className="gap-2.5">
          <AppText variant="heading">{t('offline.availableToDownload')}</AppText>
          {notDownloaded.map((e) => (
            <Pressable
              key={e.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/course/[courseId]', params: { courseId: e.courseId } })
              }
              className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 active:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:active:bg-slate-800"
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/30">
                <DownloadCloud size={20} color="#0284c7" />
              </View>
              <View className="flex-1">
                <AppText
                  className="text-sm font-semibold text-slate-900 dark:text-white"
                  numberOfLines={1}
                >
                  {e.course.title ?? e.course.titleEn ?? e.course.code}
                </AppText>
                <AppText variant="caption">{e.course.code}</AppText>
              </View>
              {e.status === 'COMPLETED' ? (
                <Badge label={t('offline.passed')} tone="success" />
              ) : null}
              <ChevronRight size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Saved Live Recordings */}
      {offlineRecordings.length > 0 && (
        <View className="mt-2 gap-3">
          <AppText variant="heading">
            {t('offline.savedRecordings', { defaultValue: 'Saved Live Recordings' })}
          </AppText>
          {offlineRecordings.map((rec) => (
            <Card key={rec.uri} className="flex-row items-center justify-between p-3.5">
              <View className="flex-1 flex-row items-center gap-3 pr-2">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/40">
                  <PlayCircle size={22} color={palette.brand600} />
                </View>
                <View className="flex-1">
                  <AppText
                    className="text-sm font-semibold text-slate-900 dark:text-white"
                    numberOfLines={1}
                  >
                    {rec.name}
                  </AppText>
                  <AppText variant="caption">{formatBytes(rec.size)} · MP4 Video</AppText>
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <Button
                  title={t('common.play', { defaultValue: 'Play' })}
                  size="sm"
                  variant="outline"
                  onPress={() =>
                    void downloadAndOpen({
                      url: rec.uri,
                      fileName: rec.name,
                      mimeType: 'video/mp4',
                    })
                  }
                />
                <Pressable
                  onPress={() => handleRemoveRecording(rec)}
                  className="rounded-lg bg-red-50 p-2 active:opacity-70 dark:bg-red-950/40"
                  accessibilityRole="button"
                  accessibilityLabel="Delete recording"
                >
                  <Trash2 size={16} color={palette.danger} />
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
