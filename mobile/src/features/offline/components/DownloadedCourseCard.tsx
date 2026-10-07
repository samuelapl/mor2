import { router } from 'expo-router';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  FileText,
  PlayCircle,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';

import { AppText, Badge, Button, Card, ProgressBar } from '@/components/ui';
import { useLocaleStore } from '@/core/i18n';
import { palette, useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';
import { formatDate } from '@/core/utils/formatters';
import { downloadAndOpen } from '@/features/classroom/utils/open-file';
import { useCourseProgress } from '@/features/progress';

import { useOfflineStore } from '../offline-store';
import { useCourseWithOffline } from '../hooks/useCourseWithOffline';
import {
  offlineDb,
  type OfflineAssessment,
  type OfflineAttachment,
  type OfflineCourse,
  type OfflineLesson,
  type OfflineModule,
  type OfflineQuizAttempt,
} from '../offline-db';

interface Details {
  modules: OfflineModule[];
  lessons: OfflineLesson[];
  assessments: OfflineAssessment[];
  attachments: OfflineAttachment[];
  attempts: Record<string, OfflineQuizAttempt | null>;
}

type Status = 'passed' | 'pending' | 'failed' | null;

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${parseFloat((bytes / 1024 ** i).toFixed(1))} ${units[i]}`;
}

const isMedia = (type: string) => type === 'VIDEO' || type === 'AUDIO';

/** A downloaded course on the Downloads tab: progress, then its lessons and quizzes with status. */
export function DownloadedCourseCard({
  course,
  defaultOpen = false,
  onRemove,
}: {
  course: OfflineCourse;
  defaultOpen?: boolean;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);
  const progress = useCourseProgress(course.id);
  const removeModuleDownload = useOfflineStore((s) => s.removeModuleDownload);
  const [open, setOpen] = useState(defaultOpen);
  const [details, setDetails] = useState<Details | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [modules, lessons, assessments] = await Promise.all([
        offlineDb.getModulesForCourse(course.id),
        offlineDb.getLessonsForCourse(course.id),
        offlineDb.getAssessmentsForCourse(course.id),
      ]);
      const attachments = (
        await Promise.all(lessons.map((l) => offlineDb.getAttachmentsForLesson(l.id)))
      ).flat();
      const latest = await Promise.all(
        assessments.map((a) => offlineDb.getLatestQuizAttempt(a.id)),
      );
      const attempts = Object.fromEntries(assessments.map((a, i) => [a.id, latest[i]]));
      if (mounted) setDetails({ modules, lessons, assessments, attachments, attempts });
    })();
    return () => {
      mounted = false;
    };
  }, [course.id, course.downloadedAt, progress.dataUpdatedAt]);

  // Server progress (cached, so it works offline) — the source of truth once synced.
  const completedLessons = new Set<string>();
  const passedQuizzes = new Set<string>();
  progress.data?.modules.forEach((m) => {
    if (m.assessment?.passed) passedQuizzes.add(m.assessment.id);
    m.lessons.forEach((l) => {
      if (l.completed) completedLessons.add(l.lessonId);
      if (l.assessment?.passed) passedQuizzes.add(l.assessment.id);
      l.subLessons.forEach((s) => s.completed && completedLessons.add(s.lessonId));
    });
  });

  const lessonStatus = (lesson: OfflineLesson): Status =>
    completedLessons.has(lesson.id) ? 'passed' : lesson.isCompleted === 1 ? 'pending' : null;

  const quizStatus = (quiz: OfflineAssessment): Status => {
    if (passedQuizzes.has(quiz.id)) return 'passed';
    const attempt = details?.attempts[quiz.id];
    if (attempt?.syncStatus === 'PENDING') return 'pending';
    if (attempt?.syncStatus === 'SYNCED') return attempt.passed ? 'passed' : 'failed';
    return null;
  };

  const percent = Math.round(progress.data?.stats.overallPercent ?? 0);
  const coursePassed = progress.data?.courseCompletion.certificateEligible ?? false;

  const { data: courseData } = useCourseWithOffline(course.id);
  const lessons = details?.lessons ?? [];
  const assessments = details?.assessments ?? [];
  const storedModules = details?.modules ?? [];

  // Build a complete module map from course metadata, SQLite records, and downloaded content
  const moduleMap = new Map<string, OfflineModule>();

  if (courseData?.modules) {
    for (const m of courseData.modules) {
      moduleMap.set(m.id, {
        id: m.id,
        courseId: course.id,
        title: m.title ?? m.titleEn ?? '',
        titleAm: m.titleAm ?? null,
        description: m.description ?? null,
        descriptionAm: m.descriptionAm ?? null,
        objectives: m.objectives ?? null,
        objectivesAm: m.objectivesAm ?? null,
        sortOrder: m.order,
        durationMinutes: m.durationMinutes ?? null,
      });
    }
  }

  for (const m of storedModules) {
    moduleMap.set(m.id, m);
  }

  // Ensure any module referenced by lessons or assessments exists in moduleMap
  for (const l of lessons) {
    const mId =
      l.moduleId || (moduleMap.size > 0 ? Array.from(moduleMap.keys())[0]! : 'default-module');
    if (!moduleMap.has(mId)) {
      moduleMap.set(mId, {
        id: mId,
        courseId: course.id,
        title: course.title,
        titleAm: course.titleAm ?? null,
        description: null,
        descriptionAm: null,
        objectives: null,
        objectivesAm: null,
        sortOrder: 0,
        durationMinutes: null,
      });
    }
  }

  for (const a of assessments) {
    const mId =
      a.moduleId || (moduleMap.size > 0 ? Array.from(moduleMap.keys())[0]! : 'default-module');
    if (!moduleMap.has(mId)) {
      moduleMap.set(mId, {
        id: mId,
        courseId: course.id,
        title: course.title,
        titleAm: course.titleAm ?? null,
        description: null,
        descriptionAm: null,
        objectives: null,
        objectivesAm: null,
        sortOrder: 0,
        durationMinutes: null,
      });
    }
  }

  if (moduleMap.size === 0 && (lessons.length > 0 || assessments.length > 0)) {
    moduleMap.set('default-module', {
      id: 'default-module',
      courseId: course.id,
      title: course.title,
      titleAm: course.titleAm ?? null,
      description: null,
      descriptionAm: null,
      objectives: null,
      objectivesAm: null,
      sortOrder: 0,
      durationMinutes: null,
    });
  }

  const parentLessonIds = new Set(lessons.filter((l) => !l.parentId).map((l) => l.id));
  const topLevel = (moduleId: string) =>
    lessons
      .filter((l) => {
        const matchesModule =
          l.moduleId === moduleId ||
          (!l.moduleId && (moduleId === 'default-module' || moduleMap.size === 1));
        return matchesModule && (!l.parentId || !parentLessonIds.has(l.parentId));
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  const subsOf = (lessonId: string) =>
    lessons.filter((l) => l.parentId === lessonId).sort((a, b) => a.sortOrder - b.sortOrder);
  const quizzesFor = (lessonId: string) => assessments.filter((a) => a.lessonId === lessonId);
  const moduleQuizzes = (moduleId: string) =>
    assessments.filter((a) => {
      const matchesModule =
        a.moduleId === moduleId ||
        (!a.moduleId && (moduleId === 'default-module' || moduleMap.size === 1));
      return matchesModule && !a.lessonId;
    });
  const orphanLessonQuizzes = (moduleId: string) => {
    const existingLessonIds = new Set(lessons.map((l) => l.id));
    return assessments.filter((a) => {
      const matchesModule =
        a.moduleId === moduleId ||
        (!a.moduleId && (moduleId === 'default-module' || moduleMap.size === 1));
      return matchesModule && a.lessonId && !existingLessonIds.has(a.lessonId);
    });
  };
  const modules = Array.from(moduleMap.values())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter(
      (m) =>
        topLevel(m.id).length > 0 ||
        moduleQuizzes(m.id).length > 0 ||
        orphanLessonQuizzes(m.id).length > 0,
    );

  const openLesson = (id: string) =>
    router.push({
      pathname: '/course/[courseId]/learn/[lessonId]',
      params: { courseId: course.id, lessonId: id },
    });
  const openQuiz = (id: string) =>
    router.push({
      pathname: '/quiz/[assessmentId]',
      params: { assessmentId: id, courseId: course.id },
    });

  const handleRemoveModule = (m: OfflineModule) => {
    Alert.alert(
      t('courses.removeModuleTitle', { defaultValue: 'Remove Module' }),
      t('courses.removeModuleConfirm', {
        defaultValue: 'Delete {{title}} from your offline storage?',
        title: m.title,
      }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('common.remove', { defaultValue: 'Remove' }),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeModuleDownload(course.id, m.id);
              const [remainingModules, remainingLessons, remainingAssessments] = await Promise.all([
                offlineDb.getModulesForCourse(course.id),
                offlineDb.getLessonsForCourse(course.id),
                offlineDb.getAssessmentsForCourse(course.id),
              ]);
              const remainingAttachments = (
                await Promise.all(
                  remainingLessons.map((l) => offlineDb.getAttachmentsForLesson(l.id)),
                )
              ).flat();
              const latest = await Promise.all(
                remainingAssessments.map((a) => offlineDb.getLatestQuizAttempt(a.id)),
              );
              const attempts = Object.fromEntries(
                remainingAssessments.map((a, i) => [a.id, latest[i]]),
              );
              setDetails({
                modules: remainingModules,
                lessons: remainingLessons,
                assessments: remainingAssessments,
                attachments: remainingAttachments,
                attempts,
              });
            } catch (err: any) {
              Alert.alert(t('common.somethingWrong', { defaultValue: 'Error' }), err?.message);
            }
          },
        },
      ],
    );
  };

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {/* Header — tap to show the downloaded lessons */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        className="gap-3 p-4 active:bg-slate-50 dark:active:bg-slate-800"
      >
        <View className="flex-row items-start gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/40">
            <BookOpen size={22} color={colors.primary} />
          </View>
          <View className="flex-1 gap-1">
            <View className="flex-row flex-wrap items-center gap-1.5">
              <Badge label={course.code} tone="brand" />
              {coursePassed ? <Badge label={t('offline.passed')} tone="success" /> : null}
            </View>
            <AppText
              className="text-base font-bold text-slate-900 dark:text-white"
              numberOfLines={2}
            >
              {course.title}
            </AppText>
            <AppText variant="caption">
              {t('offline.lessonsSize', {
                count: lessons.length,
                size: formatBytes(course.sizeBytes),
              })}
              {' · '}
              {formatDate(new Date(course.downloadedAt).toISOString(), locale)}
            </AppText>
          </View>
          {open ? (
            <ChevronDown size={20} color={colors.textMuted} />
          ) : (
            <ChevronRight size={20} color={colors.textMuted} />
          )}
        </View>
        {progress.data ? (
          <View className="flex-row items-center gap-2.5">
            <ProgressBar
              percent={percent}
              tone={coursePassed ? 'success' : 'brand'}
              className="flex-1"
            />
            <AppText className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {percent}%
            </AppText>
          </View>
        ) : null}
      </Pressable>

      {open ? (
        <View className="gap-4 border-t border-slate-100 px-3 pb-4 pt-3 dark:border-slate-800">
          {modules.map((m, index) => (
            <View key={m.id} className="gap-1">
              <View className="flex-row items-center justify-between px-1 pb-1">
                <AppText className="flex-1 pr-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('overview.moduleEyebrow', { number: index + 1 })} · {m.title}
                </AppText>
                <Pressable
                  onPress={() => handleRemoveModule(m)}
                  className="rounded p-1 active:opacity-60"
                  accessibilityRole="button"
                  accessibilityLabel={`Remove module ${m.title}`}
                >
                  <Trash2 size={13} color={palette.danger} />
                </Pressable>
              </View>
              {topLevel(m.id).map((lesson) => (
                <View key={lesson.id}>
                  <Row
                    icon={isMedia(lesson.contentType) ? PlayCircle : FileText}
                    title={lesson.title}
                    status={lessonStatus(lesson)}
                    onPress={() => openLesson(lesson.id)}
                  />
                  {subsOf(lesson.id).map((sub) => (
                    <View key={sub.id}>
                      <Row
                        indent
                        icon={isMedia(sub.contentType) ? PlayCircle : FileText}
                        title={sub.title}
                        status={lessonStatus(sub)}
                        onPress={() => openLesson(sub.id)}
                      />
                      {quizzesFor(sub.id).map((quiz) => (
                        <Row
                          key={quiz.id}
                          indent
                          quiz
                          icon={ClipboardCheck}
                          title={quiz.title}
                          status={quizStatus(quiz)}
                          onPress={() => openQuiz(quiz.id)}
                        />
                      ))}
                    </View>
                  ))}
                  {quizzesFor(lesson.id).map((quiz) => (
                    <Row
                      key={quiz.id}
                      indent
                      quiz
                      icon={ClipboardCheck}
                      title={quiz.title}
                      status={quizStatus(quiz)}
                      onPress={() => openQuiz(quiz.id)}
                    />
                  ))}
                </View>
              ))}
              {[...moduleQuizzes(m.id), ...orphanLessonQuizzes(m.id)].map((quiz) => (
                <Row
                  key={quiz.id}
                  quiz
                  icon={ClipboardCheck}
                  title={quiz.title}
                  status={quizStatus(quiz)}
                  onPress={() => openQuiz(quiz.id)}
                />
              ))}
            </View>
          ))}

          {details && details.attachments.length > 0 ? (
            <View className="gap-1">
              <AppText className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('offline.documents')}
              </AppText>
              {details.attachments.map((att) => (
                <Row
                  key={att.id}
                  icon={FileText}
                  title={att.fileName}
                  status={null}
                  onPress={() =>
                    void downloadAndOpen({
                      url: att.localFileUri || att.fileUrl,
                      fileName: att.fileName || 'document.pdf',
                      mimeType: att.fileType || 'application/pdf',
                    })
                  }
                />
              ))}
            </View>
          ) : null}

          <View className="flex-row items-center gap-2 pt-1">
            <View className="flex-1">
              <Button
                title={t('offline.studyOffline')}
                size="sm"
                icon={<BookOpen size={16} color="#fff" />}
                onPress={() =>
                  router.push({ pathname: '/course/[courseId]', params: { courseId: course.id } })
                }
                fullWidth
              />
            </View>
            <Pressable
              onPress={onRemove}
              accessibilityRole="button"
              accessibilityLabel={t('offline.removeTitle')}
              className="h-9 w-9 items-center justify-center rounded-lg bg-red-50 active:opacity-70 dark:bg-red-950/40"
            >
              <Trash2 size={17} color={palette.danger} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function Row({
  icon: Icon,
  title,
  status,
  onPress,
  indent = false,
  quiz = false,
}: {
  icon: typeof FileText;
  title: string;
  status: Status;
  onPress: () => void;
  indent?: boolean;
  quiz?: boolean;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ marginLeft: indent ? 18 : 0 }}
      className={cn(
        'flex-row items-center gap-2.5 rounded-xl px-2.5 py-2.5 active:bg-slate-100 dark:active:bg-slate-800',
        quiz && 'bg-brand-50/60 dark:bg-brand-900/20',
      )}
    >
      {status === 'passed' ? (
        <CircleCheck size={17} color={colors.success} />
      ) : (
        <Icon size={17} color={quiz ? colors.primary : colors.textMuted} />
      )}
      <AppText className="flex-1 text-sm text-slate-800 dark:text-slate-100" numberOfLines={1}>
        {title}
      </AppText>
      {status === 'passed' ? (
        <Badge label={t('offline.passed')} tone="success" />
      ) : status === 'pending' ? (
        <Badge label={t('offline.waitingSync')} tone="warning" />
      ) : status === 'failed' ? (
        <Badge label={t('offline.notPassed')} tone="danger" />
      ) : null}
    </Pressable>
  );
}
