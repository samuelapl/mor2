import {
  Award,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Layers,
  Trophy,
  Video,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText, Badge, Card, LockBadge, ProgressBar } from '@/components/ui';
import { useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';
import type {
  CourseProgress,
  LessonProgress,
  ProgressAssessment,
  SubLessonProgress,
} from '@/features/progress';
import type { ApiCertificate } from '@/features/certificates';

import type {
  ApiAssessmentSummary,
  ApiCourseDetail,
  ApiCourseLesson,
  ApiCourseModule,
} from '../types/course.types';
import { ContentTypeIcon } from './ContentTypeIcon';

export interface CourseSyllabusProps {
  course: ApiCourseDetail;
  /** Present only when enrolled (spec §6.1). */
  progress?: CourseProgress;
  onOpenLesson: (lessonId: string) => void;
  onOpenAssessment: (assessmentId: string) => void;
  onOpenCertificate?: () => void;
  certificate?: ApiCertificate | null;
  /** Opens the Course Overview & Objectives screen (enrolled only). */
  onOpenCourseOverview?: () => void;
  /** Opens a module's Overview & Objectives screen (enrolled only). */
  onOpenModuleOverview?: (moduleId: string) => void;
  /** Lesson currently open in the player — highlighted, and its module starts expanded. */
  activeLessonId?: string;
  /** Opens the course's live sessions (shown when the course has any). */
  onOpenLiveSessions?: () => void;
}

const byOrder = <T extends { order: number }>(items: T[]) =>
  [...items].sort((a, b) => a.order - b.order);

/**
 * Module → lesson → sub-lesson tree (architecture §6.3).
 * Structure and `unlocked` come from GET /courses/:id; completion from GET /progress/courses/:id.
 * The client never computes locks itself.
 */
export function CourseSyllabus({
  course,
  progress,
  onOpenLesson,
  onOpenAssessment,
  onOpenCertificate,
  certificate,
  onOpenCourseOverview,
  onOpenModuleOverview,
  activeLessonId,
  onOpenLiveSessions,
}: CourseSyllabusProps) {
  const { t } = useTranslation();
  const finalAssessment = course.assessments[0];
  const finalProgress = progress?.courseCompletion.finalAssessment ?? null;

  const contentCompleted = progress?.courseCompletion.contentCompleted ?? false;
  const finalPassed = progress?.courseCompletion.finalAssessmentPassed ?? false;
  const isCertificateUnlocked =
    course.enrolled &&
    (progress?.courseCompletion.certificateEligible ??
      (contentCompleted && (!finalAssessment || finalPassed)));

  const moduleProgress = new Map(progress?.modules.map((m) => [m.moduleId, m]));
  const isOpenProgression = progress?.progressionMode === 'OPEN';
  const lessonProgress = new Map<string, LessonProgress | SubLessonProgress>();
  progress?.modules.forEach((m) =>
    m.lessons.forEach((l) => {
      lessonProgress.set(l.lessonId, l);
      l.subLessons.forEach((s) => lessonProgress.set(s.lessonId, s));
    }),
  );

  return (
    <View className="gap-3">
      {course.enrolled && onOpenCourseOverview ? (
        <OverviewRow
          variant="course"
          title={t('overview.courseRowTitle')}
          subtitle={t('overview.courseRowSubtitle')}
          onPress={onOpenCourseOverview}
        />
      ) : null}
      {byOrder(course.modules).map((module, index) => (
        <ModuleSection
          key={module.id}
          index={index}
          module={module}
          progress={moduleProgress.get(module.id)}
          lessonProgress={lessonProgress}
          enrolled={course.enrolled}
          isOpenProgression={isOpenProgression}
          onOpenLesson={onOpenLesson}
          onOpenAssessment={onOpenAssessment}
          onOpenOverview={
            course.enrolled && onOpenModuleOverview
              ? () => onOpenModuleOverview(module.id)
              : undefined
          }
          activeLessonId={activeLessonId}
        />
      ))}

      {course.enrolled && onOpenLiveSessions && (progress?.liveSessions?.length ?? 0) > 0 ? (
        <LiveSessionsRow sessions={progress!.liveSessions!} onPress={onOpenLiveSessions} />
      ) : null}

      {finalAssessment ? (
        <AssessmentRow
          icon="final"
          label={t('courses.finalAssessment')}
          assessment={finalAssessment}
          progress={finalProgress}
          // Final eligibility is enforced on start (spec §7.3); show it open once content is done.
          unlocked={course.enrolled && (progress?.courseCompletion.contentCompleted ?? false)}
          onPress={() => onOpenAssessment(finalAssessment.id)}
        />
      ) : null}

      {/* Course Certificate of Completion (always placed below final assessment, matching web) */}
      {course.enrolled ? (
        <CertificateSyllabusRow
          unlocked={isCertificateUnlocked}
          hasCertificate={Boolean(certificate)}
          onPress={() => onOpenCertificate?.()}
        />
      ) : null}
    </View>
  );
}

interface ModuleSectionProps {
  index: number;
  module: ApiCourseModule;
  progress?: CourseProgress['modules'][number];
  lessonProgress: Map<string, LessonProgress | SubLessonProgress>;
  enrolled: boolean;
  isOpenProgression?: boolean;
  onOpenLesson: (lessonId: string) => void;
  onOpenAssessment: (assessmentId: string) => void;
  onOpenOverview?: () => void;
  activeLessonId?: string;
}

const containsLesson = (lessons: ApiCourseLesson[], id: string | undefined): boolean =>
  Boolean(id) && lessons.some((l) => l.id === id || containsLesson(l.subLessons ?? [], id));

function ModuleSection({
  index,
  module,
  progress,
  lessonProgress,
  enrolled,
  isOpenProgression = false,
  onOpenLesson,
  onOpenAssessment,
  onOpenOverview,
  activeLessonId,
}: ModuleSectionProps) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const unlocked = progress?.unlocked ?? module.unlocked;
  const [open, setOpen] = useState(
    containsLesson(module.lessons, activeLessonId) ||
      (!activeLessonId && unlocked && !(progress?.moduleCompleted ?? false)),
  );
  const moduleQuiz = module.assessments[0];
  const totalLessons = progress?.totalLessons ?? module.lessons.length;
  const completedLessons = progress?.completedLessons ?? 0;
  const allLessonsDone = totalLessons > 0 && completedLessons >= totalLessons;
  const isModuleQuizUnlocked = enrolled && (isOpenProgression ? true : unlocked && allLessonsDone);

  return (
    <Card className="overflow-hidden p-0">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        className="flex-row items-center gap-3 p-4 active:bg-slate-50 dark:active:bg-slate-700"
      >
        <View
          className={cn(
            'h-9 w-9 items-center justify-center rounded-full',
            progress?.moduleCompleted
              ? 'bg-green-100 dark:bg-green-900'
              : 'bg-brand-50 dark:bg-brand-900',
          )}
        >
          {progress?.moduleCompleted ? (
            <CircleCheck size={20} color={colors.success} />
          ) : (
            <AppText className="font-bold text-brand-700 dark:text-brand-200">{index + 1}</AppText>
          )}
        </View>
        <View className="flex-1 gap-1">
          <AppText className="font-semibold text-slate-900 dark:text-slate-50">
            {localized(module, 'title')}
          </AppText>
          {progress ? (
            <View className="flex-row items-center gap-2">
              <ProgressBar
                percent={progress.progressPercent}
                tone={progress.moduleCompleted ? 'success' : 'brand'}
                className="flex-1"
              />
              <AppText variant="caption">
                {t('courses.lessonsDone', {
                  done: progress.completedLessons,
                  total: progress.totalLessons,
                })}
              </AppText>
            </View>
          ) : (
            <AppText variant="caption">
              {t('courses.lessonCount', { count: module.lessons.length })}
            </AppText>
          )}
        </View>
        {!unlocked ? <LockBadge /> : null}
        {open ? (
          <ChevronDown size={18} color={colors.textMuted} />
        ) : (
          <ChevronRight size={18} color={colors.textMuted} />
        )}
      </Pressable>

      {open ? (
        <View className="border-t border-slate-100 dark:border-slate-700">
          {onOpenOverview ? (
            <View className="px-2 pt-2">
              <OverviewRow
                variant="module"
                title={t('overview.moduleRowTitle')}
                disabled={!unlocked}
                onPress={onOpenOverview}
              />
            </View>
          ) : null}
          {byOrder(module.lessons).map((lesson) => (
            <LessonRows
              key={lesson.id}
              lesson={lesson}
              lessonProgress={lessonProgress}
              enrolled={enrolled}
              isOpenProgression={isOpenProgression}
              onOpenLesson={onOpenLesson}
              onOpenAssessment={onOpenAssessment}
              activeLessonId={activeLessonId}
            />
          ))}
          {moduleQuiz ? (
            <View className="px-2 pb-2">
              <AssessmentRow
                icon="quiz"
                label={localized(moduleQuiz, 'title') || t('courses.quiz')}
                assessment={moduleQuiz}
                progress={progress?.assessment ?? null}
                unlocked={isModuleQuizUnlocked}
                onPress={() => onOpenAssessment(moduleQuiz.id)}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

interface LessonRowsProps {
  lesson: ApiCourseLesson;
  lessonProgress: Map<string, LessonProgress | SubLessonProgress>;
  enrolled: boolean;
  isOpenProgression?: boolean;
  depth?: number;
  parentCompleted?: boolean;
  onOpenLesson: (lessonId: string) => void;
  onOpenAssessment: (assessmentId: string) => void;
  activeLessonId?: string;
}

function LessonRows({
  lesson,
  lessonProgress,
  enrolled,
  isOpenProgression = false,
  depth = 0,
  parentCompleted = true,
  onOpenLesson,
  onOpenAssessment,
  activeLessonId,
}: LessonRowsProps) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const p = lessonProgress.get(lesson.id);
  const rawUnlocked = enrolled && (p?.unlocked ?? lesson.unlocked);
  const unlocked = isOpenProgression
    ? enrolled
    : depth > 0
      ? Boolean(parentCompleted && rawUnlocked)
      : rawUnlocked;
  const completed = p?.completed ?? false;
  const active = lesson.id === activeLessonId;
  const lessonQuiz = lesson.assessments?.[0];
  const quizProgress = p && 'assessment' in p ? (p.assessment as ProgressAssessment | null) : null;
  const allSubsDone =
    (lesson.subLessons?.length ?? 0) === 0 ||
    (lesson.subLessons ?? []).every((s) => lessonProgress.get(s.id)?.completed);
  const isLessonQuizUnlocked =
    enrolled && (isOpenProgression ? true : unlocked && completed && allSubsDone);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !unlocked }}
        disabled={!unlocked}
        onPress={() => onOpenLesson(lesson.id)}
        style={{ paddingLeft: 16 + depth * 20 }}
        className={cn(
          'flex-row items-center gap-3 py-3 pr-4 active:bg-slate-50 dark:active:bg-slate-700',
          active && 'bg-brand-50 dark:bg-brand-900/40',
          !unlocked && 'opacity-60',
        )}
      >
        {active ? (
          <View className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-brand-600" />
        ) : null}
        {completed ? (
          <CircleCheck size={18} color={colors.success} />
        ) : (
          <ContentTypeIcon
            type={lesson.contentType}
            color={unlocked ? colors.primary : colors.textMuted}
          />
        )}
        <View className="flex-1">
          <AppText
            className={cn(
              'text-sm text-slate-800 dark:text-slate-100',
              active && 'font-semibold text-brand-700 dark:text-brand-200',
            )}
            numberOfLines={2}
          >
            {localized(lesson, 'title')}
          </AppText>
          {lesson.durationMinutes ? (
            <AppText variant="caption">
              {t('courses.minutes', { count: lesson.durationMinutes })}
            </AppText>
          ) : null}
        </View>
        {!unlocked ? <LockBadge /> : null}
      </Pressable>

      {byOrder(lesson.subLessons ?? []).map((sub, sIdx, allSubs) => {
        const prevSubsDone = allSubs
          .slice(0, sIdx)
          .every((prevSub) => lessonProgress.get(prevSub.id)?.completed);
        const canUnlockSub = completed && (sIdx === 0 || prevSubsDone);
        return (
          <LessonRows
            key={sub.id}
            lesson={sub}
            lessonProgress={lessonProgress}
            enrolled={enrolled}
            isOpenProgression={isOpenProgression}
            depth={depth + 1}
            parentCompleted={canUnlockSub}
            onOpenLesson={onOpenLesson}
            onOpenAssessment={onOpenAssessment}
            activeLessonId={activeLessonId}
          />
        );
      })}

      {lessonQuiz ? (
        <View style={{ paddingLeft: 8 + (depth + 1) * 20 }} className="pb-2 pr-2">
          <AssessmentRow
            icon="quiz"
            label={localized(lessonQuiz, 'title') || t('courses.quiz')}
            assessment={lessonQuiz}
            progress={quizProgress}
            unlocked={isLessonQuizUnlocked}
            onPress={() => onOpenAssessment(lessonQuiz.id)}
          />
        </View>
      ) : null}
    </>
  );
}

interface OverviewRowProps {
  variant: 'course' | 'module';
  title: string;
  subtitle?: string;
  disabled?: boolean;
  onPress: () => void;
}

/** "Course / Module Overview & Objectives" entries (web classroom sidebar parity). */
function OverviewRow({ variant, title, subtitle, disabled = false, onPress }: OverviewRowProps) {
  const colors = useThemeColors();
  const Icon = variant === 'course' ? BookOpen : Layers;

  if (variant === 'module') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        className={cn(
          'flex-row items-center gap-3 rounded-xl px-2 py-2.5 active:bg-slate-50 dark:active:bg-slate-700',
          disabled && 'opacity-60',
        )}
      >
        <Icon size={18} color={colors.primary} />
        <AppText className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">
          {title}
        </AppText>
        <ChevronRight size={16} color={colors.textMuted} />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3.5 active:opacity-80 dark:border-brand-800 dark:bg-brand-900/30"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
        <Icon size={20} color="#fff" />
      </View>
      <View className="flex-1">
        <AppText className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
      <ChevronRight size={18} color={colors.primary} />
    </Pressable>
  );
}

function LiveSessionsRow({
  sessions,
  onPress,
}: {
  sessions: NonNullable<CourseProgress['liveSessions']>;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const live = sessions.some((s) => s.status === 'LIVE');
  const held = sessions.filter((s) => s.status === 'COMPLETED').length;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3.5 active:opacity-80 dark:border-sky-900 dark:bg-sky-950/30"
    >
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/50">
        <Video size={19} color="#0284c7" />
      </View>
      <View className="flex-1">
        <AppText className="text-sm font-bold text-slate-900 dark:text-white">
          {t('courseSessions.title')}
        </AppText>
        <AppText variant="caption">
          {t('courseSessions.heldOf', { held, total: sessions.length })}
        </AppText>
      </View>
      {live ? <Badge label={t('courseSessions.liveNow')} tone="live" /> : null}
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

interface AssessmentRowProps {
  icon: 'quiz' | 'final';
  label: string;
  assessment: ApiAssessmentSummary;
  progress: ProgressAssessment | null;
  unlocked: boolean;
  onPress: () => void;
}

function AssessmentRow({
  icon,
  label,
  assessment,
  progress,
  unlocked,
  onPress,
}: AssessmentRowProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const Icon = icon === 'final' ? Trophy : ClipboardCheck;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !unlocked }}
      disabled={!unlocked}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 rounded-xl border border-dashed border-brand-200 bg-brand-50 p-3 active:opacity-80 dark:border-brand-800 dark:bg-slate-900',
        !unlocked && 'opacity-60',
      )}
    >
      <Icon size={18} color={colors.primary} />
      <View className="flex-1">
        <AppText className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {label}
        </AppText>
        <AppText variant="caption">
          {assessment.passingScore}%
          {assessment.timeLimitMinutes
            ? ` · ${t('courses.minutes', { count: assessment.timeLimitMinutes })}`
            : ''}
        </AppText>
      </View>
      {progress?.passed ? <Badge label={t('courses.assessmentPassed')} tone="success" /> : null}
      {!unlocked ? <LockBadge /> : null}
    </Pressable>
  );
}

interface CertificateSyllabusRowProps {
  unlocked: boolean;
  hasCertificate: boolean;
  onPress: () => void;
}

function CertificateSyllabusRow({
  unlocked,
  hasCertificate,
  onPress,
}: CertificateSyllabusRowProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !unlocked }}
      disabled={!unlocked}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 rounded-xl border border-dashed border-amber-300/80 bg-amber-50/70 p-3.5 active:opacity-80 dark:border-amber-700/60 dark:bg-amber-950/20',
        !unlocked && 'opacity-60',
      )}
    >
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
        <Award size={20} color={colors.warning} />
      </View>
      <View className="flex-1">
        <AppText className="text-sm font-bold text-slate-900 dark:text-white">
          {t('certificates.ofCompletion', { defaultValue: 'Certificate of Completion' })}
        </AppText>
        <AppText variant="caption" className="text-slate-500 dark:text-slate-400">
          {hasCertificate
            ? t('certificates.issuedSubtitle', {
                defaultValue: 'Official credential issued · Tap to view & download',
              })
            : unlocked
              ? t('certificates.unlockedSubtitle', {
                  defaultValue: 'Requirements met · Tap to complete survey & claim',
                })
              : t('certificates.lockedSubtitle', {
                  defaultValue: 'Locked · Complete coursework & final assessment',
                })}
        </AppText>
      </View>
      {hasCertificate ? (
        <Badge label={t('certificates.claimed', { defaultValue: 'Claimed' })} tone="success" />
      ) : unlocked ? (
        <Badge label={t('certificates.available', { defaultValue: 'Available' })} tone="brand" />
      ) : (
        <LockBadge />
      )}
    </Pressable>
  );
}
