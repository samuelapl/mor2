import { router, Stack, useLocalSearchParams } from 'expo-router';
import { CircleCheck, ClipboardCheck, Clock, Pause } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Alert } from '@/core/utils/alert';
import {
  AppText,
  Badge,
  Button,
  Card,
  ErrorState,
  LockBadge,
  ProgressBar,
  Screen,
  Skeleton,
} from '@/components/ui';
import { ApiError } from '@/core/api/errors';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { useLocaleStore, useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { formatClock } from '@/core/utils/formatters';
import { ClassroomStage, FileRow, LessonBody, useLesson } from '@/features/classroom';
import { ContentTypeIcon } from '@/features/courses';
import {
  findLessonProgress,
  findNextLesson,
  useCompleteLesson,
  useCourseProgress,
  useLessonCompletion,
  useLessonHeartbeat,
  usePlayhead,
} from '@/features/progress';
import { offlineDb } from '@/features/offline';
import { syncQueue } from '@/core/sync/sync-queue';
import type { ApiLesson } from '@/features/classroom/types/lesson.types';

/**
 * Classroom player (architecture §6.5–§6.6, spec §5.1, §6.2–§6.4).
 * The server decides locks and completion; this screen counts study time, keeps the playhead
 * and asks the server to complete the lesson when its rules are met.
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
  const [locallyCompleted, setLocallyCompleted] = useState(false);

  useEffect(() => {
    if (!lesson.data || !online) {
      void (async () => {
        const offL = await offlineDb.getLesson(lessonId);
        if (offL) {
          const atts = await offlineDb.getAttachmentsForLesson(lessonId);
          const subLessons = await offlineDb.getLessonsForModule(offL.moduleId);
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
            parent: null,
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

  const lookup = findLessonProgress(progress.data, lessonId);
  const entry = lookup?.entry;
  const quiz = lookup?.lesson?.assessment ?? null;
  const data = lesson.data ?? offlineData;
  const subLessons = [...(data?.subLessons ?? [])].sort((a, b) => a.order - b.order);
  const hasSubLessons = subLessons.length > 0;
  const completed = entry?.completed ?? completion.data?.completed ?? locallyCompleted ?? false;

  const isYoutube = Boolean(data?.resourceUrl && /youtu\.?be/.test(data.resourceUrl));
  const isPlayable =
    Boolean(data?.resourceUrl) &&
    (data?.contentType === 'VIDEO' || data?.contentType === 'AUDIO') &&
    !isYoutube;
  const [playing, setPlaying] = useState(false);

  const heartbeat = useLessonHeartbeat({
    courseId,
    lessonId,
    serverSeconds: entry?.timeSpentSeconds ?? 0,
    // Media lessons count only while playing; reading lessons while on screen.
    active: isPlayable ? playing : true,
    enabled: Boolean(data) && !completed,
  });
  const playhead = usePlayhead(lessonId, completed);

  const required = entry?.requiredSeconds ?? (data?.durationMinutes ? data.durationMinutes * 60 : 0);
  const satisfied =
    completed || (entry?.timeSatisfied ?? false) || heartbeat.liveSeconds >= required;
  const remaining = Math.max(0, required - heartbeat.liveSeconds);
  const subLessonsDone =
    !hasSubLessons || (lookup?.lesson?.subLessons.every((s) => s.completed) ?? false);
  const quizOpen = satisfied && subLessonsDone;

  const next = completed ? findNextLesson(progress.data) : null;
  const nextIsOther = next && next.lessonId !== lessonId ? next : null;
  const moduleAssessment = lookup?.module?.assessment ?? null;
  const courseDone =
    completed && !nextIsOther && (progress.data?.courseCompletion.contentCompleted ?? false);
  const finalAssessment = progress.data?.courseCompletion.finalAssessment ?? null;

  const quizTitle = quiz
    ? localized(quiz, 'title') || quiz.titleEn || t('classroom.quiz')
    : '';
  const quizButtonTitle = t('classroom.takeSpecificQuiz', {
    defaultValue: `Take ${quizTitle}`,
    title: quizTitle,
  });

  const moduleAssessmentTitle = moduleAssessment
    ? localized(moduleAssessment, 'title') || moduleAssessment.titleEn || t('classroom.quiz')
    : '';
  const moduleAssessmentButtonTitle = t('classroom.takeSpecificQuiz', {
    defaultValue: `Take ${moduleAssessmentTitle}`,
    title: moduleAssessmentTitle,
  });

  const finalAssessmentTitle = finalAssessment
    ? localized(finalAssessment, 'title') ||
      finalAssessment.titleEn ||
      t('classroom.finalAssessment')
    : '';
  const finalAssessmentButtonTitle = t('classroom.takeSpecificQuiz', {
    defaultValue: `Take ${finalAssessmentTitle}`,
    title: finalAssessmentTitle,
  });

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

  const downloadableAttachments = (data?.attachments ?? []).filter(
    (file) => !isVideoAttachment(file),
  );

  // The React Compiler memoizes these; no manual useCallback needed.
  const markComplete = (lastPosition?: number) => {
    if (!online) {
      setLocallyCompleted(true);
      void offlineDb.updateLessonProgress(lessonId, { isCompleted: true, lastPosition });
      void offlineDb.enqueueProgress(courseId, lessonId, 'COMPLETION', { lastPosition });
      syncQueue.enqueue('LESSON_COMPLETE', { lessonId, lastPosition }, `complete-${lessonId}`);
      Alert.alert(
        t('classroom.completed'),
        t('classroom.offlineCompletedHint', {
          defaultValue: 'Lesson completed offline! Your progress will sync automatically when back online.',
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
    // Finishing a video auto-completes it when nothing else is required (architecture §6.6).
    if (!completed && !quiz && !hasSubLessons && satisfied) markComplete(0);
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

  const openLesson = (id: string) =>
    router.push({
      pathname: '/course/[courseId]/learn/[lessonId]',
      params: { courseId, lessonId: id },
    });
  const replaceWithLesson = (id: string) =>
    router.replace({
      pathname: '/course/[courseId]/learn/[lessonId]',
      params: { courseId, lessonId: id },
    });
  const openQuiz = (assessmentId: string) =>
    router.push({ pathname: '/quiz/[assessmentId]', params: { assessmentId, courseId } });

  const startAt = playhead.resumePosition(
    completion.data?.lastPosition ?? lookup?.lesson?.lastPosition ?? 0,
  );
  const body = localized(data, 'content');

  return (
    <>
      <Stack.Screen options={{ title: localized(data, 'title') }} />
      <Screen
        contentClassName="gap-4 p-0 pb-8"
        onRefresh={() => void progress.refetch()}
        refreshing={progress.isRefetching}
      >
        <ClassroomStage
          lesson={data}
          startAt={startAt}
          onPlayingChange={setPlaying}
          onPosition={playhead.onPosition}
          onPause={playhead.commit}
          onEnded={onEnded}
          onExternalTime={heartbeat.addSeconds}
        />

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

          {downloadableAttachments.length > 0 ? (
            <View className="gap-2">
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

          {/* Topics (sub-lessons) — the parent completes when all of them are done */}
          {hasSubLessons ? (
            <Card className="gap-1 p-2">
              <AppText variant="heading" className="px-2 pt-2">
                {t('classroom.subLessons')}
              </AppText>
              {subLessons.map((sub) => {
                const p = lookup?.lesson?.subLessons.find((s) => s.lessonId === sub.id);
                const unlocked = p?.unlocked ?? false;
                return (
                  <Button
                    key={sub.id}
                    variant="ghost"
                    className="h-auto justify-start py-3"
                    disabled={!unlocked}
                    onPress={() => openLesson(sub.id)}
                    title={localized(sub, 'title')}
                    icon={
                      p?.completed ? (
                        <CircleCheck size={18} color={colors.success} />
                      ) : unlocked ? (
                        <ContentTypeIcon type={sub.contentType} color={colors.primary} />
                      ) : (
                        <LockBadge />
                      )
                    }
                  />
                );
              })}
              {!completed ? (
                <AppText variant="caption" className="px-2 pb-2">
                  {t('classroom.completeSubLessons')}
                </AppText>
              ) : null}
            </Card>
          ) : null}

          {/* Primary action */}
          <View className="gap-3 pt-2">
            {completed ? (
              <>
                <View className="flex-row items-center justify-center gap-2">
                  <CircleCheck size={20} color={colors.success} />
                  <AppText className="font-semibold text-green-700 dark:text-green-400">
                    {t('classroom.completed')}
                  </AppText>
                </View>
                {nextIsOther ? (
                  <Button
                    title={t('classroom.nextLesson')}
                    onPress={() => replaceWithLesson(nextIsOther.lessonId)}
                    fullWidth
                  />
                ) : moduleAssessment && !moduleAssessment.passed ? (
                  <Button
                    title={moduleAssessmentButtonTitle}
                    icon={<ClipboardCheck size={18} color="#fff" />}
                    onPress={() => openQuiz(moduleAssessment.id)}
                    fullWidth
                  />
                ) : courseDone && finalAssessment && !finalAssessment.passed ? (
                  <Button
                    title={finalAssessmentButtonTitle}
                    icon={<ClipboardCheck size={18} color="#fff" />}
                    onPress={() => openQuiz(finalAssessment.id)}
                    fullWidth
                  />
                ) : courseDone ? (
                  <AppText variant="muted" className="text-center">
                    {t('classroom.courseDone')}
                  </AppText>
                ) : null}
                <Button
                  title={t('classroom.backToCourse')}
                  variant="ghost"
                  onPress={() => router.back()}
                />
              </>
            ) : quiz && !quiz.passed ? (
              <>
                <Button
                  title={quizButtonTitle}
                  icon={<ClipboardCheck size={18} color="#fff" />}
                  disabled={!quizOpen}
                  onPress={() => openQuiz(quiz.id)}
                  fullWidth
                />
                <AppText variant="caption" className="text-center">
                  {!online
                    ? t('classroom.offlineQuizAvailable', {
                        defaultValue: 'Quiz available offline · Syncs automatically on reconnect',
                      })
                    : t('classroom.quizCompletesLesson')}
                </AppText>
              </>
            ) : hasSubLessons ? null : (
              <>
                <Button
                  title={t('classroom.markComplete')}
                  disabled={!satisfied}
                  loading={complete.isPending}
                  onPress={() => markComplete()}
                  fullWidth
                />
                {!online ? (
                  <AppText variant="caption" className="text-center">
                    {t('classroom.offlineCompleteHint', {
                      defaultValue: 'Offline mode · Progress saved locally and syncs automatically',
                    })}
                  </AppText>
                ) : null}
              </>
            )}
          </View>
        </View>
      </Screen>
    </>
  );
}
