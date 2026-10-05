import React, { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  DownloadCloud,
  FileText,
  HardDrive,
  HelpCircle,
  PlayCircle,
  RefreshCw,
  Trash2,
  Video,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';

import { AppText, Badge, Button, Card, Screen, Skeleton } from '@/components/ui';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { palette, useThemeColors } from '@/core/theme/colors';
import { formatDate } from '@/core/utils/formatters';
import { downloadAndOpen } from '@/features/classroom/utils/open-file';
import {
  offlineDb,
  useOfflineStore,
  type OfflineAssessment,
  type OfflineAttachment,
  type OfflineCourse,
  type OfflineLesson,
  type OfflineModule,
} from '@/features/offline';
import { syncOfflineProgress } from '@/features/offline/offline-sync';
import { Directory, File, Paths } from 'expo-file-system';

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface CourseDetailsState {
  modules: OfflineModule[];
  lessons: OfflineLesson[];
  attachments: OfflineAttachment[];
  assessments: OfflineAssessment[];
}

export default function DownloadsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const online = useIsOnline();

  const {
    downloadedCourses,
    init,
    refresh,
    removeDownload,
    isInitialized,
  } = useOfflineStore();

  const [loading, setLoading] = useState(!isInitialized);
  const [syncing, setSyncing] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [courseDetails, setCourseDetails] = useState<Record<string, CourseDetailsState>>({});
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

  // Load details (modules, lessons, files) when a course is expanded
  const handleToggleExpand = async (courseId: string) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      return;
    }

    setExpandedCourseId(courseId);

    if (!courseDetails[courseId]) {
      try {
        const [modules, lessons, assessments] = await Promise.all([
          offlineDb.getModulesForCourse(courseId),
          offlineDb.getLessonsForCourse(courseId),
          offlineDb.getAssessmentsForCourse(courseId),
        ]);

        const lessonAttachments = await Promise.all(
          lessons.map((l) => offlineDb.getAttachmentsForLesson(l.id)),
        );
        const attachments = lessonAttachments.flat();

        setCourseDetails((prev) => ({
          ...prev,
          [courseId]: { modules, lessons, attachments, assessments },
        }));
      } catch (err) {
        console.warn(`[DownloadsScreen] Failed loading details for ${courseId}:`, err);
      }
    }
  };

  // Open an offline file attachment
  const handleOpenAttachment = async (att: OfflineAttachment) => {
    try {
      await downloadAndOpen({
        url: att.localFileUri || att.fileUrl,
        fileName: att.fileName || 'document.pdf',
        mimeType: att.fileType || 'application/pdf',
      });
    } catch (err: any) {
      Alert.alert(
        t('common.somethingWrong', { defaultValue: 'Could not open file' }),
        err?.message || 'File cannot be opened on this device.',
      );
    }
  };

  // Remove a course from offline storage
  const handleRemoveCourse = (course: OfflineCourse) => {
    Alert.alert(
      t('offline.removeTitle', { defaultValue: 'Remove Download' }),
      t('offline.removeConfirm', {
        defaultValue: 'Are you sure you want to remove {{title}} from your device? Downloaded lessons and files will be deleted.',
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
      <Card className="p-4 gap-3 bg-brand-50/60 dark:bg-slate-800 border-brand-200 dark:border-slate-700">
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
            title={syncing ? t('common.syncing', { defaultValue: 'Syncing...' }) : t('common.sync', { defaultValue: 'Sync' })}
            size="sm"
            variant="outline"
            icon={<RefreshCw size={14} color={colors.primary} />}
            onPress={handleManualSync}
            disabled={syncing}
          />
        </View>

        <View className="flex-row items-center justify-between border-t border-brand-100 dark:border-slate-700/60 pt-2.5">
          <AppText variant="caption">
            {downloadedCourses.length} {t('offline.coursesDownloaded', { defaultValue: 'courses available offline' })}
          </AppText>
          <Badge
            label={online ? t('common.online', { defaultValue: 'Online' }) : t('common.offline', { defaultValue: 'Offline' })}
            tone={online ? 'success' : 'warning'}
          />
        </View>
      </Card>

      {/* No Downloads Empty State */}
      {downloadedCourses.length === 0 && offlineRecordings.length === 0 ? (
        <Card className="items-center p-8 gap-3 text-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-1">
            <DownloadCloud size={32} color={colors.textMuted} />
          </View>
          <AppText className="text-base font-bold text-slate-900 dark:text-white text-center">
            {t('offline.noDownloadsTitle', { defaultValue: 'No Offline Content Yet' })}
          </AppText>
          <AppText variant="muted" className="text-center px-4">
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

          {downloadedCourses.map((c) => {
            const isExpanded = expandedCourseId === c.id;
            const details = courseDetails[c.id];

            return (
              <Card key={c.id} className="gap-3 p-4">
                {/* Course Header */}
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Badge label={c.code} tone="brand" />
                      <Badge label={formatBytes(c.sizeBytes)} tone="neutral" />
                    </View>
                    <AppText className="text-base font-bold text-slate-900 dark:text-white">
                      {c.title}
                    </AppText>
                    <AppText variant="caption" className="mt-1">
                      {t('offline.downloadedOn', { defaultValue: 'Downloaded' })}: {formatDate(new Date(c.downloadedAt).toISOString(), 'en')}
                    </AppText>
                  </View>

                  <Pressable
                    onPress={() => handleRemoveCourse(c)}
                    className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 active:opacity-70"
                    accessibilityRole="button"
                    accessibilityLabel="Delete download"
                  >
                    <Trash2 size={18} color={palette.danger} />
                  </Pressable>
                </View>

                {/* Course Action Buttons */}
                <View className="flex-row items-center gap-2 pt-2">
                  <View className="flex-1">
                    <Button
                      title={t('courses.continueLearning', { defaultValue: 'Study Offline' })}
                      size="sm"
                      variant="primary"
                      icon={<BookOpen size={16} color="#ffffff" />}
                      onPress={() => router.push(`/course/${c.id}` as any)}
                      fullWidth
                    />
                  </View>
                  <Button
                    title={isExpanded ? t('common.hide', { defaultValue: 'Hide' }) : t('offline.viewFiles', { defaultValue: 'Files' })}
                    size="sm"
                    variant="outline"
                    icon={isExpanded ? <ChevronDown size={16} color={colors.primary} /> : <ChevronRight size={16} color={colors.primary} />}
                    onPress={() => void handleToggleExpand(c.id)}
                  />
                </View>

                {/* Expanded Course Files & Lessons Accordion */}
                {isExpanded && (
                  <View className="border-t border-slate-100 dark:border-slate-800 pt-3 gap-3">
                    {/* Offline Lessons */}
                    {details?.lessons && details.lessons.length > 0 && (
                      <View className="gap-2">
                        <AppText className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {t('course.lessons', { defaultValue: 'Downloaded Lessons' })} ({details.lessons.length})
                        </AppText>
                        <View className="gap-1.5">
                          {details.lessons.map((lesson) => (
                            <Pressable
                              key={lesson.id}
                              onPress={() => router.push(`/course/${c.id}/learn/${lesson.id}` as any)}
                              className="flex-row items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 active:bg-slate-100 dark:active:bg-slate-800"
                            >
                              <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                                {lesson.isCompleted === 1 ? (
                                  <CheckCircle2 size={16} color={palette.success} />
                                ) : lesson.localMediaUri ? (
                                  <Video size={16} color={colors.primary} />
                                ) : (
                                  <FileText size={16} color={colors.textMuted} />
                                )}
                                <AppText className="text-sm text-slate-800 dark:text-slate-200 flex-1" numberOfLines={1}>
                                  {lesson.title}
                                </AppText>
                              </View>
                              <ChevronRight size={16} color={colors.textMuted} />
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Local Document Attachments */}
                    {details?.attachments && details.attachments.length > 0 && (
                      <View className="gap-2">
                        <AppText className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {t('course.attachments', { defaultValue: 'Downloaded Documents' })} ({details.attachments.length})
                        </AppText>
                        <View className="gap-1.5">
                          {details.attachments.map((att) => (
                            <Pressable
                              key={att.id}
                              onPress={() => void handleOpenAttachment(att)}
                              className="flex-row items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 active:bg-slate-100 dark:active:bg-slate-800"
                            >
                              <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                                <FileText size={16} color={palette.brand600} />
                                <View className="flex-1">
                                  <AppText className="text-sm font-medium text-slate-800 dark:text-slate-200" numberOfLines={1}>
                                    {att.fileName}
                                  </AppText>
                                  {att.sizeBytes ? (
                                    <AppText variant="caption">
                                      {formatBytes(att.sizeBytes)}
                                    </AppText>
                                  ) : null}
                                </View>
                              </View>
                              <Badge label={t('common.open', { defaultValue: 'Open' })} tone="brand" />
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Offline Quizzes */}
                    {details?.assessments && details.assessments.length > 0 && (
                      <View className="gap-2">
                        <AppText className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {t('course.quizzes', { defaultValue: 'Available Quizzes' })} ({details.assessments.length})
                        </AppText>
                        <View className="gap-1.5">
                          {details.assessments.map((a) => (
                            <Pressable
                              key={a.id}
                              onPress={() => router.push(`/quiz/${a.id}` as any)}
                              className="flex-row items-center justify-between p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 active:bg-indigo-100/60"
                            >
                              <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                                <HelpCircle size={16} color={colors.primary} />
                                <View className="flex-1">
                                  <AppText className="text-sm font-medium text-slate-800 dark:text-slate-200" numberOfLines={1}>
                                    {a.title}
                                  </AppText>
                                  <AppText variant="caption">
                                    {t('quiz.passScore', { defaultValue: 'Pass mark' })}: {a.passingScore}%
                                  </AppText>
                                </View>
                              </View>
                              <Badge
                                label={t('classroom.takeQuiz', { defaultValue: 'Take assessment' })}
                                tone="brand"
                              />
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}

                    {!details && (
                      <View className="py-2 items-center">
                        <AppText variant="caption">{t('common.loading', { defaultValue: 'Loading files...' })}</AppText>
                      </View>
                    )}
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      )}

      {/* Saved Live Recordings */}
      {offlineRecordings.length > 0 && (
        <View className="gap-3 mt-2">
          <AppText variant="heading">
            {t('offline.savedRecordings', { defaultValue: 'Saved Live Recordings' })}
          </AppText>
          {offlineRecordings.map((rec) => (
            <Card key={rec.uri} className="flex-row items-center justify-between p-3.5">
              <View className="flex-row items-center gap-3 flex-1 pr-2">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/40">
                  <PlayCircle size={22} color={palette.brand600} />
                </View>
                <View className="flex-1">
                  <AppText className="text-sm font-semibold text-slate-900 dark:text-white" numberOfLines={1}>
                    {rec.name}
                  </AppText>
                  <AppText variant="caption">
                    {formatBytes(rec.size)} · MP4 Video
                  </AppText>
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <Button
                  title={t('common.play', { defaultValue: 'Play' })}
                  size="sm"
                  variant="outline"
                  onPress={() => void downloadAndOpen({ url: rec.uri, fileName: rec.name, mimeType: 'video/mp4' })}
                />
                <Pressable
                  onPress={() => handleRemoveRecording(rec)}
                  className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 active:opacity-70"
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
