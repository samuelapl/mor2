import { router } from 'expo-router';
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Download,
  DownloadCloud,
  FileText,
  FolderDown,
  HelpCircle,
  Lock,
  Paperclip,
  Trash2,
  Video,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText, Badge, Button, Card, ProgressBar } from '@/components/ui';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { palette, useThemeColors } from '@/core/theme/colors';
import { Alert } from '@/core/utils/alert';
import { formatFileSize } from '@/core/utils/formatters';
import type {
  ApiCourseDetail,
  ApiCourseLesson,
  ApiCourseModule,
} from '../../courses/types/course.types';
import { useCourse } from '../../courses';
import {
  useCourseProgress,
  type CourseProgress,
  type LessonProgress,
  type SubLessonProgress,
} from '@/features/progress';
import { offlineDb } from '../offline-db';
import { useOfflineStore } from '../offline-store';
import type { DownloadCourseOptions } from '../download-manager';

export interface OfflineDownloadCardProps {
  courseId: string;
  enrolled: boolean;
  courseDetail?: ApiCourseDetail | null;
  progress?: CourseProgress | null;
}

export function OfflineDownloadCard({
  courseId,
  enrolled,
  courseDetail: propCourseDetail,
  progress: propProgress,
}: OfflineDownloadCardProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const online = useIsOnline();

  // If courseDetail was not passed down, query it
  const courseQuery = useCourse(courseId);
  const courseDetail = propCourseDetail ?? courseQuery.data;

  // Query progress if not passed down as prop
  const progressQuery = useCourseProgress(courseId, enrolled && !propProgress);
  const progressData = propProgress ?? progressQuery.data;

  const init = useOfflineStore((s) => s.init);
  const downloadedCourses = useOfflineStore((s) => s.downloadedCourses);
  const downloads = useOfflineStore((s) => s.downloads);
  const isSyncing = useOfflineStore((s) => s.isSyncing);
  const startDownload = useOfflineStore((s) => s.startDownload);
  const cancelDownload = useOfflineStore((s) => s.cancelDownload);
  const removeDownload = useOfflineStore((s) => s.removeDownload);
  const removeModuleDownload = useOfflineStore((s) => s.removeModuleDownload);

  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Granular selection state
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set());
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<string>>(new Set());
  const [selectedSubLessonIds, setSelectedSubLessonIds] = useState<Set<string>>(new Set());
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<Set<string>>(new Set());

  // Accordion expansion state
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(new Set());

  // Progress maps for unlock verification
  const moduleProgress = useMemo(
    () => new Map(progressData?.modules?.map((m) => [m.moduleId, m])),
    [progressData],
  );

  const lessonProgress = useMemo(() => {
    const map = new Map<string, LessonProgress | SubLessonProgress>();
    progressData?.modules?.forEach((m) =>
      m.lessons?.forEach((l) => {
        map.set(l.lessonId, l);
        l.subLessons?.forEach((s) => map.set(s.lessonId, s));
      }),
    );
    return map;
  }, [progressData]);

  // Unlock verification checkers
  const isModuleUnlocked = useCallback(
    (mod: ApiCourseModule): boolean => {
      if (!enrolled) return false;
      const mp = moduleProgress.get(mod.id);
      if (mp) return mp.unlocked === true;
      return mod.unlocked === true;
    },
    [enrolled, moduleProgress],
  );

  const isLessonUnlocked = useCallback(
    (lesson: ApiCourseLesson, mod: ApiCourseModule): boolean => {
      if (!isModuleUnlocked(mod)) return false;
      const lp = lessonProgress.get(lesson.id);
      if (lp) return lp.unlocked === true;
      return lesson.unlocked === true;
    },
    [isModuleUnlocked, lessonProgress],
  );

  const isSubLessonUnlocked = useCallback(
    (sub: ApiCourseLesson, parentLesson: ApiCourseLesson, mod: ApiCourseModule): boolean => {
      if (!isLessonUnlocked(parentLesson, mod)) return false;
      const sp = lessonProgress.get(sub.id);
      if (sp) return sp.unlocked === true;
      return sub.unlocked === true;
    },
    [isLessonUnlocked, lessonProgress],
  );

  const isModuleAssessmentUnlocked = useCallback(
    (mod: ApiCourseModule): boolean => {
      return isModuleUnlocked(mod);
    },
    [isModuleUnlocked],
  );

  const isLessonAssessmentUnlocked = useCallback(
    (lesson: ApiCourseLesson, mod: ApiCourseModule): boolean => {
      return isLessonUnlocked(lesson, mod);
    },
    [isLessonUnlocked],
  );

  const isFinalAssessmentUnlocked = useCallback((): boolean => {
    if (!enrolled) return false;
    return progressData?.courseCompletion?.contentCompleted === true;
  }, [enrolled, progressData]);

  // Filter modules, lessons, and quizzes to UNLOCKED items only
  const unlockedModules = useMemo(() => {
    if (!courseDetail?.modules) return [];
    return courseDetail.modules
      .filter((mod) => isModuleUnlocked(mod))
      .map((mod) => {
        const filteredLessons = (mod.lessons ?? [])
          .filter((lesson) => isLessonUnlocked(lesson, mod))
          .map((lesson) => ({
            ...lesson,
            subLessons: (lesson.subLessons ?? []).filter((sub) =>
              isSubLessonUnlocked(sub, lesson, mod),
            ),
            assessments: isLessonAssessmentUnlocked(lesson, mod) ? (lesson.assessments ?? []) : [],
          }));

        const filteredAssessments = isModuleAssessmentUnlocked(mod) ? (mod.assessments ?? []) : [];

        return {
          ...mod,
          lessons: filteredLessons,
          assessments: filteredAssessments,
        };
      })
      .filter((mod) => mod.lessons.length > 0 || mod.assessments.length > 0);
  }, [
    courseDetail?.modules,
    isModuleUnlocked,
    isLessonUnlocked,
    isSubLessonUnlocked,
    isLessonAssessmentUnlocked,
    isModuleAssessmentUnlocked,
  ]);

  const unlockedCourseAssessments = useMemo(() => {
    if (!isFinalAssessmentUnlocked()) return [];
    return courseDetail?.assessments ?? [];
  }, [courseDetail?.assessments, isFinalAssessmentUnlocked]);

  const totalUnlockedItemsCount = useMemo(() => {
    let count = 0;
    unlockedModules.forEach((m) => {
      count++;
      m.lessons.forEach((l) => {
        count++;
        count += l.subLessons?.length ?? 0;
        count += l.assessments?.length ?? 0;
      });
      count += m.assessments?.length ?? 0;
    });
    count += unlockedCourseAssessments.length;
    return count;
  }, [unlockedModules, unlockedCourseAssessments]);

  useEffect(() => {
    void init();
  }, [init]);

  // Ids already stored on the phone, reloaded after every download of this course.
  const downloadedAt = downloadedCourses.find((c) => c.id === courseId)?.downloadedAt;
  const currentDownloadStatus = downloads[courseId]?.status;
  const [storedIds, setStoredIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    let mounted = true;
    void Promise.all([
      offlineDb.getLessonsForCourse(courseId),
      offlineDb.getAssessmentsForCourse(courseId),
    ]).then(([lessons, assessments]) => {
      if (mounted) {
        const validLessons = lessons.filter(
          (l) => l.contentType !== 'VIDEO' || Boolean(l.localMediaUri),
        );
        setStoredIds(new Set([...validLessons, ...assessments].map((item) => item.id)));
      }
    });
    return () => {
      mounted = false;
    };
  }, [courseId, downloadedAt, currentDownloadStatus]);

  // Everything "Download all" fetches (the final assessment is online-only, so not counted).
  const downloadableIds = useMemo(
    () =>
      unlockedModules.flatMap((m) => [
        ...(m.assessments ?? []).map((a) => a.id),
        ...m.lessons.flatMap((l) => [
          l.id,
          ...(l.subLessons ?? []).map((sub) => sub.id),
          ...(l.assessments ?? []).map((a) => a.id),
        ]),
      ]),
    [unlockedModules],
  );
  const missingCount = downloadableIds.filter((id) => !storedIds.has(id)).length;

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

  // Toggle module expansion
  const toggleModuleExpanded = (modId: string) => {
    setExpandedModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId);
      else next.add(modId);
      return next;
    });
  };

  const getModuleDownloadStatus = useCallback(
    (mod: (typeof unlockedModules)[number]): 'complete' | 'partial' | 'none' => {
      const allItemIds: string[] = [];
      mod.lessons.forEach((l) => {
        allItemIds.push(l.id);
        l.subLessons?.forEach((sub) => allItemIds.push(sub.id));
        l.assessments?.forEach((a) => allItemIds.push(a.id));
      });
      mod.assessments.forEach((a) => allItemIds.push(a.id));

      if (allItemIds.length === 0) return 'none';
      const downloadedCount = allItemIds.filter((id) => storedIds.has(id)).length;
      if (downloadedCount === allItemIds.length) return 'complete';
      if (downloadedCount > 0) return 'partial';
      return 'none';
    },
    [storedIds],
  );

  // Toggle selection for module (and automatically all its unlocked lessons, sub-lessons & quizzes)
  const toggleModuleSelection = (mod: (typeof unlockedModules)[number]) => {
    const isSelected = selectedModuleIds.has(mod.id);
    const nextModules = new Set(selectedModuleIds);
    const nextLessons = new Set(selectedLessonIds);
    const nextSubLessons = new Set(selectedSubLessonIds);
    const nextAssessments = new Set(selectedAssessmentIds);

    if (isSelected) {
      nextModules.delete(mod.id);
      mod.lessons.forEach((l) => {
        nextLessons.delete(l.id);
        l.subLessons?.forEach((sub) => nextSubLessons.delete(sub.id));
        l.assessments?.forEach((a) => nextAssessments.delete(a.id));
      });
      mod.assessments?.forEach((a) => nextAssessments.delete(a.id));
    } else {
      let hasUnstored = false;
      mod.lessons.forEach((l) => {
        if (!storedIds.has(l.id)) {
          nextLessons.add(l.id);
          hasUnstored = true;
        }
        l.subLessons?.forEach((sub) => {
          if (!storedIds.has(sub.id)) {
            nextSubLessons.add(sub.id);
            hasUnstored = true;
          }
        });
        l.assessments?.forEach((a) => {
          if (!storedIds.has(a.id)) {
            nextAssessments.add(a.id);
            hasUnstored = true;
          }
        });
      });
      mod.assessments?.forEach((a) => {
        if (!storedIds.has(a.id)) {
          nextAssessments.add(a.id);
          hasUnstored = true;
        }
      });
      if (hasUnstored) {
        nextModules.add(mod.id);
      }
    }

    setSelectedModuleIds(nextModules);
    setSelectedLessonIds(nextLessons);
    setSelectedSubLessonIds(nextSubLessons);
    setSelectedAssessmentIds(nextAssessments);
  };

  // Toggle lesson selection
  const toggleLessonSelection = (lesson: ApiCourseLesson) => {
    if (storedIds.has(lesson.id)) return;
    const nextLessons = new Set(selectedLessonIds);
    const nextSubLessons = new Set(selectedSubLessonIds);
    const nextAssessments = new Set(selectedAssessmentIds);

    if (nextLessons.has(lesson.id)) {
      nextLessons.delete(lesson.id);
      lesson.subLessons?.forEach((sub) => nextSubLessons.delete(sub.id));
      lesson.assessments?.forEach((a) => nextAssessments.delete(a.id));
    } else {
      nextLessons.add(lesson.id);
      lesson.subLessons?.forEach((sub) => {
        if (!storedIds.has(sub.id)) nextSubLessons.add(sub.id);
      });
      lesson.assessments?.forEach((a) => {
        if (!storedIds.has(a.id)) nextAssessments.add(a.id);
      });
    }

    setSelectedLessonIds(nextLessons);
    setSelectedSubLessonIds(nextSubLessons);
    setSelectedAssessmentIds(nextAssessments);
  };

  // Toggle sub-lesson selection
  const toggleSubLessonSelection = (subId: string) => {
    if (storedIds.has(subId)) return;
    const next = new Set(selectedSubLessonIds);
    if (next.has(subId)) next.delete(subId);
    else next.add(subId);
    setSelectedSubLessonIds(next);
  };

  // Toggle assessment selection
  const toggleAssessmentSelection = (aId: string) => {
    if (storedIds.has(aId)) return;
    const next = new Set(selectedAssessmentIds);
    if (next.has(aId)) next.delete(aId);
    else next.add(aId);
    setSelectedAssessmentIds(next);
  };

  // Select all unlocked course items
  const selectAll = () => {
    const nextModules = new Set<string>();
    const nextLessons = new Set<string>();
    const nextSubLessons = new Set<string>();
    const nextAssessments = new Set<string>();

    unlockedModules.forEach((m) => {
      let modHasUnstored = false;
      m.lessons.forEach((l) => {
        if (!storedIds.has(l.id)) {
          nextLessons.add(l.id);
          modHasUnstored = true;
        }
        l.subLessons?.forEach((sub) => {
          if (!storedIds.has(sub.id)) {
            nextSubLessons.add(sub.id);
            modHasUnstored = true;
          }
        });
        l.assessments?.forEach((a) => {
          if (!storedIds.has(a.id)) {
            nextAssessments.add(a.id);
            modHasUnstored = true;
          }
        });
      });
      m.assessments?.forEach((a) => {
        if (!storedIds.has(a.id)) {
          nextAssessments.add(a.id);
          modHasUnstored = true;
        }
      });
      if (modHasUnstored) {
        nextModules.add(m.id);
      }
    });
    unlockedCourseAssessments.forEach((a) => {
      if (!storedIds.has(a.id)) {
        nextAssessments.add(a.id);
      }
    });

    setSelectedModuleIds(nextModules);
    setSelectedLessonIds(nextLessons);
    setSelectedSubLessonIds(nextSubLessons);
    setSelectedAssessmentIds(nextAssessments);
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedModuleIds(new Set());
    setSelectedLessonIds(new Set());
    setSelectedSubLessonIds(new Set());
    setSelectedAssessmentIds(new Set());
  };

  const totalSelectedCount =
    selectedModuleIds.size +
    selectedLessonIds.size +
    selectedSubLessonIds.size +
    selectedAssessmentIds.size;

  // Single item / batch triggers
  const executeDownload = (options?: DownloadCourseOptions) => {
    if (!online) {
      Alert.alert(t('common.offline'), t('common.offlineAction'));
      return;
    }
    void startDownload(courseId, options);
  };

  const handleDownloadAll = () => {
    const allUnlockedModuleIds = unlockedModules.map((m) => m.id);
    const allUnlockedLessonIds = unlockedModules.flatMap((m) => m.lessons.map((l) => l.id));
    const allUnlockedSubLessonIds = unlockedModules.flatMap((m) =>
      m.lessons.flatMap((l) => l.subLessons?.map((s) => s.id) ?? []),
    );
    const allUnlockedAssessmentIds = [
      ...unlockedModules.flatMap((m) => [
        ...(m.assessments?.map((a) => a.id) ?? []),
        ...m.lessons.flatMap((l) => l.assessments?.map((a) => a.id) ?? []),
      ]),
      ...unlockedCourseAssessments.map((a) => a.id),
    ];

    if (
      allUnlockedModuleIds.length === 0 &&
      allUnlockedLessonIds.length === 0 &&
      allUnlockedSubLessonIds.length === 0 &&
      allUnlockedAssessmentIds.length === 0
    ) {
      Alert.alert(
        t('offline.noUnlockedContent', { defaultValue: 'No Unlocked Content' }),
        t('offline.noUnlockedContentBody', {
          defaultValue: 'There is no unlocked content available to download for this course yet.',
        }),
      );
      return;
    }

    executeDownload({
      moduleIds: allUnlockedModuleIds,
      lessonIds: allUnlockedLessonIds,
      subLessonIds: allUnlockedSubLessonIds,
      assessmentIds: allUnlockedAssessmentIds,
    });
  };

  const handleDownloadSelected = () => {
    if (totalSelectedCount === 0) {
      Alert.alert(
        t('offline.selectItemsPrompt', { defaultValue: 'Select Content' }),
        t('offline.selectItemsBody', {
          defaultValue: 'Please select at least one module, lesson, or quiz to download.',
        }),
      );
      return;
    }

    executeDownload({
      moduleIds: Array.from(selectedModuleIds),
      lessonIds: Array.from(selectedLessonIds),
      subLessonIds: Array.from(selectedSubLessonIds),
      assessmentIds: Array.from(selectedAssessmentIds),
    });
  };

  const handleDownloadSingleModule = (mod: (typeof unlockedModules)[number]) => {
    const modLessonIds = mod.lessons.map((l) => l.id).filter((id) => !storedIds.has(id));
    const modSubLessonIds = mod.lessons
      .flatMap((l) => l.subLessons?.map((s) => s.id) ?? [])
      .filter((id) => !storedIds.has(id));
    const modAssessmentIds = [
      ...(mod.assessments?.map((a) => a.id) ?? []),
      ...mod.lessons.flatMap((l) => l.assessments?.map((a) => a.id) ?? []),
    ].filter((id) => !storedIds.has(id));

    if (
      modLessonIds.length === 0 &&
      modSubLessonIds.length === 0 &&
      modAssessmentIds.length === 0
    ) {
      return;
    }

    executeDownload({
      moduleIds: [mod.id],
      lessonIds: modLessonIds,
      subLessonIds: modSubLessonIds,
      assessmentIds: modAssessmentIds,
    });
  };

  const handleDownloadSingleLesson = (lessonId: string) => {
    if (storedIds.has(lessonId)) return;
    executeDownload({ lessonIds: [lessonId] });
  };

  const handleDownloadSingleSubLesson = (subLessonId: string) => {
    if (storedIds.has(subLessonId)) return;
    executeDownload({
      subLessonIds: [subLessonId],
    });
  };

  const handleDownloadSingleAssessment = (assessmentId: string) => {
    if (storedIds.has(assessmentId)) return;
    executeDownload({
      assessmentIds: [assessmentId],
    });
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

  const handleRemoveSingleModule = (mod: (typeof unlockedModules)[number]) => {
    Alert.alert(
      t('courses.removeModuleTitle', { defaultValue: 'Remove Module' }),
      t('courses.removeModuleConfirm', {
        defaultValue: 'Delete downloaded content for {{module}} from your device?',
        module: mod.title || mod.titleEn || 'this module',
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: 'Delete' }),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeModuleDownload(courseId, mod.id);
            } catch (err: any) {
              Alert.alert(t('common.somethingWrong'), err?.message);
            }
          },
        },
      ],
    );
  };

  // State: Syncing
  if (isSyncing || (online && pendingSyncCount > 0 && isDownloaded)) {
    return (
      <Card className="gap-3 rounded-2xl border border-sky-500/40 bg-sky-950/30 p-4 dark:bg-slate-900">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <ActivityIndicator size="small" color="#38bdf8" />
            <AppText className="text-base font-bold text-sky-200">
              {t('courses.syncing', { defaultValue: 'Syncing Offline Progress…' })}
            </AppText>
          </View>
          <Badge label="Syncing" tone="brand" />
        </View>
        <AppText className="text-xs leading-5 text-slate-300">
          {t('courses.syncingDescription', {
            defaultValue:
              'Uploading recorded offline quiz attempts and study time to the server for verification.',
          })}
        </AppText>
      </Card>
    );
  }

  // State: Downloading with Progress
  if (isDownloading) {
    return (
      <Card className="gap-3.5 rounded-2xl border border-sky-500/50 bg-slate-900/95 p-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/20">
              <DownloadCloud size={18} color="#38bdf8" />
            </View>
            <View>
              <AppText className="text-sm font-bold tracking-wide text-white">
                {t('courses.downloading', { defaultValue: 'Downloading Offline Content' })}
              </AppText>
              <AppText className="text-xs font-medium text-sky-200">
                {progress.currentStep ||
                  t('courses.downloadingMedia', { defaultValue: 'Saving media & quizzes…' })}
              </AppText>
            </View>
          </View>
          <Badge label={`${Math.round(progress.percent)}%`} tone="brand" />
        </View>

        <ProgressBar percent={progress.percent} tone="brand" />

        <View className="flex-row items-center justify-between pt-1">
          <AppText className="flex-1 text-xs font-medium text-slate-300">
            {progress.totalBytes > 0
              ? `${formatFileSize(progress.downloadedBytes)} / ${formatFileSize(progress.totalBytes)}`
              : `${Math.round(progress.percent)}% completed`}
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

  // State: Error
  if (isError) {
    return (
      <Card className="gap-3 rounded-2xl border border-red-500/50 bg-red-950/25 p-4 dark:bg-slate-900">
        <View className="flex-row items-center gap-2.5">
          <View className="h-9 w-9 items-center justify-center rounded-xl border border-red-400/30 bg-red-500/20">
            <AlertCircle size={18} color={palette.danger} />
          </View>
          <View className="flex-1">
            <AppText className="text-sm font-bold text-red-200">
              {t('courses.downloadFailed', { defaultValue: 'Download Failed' })}
            </AppText>
            <AppText className="mt-0.5 text-xs text-slate-300">
              {progress?.error ||
                t('courses.downloadFailedHint', { defaultValue: 'Check connection and retry.' })}
            </AppText>
          </View>
        </View>
        <View className="flex-row items-center gap-2 pt-1">
          <Button
            title={t('common.retry', { defaultValue: 'Retry Download' })}
            size="sm"
            variant="primary"
            onPress={handleDownloadAll}
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

  // Main UI: Enterprise Course Download Card with Granular Selection
  return (
    <Card className="gap-3.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm dark:bg-slate-900/95">
      {/* Card Header & Status */}
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 flex-row items-center gap-3">
          <View
            className={`h-10 w-10 items-center justify-center rounded-xl border ${
              isDownloaded
                ? 'border-emerald-400/30 bg-emerald-500/20'
                : 'border-sky-400/30 bg-sky-500/20'
            }`}
          >
            {isDownloaded ? (
              <CheckCircle2 size={20} color="#10b981" />
            ) : (
              <DownloadCloud size={20} color="#38bdf8" />
            )}
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <AppText className="text-sm font-bold tracking-wide text-white">
                {isDownloaded
                  ? t('courses.availableOffline', { defaultValue: 'Available Offline' })
                  : t('courses.offlineLearning', { defaultValue: 'Offline Learning' })}
              </AppText>
              {isDownloaded && downloadedCourse?.sizeBytes ? (
                <Badge label={formatFileSize(downloadedCourse.sizeBytes)} tone="neutral" />
              ) : null}
            </View>
            <AppText className="mt-0.5 text-xs font-medium leading-4 text-slate-300">
              {t('courses.offlineHint', {
                defaultValue: 'Download lessons, documents & quizzes for offline study',
              })}
            </AppText>
          </View>
        </View>

        {/* Quick Link to My Downloads page */}
        <Pressable
          onPress={() => router.push('/(tabs)/downloads' as any)}
          className="flex-row items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 active:bg-slate-700"
          accessibilityRole="button"
          accessibilityLabel="Open Downloads"
        >
          <FolderDown size={14} color="#38bdf8" />
          <AppText className="text-xs font-semibold text-sky-400">
            {t('screens.downloads', { defaultValue: 'Downloads' })}
          </AppText>
        </Pressable>
      </View>

      {/* Primary Action Buttons Row */}
      <View className="flex-row items-center gap-2 pt-1">
        <View className="flex-1">
          {isDownloaded && downloadableIds.length > 0 && missingCount === 0 ? (
            <View
              accessibilityRole="text"
              className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15"
            >
              <CheckCircle2 size={16} color="#10b981" />
              <AppText className="text-sm font-bold text-emerald-300">
                {t('offline.downloaded')}
              </AppText>
            </View>
          ) : (
            <Button
              title={
                isDownloaded && missingCount > 0
                  ? t('offline.downloadRemaining', { count: missingCount })
                  : t('offline.downloadAll', { defaultValue: 'Download All' })
              }
              variant="primary"
              icon={<Download size={16} color="#ffffff" strokeWidth={2.2} />}
              onPress={handleDownloadAll}
              fullWidth
            />
          )}
        </View>

        {isDownloaded && (
          <Pressable
            onPress={handleRemove}
            className="flex-row items-center gap-1.5 rounded-xl border border-red-800/40 bg-red-950/40 px-3 py-2.5 active:bg-red-900/50"
            accessibilityRole="button"
            accessibilityLabel="Delete downloads"
          >
            <Trash2 size={16} color={palette.danger} />
            <AppText className="text-xs font-semibold text-red-300">
              {t('common.delete', { defaultValue: 'Delete' })}
            </AppText>
          </Pressable>
        )}
      </View>

      {/* Granular Selection Accordion Header */}
      {courseDetail?.modules && courseDetail.modules.length > 0 && (
        <View className="gap-2.5 border-t border-slate-800/80 pt-3">
          <Pressable
            onPress={() => setIsSelectorOpen((prev) => !prev)}
            className="flex-row items-center justify-between rounded-xl bg-slate-800/60 p-2 active:bg-slate-800"
          >
            <View className="flex-1 flex-row items-center gap-2">
              <Download size={15} color="#38bdf8" />
              <AppText className="text-xs font-bold text-slate-200">
                {t('offline.selectSpecificContent', {
                  defaultValue: 'Select Specific Content to Download',
                })}
              </AppText>
              {totalSelectedCount > 0 && (
                <Badge label={`${totalSelectedCount} selected`} tone="brand" />
              )}
            </View>
            <View className="h-6 w-6 items-center justify-center rounded-full bg-slate-700/50">
              {isSelectorOpen ? (
                <ChevronDown size={14} color="#94a3b8" />
              ) : (
                <ChevronRight size={14} color="#94a3b8" />
              )}
            </View>
          </Pressable>

          {/* Granular Selector Content */}
          {isSelectorOpen && (
            <View className="gap-3 pt-1">
              {/* Batch Actions Bar */}
              {totalUnlockedItemsCount === 0 ? (
                <View className="items-center gap-2 rounded-xl border border-slate-800 bg-slate-800/40 p-4">
                  <Lock size={20} color="#94a3b8" />
                  <AppText className="text-center text-xs text-slate-300">
                    {t('offline.noUnlockedContentBody', {
                      defaultValue:
                        'No unlocked content available for download yet. Complete earlier lessons to unlock and download material.',
                    })}
                  </AppText>
                </View>
              ) : (
                <>
                  <View className="flex-row items-center justify-between px-1">
                    <View className="flex-row items-center gap-2">
                      <Pressable
                        onPress={selectAll}
                        className="rounded-lg border border-sky-800/40 bg-sky-950/60 px-2.5 py-1 active:bg-sky-900/60"
                      >
                        <AppText className="text-[11px] font-semibold text-sky-300">
                          Select All
                        </AppText>
                      </Pressable>
                      {totalSelectedCount > 0 && (
                        <Pressable
                          onPress={clearSelection}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 active:bg-slate-700"
                        >
                          <AppText className="text-[11px] font-medium text-slate-300">
                            Clear
                          </AppText>
                        </Pressable>
                      )}
                    </View>

                    {totalSelectedCount > 0 && (
                      <Button
                        title={`Download (${totalSelectedCount})`}
                        size="sm"
                        variant="primary"
                        icon={<Download size={13} color="#fff" />}
                        onPress={handleDownloadSelected}
                      />
                    )}
                  </View>

                  {/* Unlocked Modules List */}
                  <View className="gap-2.5">
                    {unlockedModules.map((mod, modIdx) => {
                      const isModSelected = selectedModuleIds.has(mod.id);
                      const isModExpanded = expandedModuleIds.has(mod.id);
                      const modStatus = getModuleDownloadStatus(mod);
                      const lessonCount = mod.lessons.length;
                      const quizCount = mod.assessments.length;

                      return (
                        <View
                          key={mod.id}
                          className="overflow-hidden rounded-xl border border-slate-800 bg-slate-800/40"
                        >
                          {/* Module Header Row */}
                          <View className="flex-row items-center justify-between gap-2 bg-slate-800/80 p-3">
                            {/* Checkbox */}
                            {modStatus === 'complete' ? (
                              <View className="h-5 w-5 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-950/40">
                                <Check size={13} color="#10b981" strokeWidth={3} />
                              </View>
                            ) : (
                              <Pressable
                                onPress={() => toggleModuleSelection(mod)}
                                className={`h-5 w-5 items-center justify-center rounded-md border ${
                                  isModSelected
                                    ? 'border-brand-500 bg-brand-600'
                                    : 'border-slate-600 bg-slate-900'
                                }`}
                              >
                                {isModSelected && (
                                  <Check size={13} color="#ffffff" strokeWidth={3} />
                                )}
                              </Pressable>
                            )}

                            {/* Title & Badge */}
                            <Pressable
                              onPress={() => toggleModuleExpanded(mod.id)}
                              className="flex-1 pr-1"
                            >
                              <AppText className="text-xs font-bold text-white" numberOfLines={1}>
                                {mod.title || mod.titleEn || `Module ${modIdx + 1}`}
                              </AppText>
                              <View className="mt-0.5 flex-row items-center gap-2">
                                <AppText className="text-[10px] text-slate-400">
                                  {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
                                </AppText>
                                {quizCount > 0 && (
                                  <AppText className="text-[10px] text-sky-400">
                                    · {quizCount} {quizCount === 1 ? 'quiz' : 'quizzes'}
                                  </AppText>
                                )}
                              </View>
                            </Pressable>

                            {/* Single Module Download / Downloaded Status */}
                            {modStatus === 'complete' ? (
                              <View className="flex-row items-center gap-1.5">
                                <View className="flex-row items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2 py-1">
                                  <CheckCircle2 size={12} color="#10b981" />
                                  <AppText className="text-[11px] font-semibold text-emerald-300">
                                    {t('offline.downloaded', { defaultValue: 'Downloaded' })}
                                  </AppText>
                                </View>
                                <Pressable
                                  onPress={() => handleRemoveSingleModule(mod)}
                                  className="h-7 w-7 items-center justify-center rounded-lg border border-red-800/40 bg-red-950/40 active:bg-red-900/50"
                                  accessibilityRole="button"
                                  accessibilityLabel={`Delete module ${mod.title}`}
                                >
                                  <Trash2 size={13} color={palette.danger} />
                                </Pressable>
                              </View>
                            ) : (
                              <Pressable
                                onPress={() => handleDownloadSingleModule(mod)}
                                className="flex-row items-center gap-1 rounded-lg border border-sky-600/40 bg-sky-950/80 px-2.5 py-1 active:bg-sky-900"
                              >
                                <Download size={12} color="#38bdf8" />
                                <AppText className="text-[11px] font-semibold text-sky-300">
                                  {modStatus === 'partial'
                                    ? t('offline.downloadRemainingShort', {
                                        defaultValue: 'Download Rest',
                                      })
                                    : t('common.download', { defaultValue: 'Download' })}
                                </AppText>
                              </Pressable>
                            )}

                            {/* Expand Chevron */}
                            <Pressable onPress={() => toggleModuleExpanded(mod.id)} className="p-1">
                              {isModExpanded ? (
                                <ChevronDown size={16} color="#94a3b8" />
                              ) : (
                                <ChevronRight size={16} color="#94a3b8" />
                              )}
                            </Pressable>
                          </View>

                          {/* Expanded Module Details: Lessons, Sub-lessons & Quizzes */}
                          {isModExpanded && (
                            <View className="gap-2 border-t border-slate-800 bg-slate-900/60 p-2.5">
                              {/* Lessons in Module */}
                              {mod.lessons.map((lesson, lesIdx) => {
                                const isLesSelected = selectedLessonIds.has(lesson.id);
                                const isLessonDownloaded = storedIds.has(lesson.id);
                                const hasSubLessons = (lesson.subLessons?.length ?? 0) > 0;
                                const hasAssessments = (lesson.assessments?.length ?? 0) > 0;

                                return (
                                  <View key={lesson.id} className="gap-1.5">
                                    {/* Lesson Item Row */}
                                    <View className="flex-row items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 p-2">
                                      {/* Checkbox */}
                                      {isLessonDownloaded ? (
                                        <View className="mr-2 h-4 w-4 items-center justify-center rounded border border-emerald-500/40 bg-emerald-950/40">
                                          <Check size={11} color="#10b981" strokeWidth={3} />
                                        </View>
                                      ) : (
                                        <Pressable
                                          onPress={() => toggleLessonSelection(lesson)}
                                          className={`mr-2 h-4 w-4 items-center justify-center rounded border ${
                                            isLesSelected
                                              ? 'border-brand-500 bg-brand-600'
                                              : 'border-slate-600 bg-slate-900'
                                          }`}
                                        >
                                          {isLesSelected && (
                                            <Check size={11} color="#ffffff" strokeWidth={3} />
                                          )}
                                        </Pressable>
                                      )}

                                      {/* Icon & Title */}
                                      <View className="flex-1 flex-row items-center gap-2 pr-2">
                                        {lesson.contentType === 'VIDEO' ? (
                                          <Video size={14} color="#38bdf8" />
                                        ) : (
                                          <FileText size={14} color="#94a3b8" />
                                        )}
                                        <View className="flex-1">
                                          <AppText
                                            className="text-xs font-semibold text-slate-200"
                                            numberOfLines={1}
                                          >
                                            {lesson.title ||
                                              lesson.titleEn ||
                                              `Lesson ${lesIdx + 1}`}
                                          </AppText>
                                          {lesson.durationMinutes ? (
                                            <AppText className="text-[10px] text-slate-400">
                                              {lesson.durationMinutes} min
                                            </AppText>
                                          ) : null}
                                        </View>
                                      </View>

                                      {/* Lesson Download / Downloaded Badge */}
                                      {isLessonDownloaded ? (
                                        <View className="flex-row items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-1">
                                          <CheckCircle2 size={11} color="#10b981" />
                                          <AppText className="text-[10px] font-semibold text-emerald-300">
                                            {t('offline.downloaded', { defaultValue: 'Downloaded' })}
                                          </AppText>
                                        </View>
                                      ) : (
                                        <Pressable
                                          onPress={() => handleDownloadSingleLesson(lesson.id)}
                                          className="rounded-md border border-slate-700 bg-slate-800 p-1 px-2 active:bg-slate-700"
                                        >
                                          <Download size={12} color="#38bdf8" />
                                        </Pressable>
                                      )}
                                    </View>

                                    {/* Sub-lessons (if any) */}
                                    {hasSubLessons && (
                                      <View className="gap-1.5 pl-6">
                                        {lesson.subLessons!.map((subLesson, subIdx) => {
                                          const isSubSelected = selectedSubLessonIds.has(
                                            subLesson.id,
                                          );
                                          const isSubDownloaded = storedIds.has(subLesson.id);

                                          return (
                                            <View
                                              key={subLesson.id}
                                              className="flex-row items-center justify-between rounded-md border border-slate-800/60 bg-slate-800/30 p-1.5 px-2"
                                            >
                                              {isSubDownloaded ? (
                                                <View className="mr-2 h-3.5 w-3.5 items-center justify-center rounded border border-emerald-500/40 bg-emerald-950/40">
                                                  <Check size={9} color="#10b981" strokeWidth={3} />
                                                </View>
                                              ) : (
                                                <Pressable
                                                  onPress={() =>
                                                    toggleSubLessonSelection(subLesson.id)
                                                  }
                                                  className={`mr-2 h-3.5 w-3.5 items-center justify-center rounded border ${
                                                    isSubSelected
                                                      ? 'border-brand-500 bg-brand-600'
                                                      : 'border-slate-600 bg-slate-900'
                                                  }`}
                                                >
                                                  {isSubSelected && (
                                                    <Check size={9} color="#fff" strokeWidth={3} />
                                                  )}
                                                </Pressable>
                                              )}

                                              <View className="flex-1 flex-row items-center gap-1.5 pr-2">
                                                <CornerDownRight size={12} color="#64748b" />
                                                <AppText
                                                  className="flex-1 text-[11px] text-slate-300"
                                                  numberOfLines={1}
                                                >
                                                  {subLesson.title ||
                                                    subLesson.titleEn ||
                                                    `Sub-lesson ${subIdx + 1}`}
                                                </AppText>
                                              </View>

                                              {isSubDownloaded ? (
                                                <View className="flex-row items-center gap-1 rounded border border-emerald-500/30 bg-emerald-950/40 px-1.5 py-0.5">
                                                  <CheckCircle2 size={10} color="#10b981" />
                                                  <AppText className="text-[9px] font-semibold text-emerald-300">
                                                    {t('offline.downloaded', { defaultValue: 'Downloaded' })}
                                                  </AppText>
                                                </View>
                                              ) : (
                                                <Pressable
                                                  onPress={() =>
                                                    handleDownloadSingleSubLesson(subLesson.id)
                                                  }
                                                  className="rounded bg-slate-800 p-1 px-1.5 active:bg-slate-700"
                                                >
                                                  <Download size={11} color="#38bdf8" />
                                                </Pressable>
                                              )}
                                            </View>
                                          );
                                        })}
                                      </View>
                                    )}

                                    {/* Lesson-level Quizzes (if any) */}
                                    {hasAssessments && (
                                      <View className="gap-1 pl-6">
                                        {lesson.assessments!.map((quiz) => {
                                          const isQuizSelected = selectedAssessmentIds.has(quiz.id);
                                          const isQuizDownloaded = storedIds.has(quiz.id);

                                          return (
                                            <View
                                              key={quiz.id}
                                              className="flex-row items-center justify-between rounded-md border border-indigo-900/40 bg-indigo-950/30 p-1.5 px-2"
                                            >
                                              {isQuizDownloaded ? (
                                                <View className="mr-2 h-3.5 w-3.5 items-center justify-center rounded border border-emerald-500/40 bg-emerald-950/40">
                                                  <Check size={9} color="#10b981" strokeWidth={3} />
                                                </View>
                                              ) : (
                                                <Pressable
                                                  onPress={() => toggleAssessmentSelection(quiz.id)}
                                                  className={`mr-2 h-3.5 w-3.5 items-center justify-center rounded border ${
                                                    isQuizSelected
                                                      ? 'border-brand-500 bg-brand-600'
                                                      : 'border-slate-600 bg-slate-900'
                                                  }`}
                                                >
                                                  {isQuizSelected && (
                                                    <Check size={9} color="#fff" strokeWidth={3} />
                                                  )}
                                                </Pressable>
                                              )}

                                              <View className="flex-1 flex-row items-center gap-1.5 pr-2">
                                                <HelpCircle size={12} color="#a855f7" />
                                                <AppText
                                                  className="flex-1 text-[11px] font-medium text-indigo-200"
                                                  numberOfLines={1}
                                                >
                                                  {quiz.title || quiz.titleEn || 'Quiz'}
                                                </AppText>
                                              </View>

                                              {isQuizDownloaded ? (
                                                <View className="flex-row items-center gap-1 rounded border border-emerald-500/30 bg-emerald-950/40 px-1.5 py-0.5">
                                                  <CheckCircle2 size={10} color="#10b981" />
                                                  <AppText className="text-[9px] font-semibold text-emerald-300">
                                                    {t('offline.downloaded', { defaultValue: 'Downloaded' })}
                                                  </AppText>
                                                </View>
                                              ) : (
                                                <Pressable
                                                  onPress={() =>
                                                    handleDownloadSingleAssessment(quiz.id)
                                                  }
                                                  className="rounded bg-slate-800 p-1 px-1.5 active:bg-slate-700"
                                                >
                                                  <Download size={11} color="#c084fc" />
                                                </Pressable>
                                              )}
                                            </View>
                                          );
                                        })}
                                      </View>
                                    )}
                                  </View>
                                );
                              })}

                              {/* Module-level Quizzes (if any) */}
                              {mod.assessments.map((modQuiz) => {
                                const isQuizSelected = selectedAssessmentIds.has(modQuiz.id);
                                const isModQuizDownloaded = storedIds.has(modQuiz.id);

                                return (
                                  <View
                                    key={modQuiz.id}
                                    className="flex-row items-center justify-between rounded-lg border border-indigo-800/40 bg-indigo-950/40 p-2"
                                  >
                                    {isModQuizDownloaded ? (
                                      <View className="mr-2 h-4 w-4 items-center justify-center rounded border border-emerald-500/40 bg-emerald-950/40">
                                        <Check size={11} color="#10b981" strokeWidth={3} />
                                      </View>
                                    ) : (
                                      <Pressable
                                        onPress={() => toggleAssessmentSelection(modQuiz.id)}
                                        className={`mr-2 h-4 w-4 items-center justify-center rounded border ${
                                          isQuizSelected
                                            ? 'border-brand-500 bg-brand-600'
                                            : 'border-slate-600 bg-slate-900'
                                        }`}
                                      >
                                        {isQuizSelected && (
                                          <Check size={11} color="#ffffff" strokeWidth={3} />
                                        )}
                                      </Pressable>
                                    )}

                                    <View className="flex-1 flex-row items-center gap-2 pr-2">
                                      <Award size={14} color="#a855f7" />
                                      <AppText
                                        className="flex-1 text-xs font-semibold text-indigo-200"
                                        numberOfLines={1}
                                      >
                                        {modQuiz.title || modQuiz.titleEn || 'Module Assessment'}
                                      </AppText>
                                    </View>

                                    {isModQuizDownloaded ? (
                                      <View className="flex-row items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-1">
                                        <CheckCircle2 size={11} color="#10b981" />
                                        <AppText className="text-[10px] font-semibold text-emerald-300">
                                          {t('offline.downloaded', { defaultValue: 'Downloaded' })}
                                        </AppText>
                                      </View>
                                    ) : (
                                      <Pressable
                                        onPress={() =>
                                          handleDownloadSingleAssessment(modQuiz.id)
                                        }
                                        className="rounded-md border border-slate-700 bg-slate-800 p-1 px-2 active:bg-slate-700"
                                      >
                                        <Download size={12} color="#c084fc" />
                                      </Pressable>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Course-level Final Assessments (ONLY if unlocked) */}
                  {unlockedCourseAssessments.length > 0 && (
                    <View className="gap-2 pt-1">
                      <AppText className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Course Assessments
                      </AppText>
                      {unlockedCourseAssessments.map((ca) => {
                        const isSelected = selectedAssessmentIds.has(ca.id);
                        const isCourseQuizDownloaded = storedIds.has(ca.id);

                        return (
                          <View
                            key={ca.id}
                            className="flex-row items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5"
                          >
                            {isCourseQuizDownloaded ? (
                              <View className="mr-2 h-4 w-4 items-center justify-center rounded border border-emerald-500/40 bg-emerald-950/40">
                                <Check size={11} color="#10b981" strokeWidth={3} />
                              </View>
                            ) : (
                              <Pressable
                                onPress={() => toggleAssessmentSelection(ca.id)}
                                className={`mr-2 h-4 w-4 items-center justify-center rounded border ${
                                  isSelected
                                    ? 'border-brand-500 bg-brand-600'
                                    : 'border-slate-600 bg-slate-900'
                                }`}
                              >
                                {isSelected && <Check size={11} color="#ffffff" strokeWidth={3} />}
                              </Pressable>
                            )}

                            <View className="flex-1 flex-row items-center gap-2 pr-2">
                              <Award size={16} color="#f59e0b" />
                              <AppText
                                className="flex-1 text-xs font-bold text-amber-200"
                                numberOfLines={1}
                              >
                                {ca.title || ca.titleEn || 'Final Assessment'}
                              </AppText>
                            </View>

                            {isCourseQuizDownloaded ? (
                              <View className="flex-row items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1">
                                <CheckCircle2 size={12} color="#10b981" />
                                <AppText className="text-[11px] font-semibold text-emerald-300">
                                  {t('offline.downloaded', { defaultValue: 'Downloaded' })}
                                </AppText>
                              </View>
                            ) : (
                              <Pressable
                                onPress={() => handleDownloadSingleAssessment(ca.id)}
                                className="flex-row items-center gap-1 rounded-lg border border-amber-600/40 bg-amber-950/60 px-2.5 py-1 active:bg-amber-900"
                              >
                                <Download size={12} color="#f59e0b" />
                                <AppText className="text-[11px] font-semibold text-amber-300">
                                  Download
                                </AppText>
                              </Pressable>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      )}
    </Card>
  );
}
