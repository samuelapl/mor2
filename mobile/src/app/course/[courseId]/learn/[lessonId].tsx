import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowUp, Clock, Info, ListTree, Pause } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import { Alert } from '@/core/utils/alert';
import { cn } from '@/core/utils/cn';
import {
  AppText,
  Badge,
  Button,
  Card,
  ErrorState,
  ProgressBar,
  Screen,
  Skeleton,
} from '@/components/ui';
import { ApiError } from '@/core/api/errors';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { useLocaleStore, useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { formatClock } from '@/core/utils/formatters';
import {
  ClassroomStage,
  FileRow,
  LessonBody,
  fileNameFromUrl,
  useLesson,
} from '@/features/classroom';
import { SyllabusDrawer } from '@/features/courses';
import {
  findLessonProgress,
  requiredSeconds,
  useCompleteLesson,
  useCourseProgress,
  useLessonCompletion,
  useLessonHeartbeat,
  usePlayhead,
} from '@/features/progress';
import { offlineDb, useCourseWithOffline } from '@/features/offline';
import { syncQueue } from '@/core/sync/sync-queue';
import type { ApiLesson } from '@/features/classroom/types/lesson.types';

interface NavItem {
  type: 'LESSON' | 'SUB_LESSON' | 'ASSESSMENT';
  id: string;
  lessonId?: string;
  assessmentId?: string;
  title: string;
  titleEn?: string;
  titleAm?: string;
  passed?: boolean;
}

/**
 * Classroom player (architecture §6.5–§6.6, spec §5.1, §6.2–§6.4).
 * Linear flow: Lesson -> Sub-lesson(s) -> Lesson Assessment -> Next Lesson.
 */
export default function LessonScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);
  const online = useIsOnline();
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>();

  const lesson = useLesson(lessonId);
  const progress = useCourseProgress(courseId);
  const completion = useLessonCompletion(lessonId);
  const complete = useCompleteLesson(courseId);

  const [offlineData, setOfflineData] = useState<ApiLesson | null>(null);
  const { data: courseData } = useCourseWithOffline(courseId);
  const [syllabusOpen, setSyllabusOpen] = useState(false);
  const [locallyCompleted, setLocallyCompleted] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

  // Auto-scroll to top and reset selected video whenever navigating between topics
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setShowScrollTop(false);
    setSelectedVideoUrl(null);
  }, [lessonId]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    setShowScrollTop(y > 250);
  };

  useEffect(() => {
    if (!lesson.data || !online) {
      void (async () => {
        const offL = await offlineDb.getLesson(lessonId);
        if (offL) {
          const atts = await offlineDb.getAttachmentsForLesson(lessonId);
          const subLessons = await offlineDb.getLessonsForModule(offL.moduleId);
          const parentLesson = offL.parentId ? await offlineDb.getLesson(offL.parentId) : null;
          setOfflineData({
            id: offL.id,
            moduleId: offL.moduleId,
            parentId: offL.parentId ?? null,
            order: offL.sortOrder,
            title: offL.title,
            titleEn: offL.title,
            titleAm: offL.titleAm ?? undefined,
            contentType: offL.contentType as any,
            durationMinutes: offL.durationMinutes ?? null,
            content: offL.content ?? null,
            contentEn: offL.content ?? null,
            contentAm: offL.contentAm ?? undefined,
            resourceUrl: offL.localMediaUri || offL.resourceUrl || null,
            attachments: atts.map((a) => ({
              id: a.id,
              fileName: a.fileName,
              fileUrl: a.localFileUri || a.fileUrl,
              fileType: a.fileType,
              sizeBytes: a.sizeBytes,
            })),
            parent: parentLesson
              ? {
                  id: parentLesson.id,
                  title: parentLesson.title,
                  titleEn: parentLesson.title,
                  titleAm: parentLesson.titleAm ?? undefined,
                  moduleId: parentLesson.moduleId,
                  parentId: parentLesson.parentId ?? null,
                  order: parentLesson.sortOrder,
                  contentType: parentLesson.contentType as any,
                  durationMinutes: parentLesson.durationMinutes ?? null,
                  content: parentLesson.content ?? null,
                  contentEn: parentLesson.content ?? null,
                  contentAm: parentLesson.contentAm ?? undefined,
                  resourceUrl: parentLesson.localMediaUri || parentLesson.resourceUrl || null,
                  attachments: [],
                }
              : null,
            subLessons: subLessons
              .filter((s) => s.parentId === offL.id)
              .map((s) => ({
                id: s.id,
                moduleId: s.moduleId,
                parentId: s.parentId ?? null,
                order: s.sortOrder,
                title: s.title,
                contentType: s.contentType as any,
                durationMinutes: s.durationMinutes ?? null,
                content: s.content ?? null,
                resourceUrl: s.localMediaUri || s.resourceUrl || null,
                attachments: [],
              })),
            module: { id: offL.moduleId, courseId, order: 0 },
          });
          if (offL.isCompleted === 1) {
            setLocallyCompleted(true);
          }
        }
      })();
    }
  }, [lesson.data, online, lessonId, courseId]);

  const data = lesson.data ?? offlineData;
  const lookup = findLessonProgress(progress.data, lessonId);
  const entry = lookup?.entry;
  const completed = entry?.completed ?? completion.data?.completed ?? locallyCompleted ?? false;

  // Linear learning sequence: Parent Lesson -> Sub-lesson(s) -> Lesson Assessment -> Next Lesson
  const navNodes = useMemo<NavItem[]>(() => {
    const nodes: NavItem[] = [];

    if (progress.data?.modules) {
      const sortedMods = [...progress.data.modules].sort((a, b) => a.order - b.order);
      for (const mod of sortedMods) {
        const sortedLessons = [...mod.lessons].sort((a, b) => a.order - b.order);
        for (const les of sortedLessons) {
          // 1. Parent lesson
          nodes.push({
            type: 'LESSON',
            id: les.lessonId,
            lessonId: les.lessonId,
            title: les.title ?? les.titleEn,
            titleEn: les.titleEn,
            titleAm: les.titleAm,
          });

          // 2. Sub-lessons (if any)
          if (les.subLessons && les.subLessons.length > 0) {
            const sortedSubs = [...les.subLessons].sort((a, b) => a.order - b.order);
            for (const sub of sortedSubs) {
              nodes.push({
                type: 'SUB_LESSON',
                id: sub.lessonId,
                lessonId: sub.lessonId,
                title: sub.title ?? sub.titleEn,
                titleEn: sub.titleEn,
                titleAm: sub.titleAm,
              });
            }
          }

          // 3. Lesson assessment: sits naturally after all sub-lessons of this lesson
          if (les.assessment) {
            nodes.push({
              type: 'ASSESSMENT',
              id: les.assessment.id,
              assessmentId: les.assessment.id,
              title: les.assessment.title ?? les.assessment.titleEn ?? 'Assessment',
              titleEn: les.assessment.titleEn,
              titleAm: les.assessment.titleAm,
              passed: les.assessment.passed,
            });
          }
        }

        // 4. Module assessment (if any)
        if (mod.assessment) {
          nodes.push({
            type: 'ASSESSMENT',
            id: mod.assessment.id,
            assessmentId: mod.assessment.id,
            title: mod.assessment.title ?? mod.assessment.titleEn ?? 'Module Assessment',
            titleEn: mod.assessment.titleEn,
            titleAm: mod.assessment.titleAm,
            passed: mod.assessment.passed,
          });
        }
      }

      // 5. Final assessment (if any)
      if (progress.data.courseCompletion?.finalAssessment) {
        const fa = progress.data.courseCompletion.finalAssessment;
        nodes.push({
          type: 'ASSESSMENT',
          id: fa.id,
          assessmentId: fa.id,
          title: fa.title ?? fa.titleEn ?? 'Final Assessment',
          titleEn: fa.titleEn,
          titleAm: fa.titleAm,
          passed: fa.passed,
        });
      }
    } else if (courseData?.modules) {
      const sortedMods = [...courseData.modules].sort((a, b) => a.order - b.order);
      for (const mod of sortedMods) {
        const sortedLessons = [...mod.lessons].sort((a, b) => a.order - b.order);
        for (const les of sortedLessons) {
          nodes.push({
            type: 'LESSON',
            id: les.id,
            lessonId: les.id,
            title: les.title ?? les.titleEn ?? '',
            titleEn: les.titleEn,
            titleAm: les.titleAm,
          });

          if (les.subLessons && les.subLessons.length > 0) {
            const sortedSubs = [...les.subLessons].sort((a, b) => a.order - b.order);
            for (const sub of sortedSubs) {
              nodes.push({
                type: 'SUB_LESSON',
                id: sub.id,
                lessonId: sub.id,
                title: sub.title ?? sub.titleEn ?? '',
                titleEn: sub.titleEn,
                titleAm: sub.titleAm,
              });
            }
          }

          if (les.assessments && les.assessments.length > 0) {
            const ass = les.assessments[0]!;
            nodes.push({
              type: 'ASSESSMENT',
              id: ass.id,
              assessmentId: ass.id,
              title: ass.title ?? ass.titleEn ?? 'Assessment',
              titleEn: ass.titleEn,
              titleAm: ass.titleAm,
              passed: false,
            });
          }
        }

        if (mod.assessments && mod.assessments.length > 0) {
          const ass = mod.assessments[0]!;
          nodes.push({
            type: 'ASSESSMENT',
            id: ass.id,
            assessmentId: ass.id,
            title: ass.title ?? ass.titleEn ?? 'Module Assessment',
            titleEn: ass.titleEn,
            titleAm: ass.titleAm,
            passed: false,
          });
        }
      }

      if (courseData.assessments && courseData.assessments.length > 0) {
        const fa = courseData.assessments[0]!;
        nodes.push({
          type: 'ASSESSMENT',
          id: fa.id,
          assessmentId: fa.id,
          title: fa.title ?? fa.titleEn ?? 'Final Assessment',
          titleEn: fa.titleEn,
          titleAm: fa.titleAm,
          passed: false,
        });
      }
    }

    return nodes;
  }, [progress.data, courseData]);

  const currentIndex = navNodes.findIndex(
    (n) => (n.type === 'LESSON' || n.type === 'SUB_LESSON') && n.lessonId === lessonId,
  );

  // Previous node: latest previous lesson or sub-lesson in the flow
  const prevNode = useMemo(() => {
    if (currentIndex <= 0) return null;
    for (let i = currentIndex - 1; i >= 0; i--) {
      const node = navNodes[i];
      if (node && (node.type === 'LESSON' || node.type === 'SUB_LESSON') && node.lessonId) {
        return node;
      }
    }
    return null;
  }, [currentIndex, navNodes]);

  const isVideoAttachment = (att: {
    fileType?: string | null;
    fileName?: string | null;
    fileUrl: string;
  }) => {
    if (att.fileType?.toLowerCase().startsWith('video/')) return true;
    const nameOrUrl = (att.fileName || att.fileUrl || '').toLowerCase();
    if (/\.(mp4|mov|webm|mkv|avi|m4v|3gp|flv)$/i.test(nameOrUrl)) return true;
    if (data?.resourceUrl && att.fileUrl === data.resourceUrl) return true;
    return false;
  };

  const videoAttachments = useMemo(
    () => (data?.attachments ?? []).filter(isVideoAttachment),
    [data?.attachments],
  );

  // File attachments stay at the bottom; non-video resource files also go here
  const downloadableAttachments = useMemo(() => {
    const files = (data?.attachments ?? []).filter((f) => !isVideoAttachment(f));
    if (
      data?.resourceUrl &&
      (data.contentType === 'DOCUMENT' || data.contentType === 'PRESENTATION') &&
      !files.some((f) => f.fileUrl === data.resourceUrl)
    ) {
      files.unshift({
        id: 'lesson-resource-doc',
        fileName: fileNameFromUrl(data.resourceUrl, data.title ?? data.titleEn ?? 'Document'),
        fileUrl: data.resourceUrl,
        fileType: 'application/pdf',
        sizeBytes: 0,
      });
    }
    return files;
  }, [data]);

  // Video media player stage: only video attachments & video resourceUrls are placed at the top
  const effectiveLesson = useMemo(() => {
    if (!data) return null;
    const primaryVideoUrl =
      selectedVideoUrl ||
      (data.contentType === 'VIDEO' ? data.resourceUrl : null) ||
      videoAttachments[0]?.fileUrl ||
      null;

    if (primaryVideoUrl) {
      return {
        ...data,
        contentType: 'VIDEO' as const,
        resourceUrl: primaryVideoUrl,
      };
    }

    if (['AUDIO', 'INTERACTIVE', 'SCORM', 'EXTERNAL_LINK'].includes(data.contentType)) {
      return data;
    }

    return null;
  }, [data, selectedVideoUrl, videoAttachments]);

  const isYoutube = Boolean(
    effectiveLesson?.resourceUrl && /youtu\.?be/.test(effectiveLesson.resourceUrl),
  );
  const isPlayable =
    Boolean(effectiveLesson?.resourceUrl) &&
    (effectiveLesson?.contentType === 'VIDEO' || effectiveLesson?.contentType === 'AUDIO') &&
    !isYoutube;
  const [playing, setPlaying] = useState(false);

  const heartbeat = useLessonHeartbeat({
    courseId,
    lessonId,
    serverSeconds: entry?.timeSpentSeconds ?? 0,
    active: isPlayable ? playing : true,
    enabled: Boolean(data) && !completed,
  });
  const playhead = usePlayhead(lessonId, completed);

  const required = entry?.requiredSeconds ?? requiredSeconds(data?.durationMinutes);
  const satisfied =
    completed || (entry?.timeSatisfied ?? false) || heartbeat.liveSeconds >= required;
  const remaining = Math.max(0, required - heartbeat.liveSeconds);

  const lockedHint = !satisfied
    ? isPlayable && !playing
      ? t(
          effectiveLesson?.contentType === 'AUDIO'
            ? 'classroom.playAudioToUnlock'
            : 'classroom.playVideoToUnlock',
        )
      : t('classroom.keepStudyingToUnlock', { time: formatClock(remaining) })
    : null;

  const markComplete = (lastPosition?: number) => {
    if (!online) {
      setLocallyCompleted(true);
      void offlineDb.updateLessonProgress(lessonId, { isCompleted: true, lastPosition });
      syncQueue.enqueue('LESSON_COMPLETE', { lessonId, lastPosition }, `complete-${lessonId}`);
      Alert.alert(
        t('classroom.completed'),
        t('classroom.offlineCompletedHint', {
          defaultValue:
            'Lesson completed offline! Your progress will sync automatically when back online.',
        }),
      );
      return;
    }

    complete.mutate(
      { lessonId, lastPosition },
      {
        onError: (error) => {
          if (!(error instanceof ApiError)) return;
          const message =
            error.reason === 'TIME_NOT_MET'
              ? t('classroom.reasons.timeNotMet', {
                  time: formatClock(error.remainingSeconds ?? 0),
                })
              : error.reason === 'ASSESSMENT_NOT_PASSED' || error.reason === 'ASSESSMENT_REQUIRED'
                ? t('classroom.reasons.assessmentRequired')
                : error.reason === 'LOCKED'
                  ? t('classroom.reasons.locked')
                  : error.localizedMessage(locale);
          Alert.alert(t('classroom.markComplete'), message);
          if (error.reason === 'LOCKED' || error.reason === 'TIME_NOT_MET') void progress.refetch();
        },
      },
    );
  };

  const onEnded = () => {
    if (!completed && satisfied) markComplete(0);
  };

  const replaceWithLesson = (id: string) =>
    router.replace({
      pathname: '/course/[courseId]/learn/[lessonId]',
      params: { courseId, lessonId: id },
    });
  const openQuiz = (assessmentId: string) =>
    router.push({ pathname: '/quiz/[assessmentId]', params: { assessmentId, courseId } });

  const handlePrevious = () => {
    if (prevNode?.lessonId) {
      replaceWithLesson(prevNode.lessonId);
    } else {
      router.back();
    }
  };

  const [isNavigating, setIsNavigating] = useState(false);

  const handleNext = async () => {
    // If study-time requirement is not satisfied, alert the user
    if (!satisfied) {
      Alert.alert(
        t('classroom.topicIncomplete', { defaultValue: 'Topic Incomplete' }),
        lockedHint ||
          t('classroom.finishTopicToUnlock', {
            defaultValue: 'Please finish studying this topic to unlock the content.',
          }),
      );
      return;
    }

    setIsNavigating(true);
    try {
      // Mark current topic/lesson completed on server and wait for success before navigating
      if (!completed) {
        if (!online) {
          setLocallyCompleted(true);
          await offlineDb.updateLessonProgress(lessonId, { isCompleted: true });
          syncQueue.enqueue('LESSON_COMPLETE', { lessonId }, `complete-${lessonId}`);
        } else {
          await complete.mutateAsync({ lessonId });
          await progress.refetch();
        }
      }

      // Advance forward in syllabus order: Sub-lesson -> Assessment -> Next Lesson
      for (let i = currentIndex + 1; i < navNodes.length; i++) {
        const node = navNodes[i]!;
        if (node.type === 'ASSESSMENT') {
          if (!node.passed) {
            openQuiz(node.assessmentId!);
            return;
          }
          // If this assessment is already passed, proceed to next lesson
          continue;
        }

        if (node.lessonId) {
          replaceWithLesson(node.lessonId);
          return;
        }
      }

      // End of syllabus
      Alert.alert(
        t('classroom.completed', { defaultValue: 'Course Completed' }),
        t('classroom.courseDone', {
          defaultValue: 'You have completed all content in this course!',
        }),
        [
          {
            text: t('classroom.backToCourse', { defaultValue: 'Back to course' }),
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      if (error instanceof ApiError) {
        const message =
          error.reason === 'TIME_NOT_MET'
            ? t('classroom.reasons.timeNotMet', {
                time: formatClock(error.remainingSeconds ?? 0),
              })
            : error.reason === 'ASSESSMENT_NOT_PASSED' || error.reason === 'ASSESSMENT_REQUIRED'
              ? t('classroom.reasons.assessmentRequired')
              : error.reason === 'LOCKED'
                ? t('classroom.reasons.locked')
                : error.localizedMessage(locale);
        Alert.alert(t('classroom.markComplete'), message);
        if (error.reason === 'LOCKED' || error.reason === 'TIME_NOT_MET') {
          void progress.refetch();
        }
      } else {
        Alert.alert(t('common.error'), (error as any)?.message || 'Failed to complete lesson');
      }
    } finally {
      setIsNavigating(false);
    }
  };

  if (lesson.isPending && !data) {
    return (
      <Screen>
        <Skeleton height={200} />
        <Skeleton height={24} width="70%" />
        <Skeleton height={120} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <ErrorState error={lesson.error} onRetry={() => void lesson.refetch()} />
        <Button title={t('classroom.backToCourse')} variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const startAt = playhead.resumePosition(
    completion.data?.lastPosition ?? lookup?.lesson?.lastPosition ?? 0,
  );
  const body = localized(data, 'content');

  return (
    <>
      <Stack.Screen
        options={{
          title: localized(data, 'title'),
          headerRight: () =>
            courseData ? (
              <Pressable
                onPress={() => setSyllabusOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={t('courses.syllabus')}
                className="mr-1 rounded-full p-2 active:bg-slate-100 dark:active:bg-slate-800"
              >
                <ListTree size={22} color={colors.primary} />
              </Pressable>
            ) : null,
        }}
      />
      {courseData ? (
        <SyllabusDrawer
          visible={syllabusOpen}
          onClose={() => setSyllabusOpen(false)}
          course={courseData}
          progress={progress.data}
          activeLessonId={lessonId}
          onOpenLesson={(id) => {
            if (id !== lessonId) replaceWithLesson(id);
          }}
          onOpenAssessment={openQuiz}
          onOpenCertificate={() =>
            router.navigate({ pathname: '/course/[courseId]', params: { courseId } })
          }
          onOpenCourseOverview={() =>
            router.push({ pathname: '/course/[courseId]/overview', params: { courseId } })
          }
          onOpenLiveSessions={() =>
            router.push({ pathname: '/course/[courseId]/live-sessions', params: { courseId } })
          }
          onOpenModuleOverview={(moduleId) =>
            router.push({
              pathname: '/course/[courseId]/module/[moduleId]',
              params: { courseId, moduleId },
            })
          }
        />
      ) : null}

      <View className="flex-1 relative">
        <Screen
          scrollViewRef={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentClassName="gap-4 p-0 pb-12"
          onRefresh={() => void progress.refetch()}
          refreshing={progress.isRefetching}
        >
          {effectiveLesson ? (
            <ClassroomStage
              lesson={effectiveLesson}
              startAt={startAt}
              onPlayingChange={setPlaying}
              onPosition={playhead.onPosition}
              onPause={playhead.commit}
              onEnded={onEnded}
              onExternalTime={heartbeat.addSeconds}
            />
          ) : null}

          {/* Multiple video switcher if more than 1 video attachment exists */}
          {videoAttachments.length > 1 ? (
            <View className="flex-row flex-wrap gap-2 px-4 pt-1">
              {videoAttachments.map((v, i) => {
                const currentVideo =
                  selectedVideoUrl ||
                  (data.contentType === 'VIDEO' ? data.resourceUrl : null) ||
                  videoAttachments[0]?.fileUrl;
                const isSelected = currentVideo === v.fileUrl;
                return (
                  <Pressable
                    key={v.id || v.fileUrl}
                    onPress={() => setSelectedVideoUrl(v.fileUrl)}
                    className={cn(
                      'rounded-full px-3 py-1 border',
                      isSelected
                        ? 'bg-brand-600 border-brand-600'
                        : 'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-700',
                    )}
                  >
                    <AppText
                      variant="caption"
                      className={
                        isSelected
                          ? 'text-white font-semibold'
                          : 'text-slate-700 dark:text-slate-300'
                      }
                    >
                      {v.fileName || `${t('classroom.video', { defaultValue: 'Video' })} ${i + 1}`}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View className="gap-4 px-4">
            <View className="gap-2">
              <View className="flex-row flex-wrap items-center gap-2">
                <Badge label={t(`classroom.contentType.${data.contentType}`)} tone="brand" />
                {data.durationMinutes ? (
                  <Badge label={t('courses.minutes', { count: data.durationMinutes })} />
                ) : null}
                {completed ? <Badge label={t('classroom.completed')} tone="success" /> : null}
              </View>
              {data.parent ? (
                <AppText variant="caption">
                  {t('classroom.partOf', { title: localized(data.parent, 'title') })}
                </AppText>
              ) : null}
              <AppText variant="title">{localized(data, 'title')}</AppText>
            </View>

            {/* Study-time requirement (spec §6.4) */}
            {!completed && required > 0 ? (
              <Card className="gap-2">
                <View className="flex-row items-center gap-2">
                  {isPlayable && !playing && !satisfied ? (
                    <Pause size={16} color={colors.textMuted} />
                  ) : (
                    <Clock size={16} color={satisfied ? colors.success : colors.primary} />
                  )}
                  <AppText variant="label" className="flex-1">
                    {satisfied
                      ? t('classroom.timeDone')
                      : isPlayable && !playing
                        ? t('classroom.pausedHint')
                        : t('classroom.timeRemaining', { time: formatClock(remaining) })}
                  </AppText>
                  <AppText variant="caption">
                    {formatClock(Math.min(heartbeat.liveSeconds, required))} / {formatClock(required)}
                  </AppText>
                </View>
                <ProgressBar
                  percent={(Math.min(heartbeat.liveSeconds, required) / required) * 100}
                  tone={satisfied ? 'success' : 'brand'}
                />
              </Card>
            ) : null}

            {body ? <LessonBody content={body} /> : null}

            {/* Downloadable file attachments at the bottom */}
            {downloadableAttachments.length > 0 ? (
              <View className="gap-2 pt-2">
                <AppText variant="heading">{t('classroom.attachments')}</AppText>
                {downloadableAttachments.map((file) => (
                  <FileRow
                    key={file.id}
                    url={file.fileUrl}
                    fileName={file.fileName}
                    mimeType={file.fileType}
                    sizeBytes={file.sizeBytes}
                  />
                ))}
              </View>
            ) : null}

            {/* Bottom navigation bar: Previous and Next ONLY */}
            <View className="flex-row items-center gap-3 pt-3">
              <Button
                title={t('common.previous', { defaultValue: 'Previous' })}
                variant="outline"
                className="flex-1"
                onPress={handlePrevious}
                disabled={!prevNode}
              />
              <Button
                title={t('common.next', { defaultValue: 'Next' })}
                variant="primary"
                className="flex-1"
                loading={isNavigating || complete.isPending}
                onPress={handleNext}
              />
            </View>
          </View>
        </Screen>

        {/* Floating scroll to top button */}
        {showScrollTop ? (
          <Pressable
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
            className="absolute bottom-6 right-5 z-50 h-11 w-11 items-center justify-center rounded-full bg-brand-600 shadow-md elevation-5 active:bg-brand-700"
            accessibilityRole="button"
            accessibilityLabel={t('classroom.scrollToTop', { defaultValue: 'Scroll to top' })}
          >
            <ArrowUp size={20} color="#ffffff" />
          </Pressable>
        ) : null}
      </View>
    </>
  );
}
