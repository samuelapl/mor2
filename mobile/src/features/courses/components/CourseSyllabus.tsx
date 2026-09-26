import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Trophy,
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
}: CourseSyllabusProps) {
  const { t } = useTranslation();
  const finalAssessment = course.assessments[0];
  const finalProgress = progress?.courseCompletion.finalAssessment ?? null;

  const moduleProgress = new Map(progress?.modules.map((m) => [m.moduleId, m]));
  const lessonProgress = new Map<string, LessonProgress | SubLessonProgress>();
  progress?.modules.forEach((m) =>
    m.lessons.forEach((l) => {
      lessonProgress.set(l.lessonId, l);
      l.subLessons.forEach((s) => lessonProgress.set(s.lessonId, s));
    }),
  );

  return (
    <View className="gap-3">
      <AppText variant="heading">{t('courses.syllabus')}</AppText>
      {byOrder(course.modules).map((module, index) => (
        <ModuleSection
          key={module.id}
          index={index}
          module={module}
          progress={moduleProgress.get(module.id)}
          lessonProgress={lessonProgress}
          enrolled={course.enrolled}
          onOpenLesson={onOpenLesson}
          onOpenAssessment={onOpenAssessment}
        />
      ))}

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
    </View>
  );
}

interface ModuleSectionProps {
  index: number;
  module: ApiCourseModule;
  progress?: CourseProgress['modules'][number];
  lessonProgress: Map<string, LessonProgress | SubLessonProgress>;
  enrolled: boolean;
  onOpenLesson: (lessonId: string) => void;
  onOpenAssessment: (assessmentId: string) => void;
}

function ModuleSection({
  index,
  module,
  progress,
  lessonProgress,
  enrolled,
  onOpenLesson,
  onOpenAssessment,
}: ModuleSectionProps) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const unlocked = progress?.unlocked ?? module.unlocked;
  const [open, setOpen] = useState(unlocked && !(progress?.moduleCompleted ?? false));
  const moduleQuiz = module.assessments[0];

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
          {byOrder(module.lessons).map((lesson) => (
            <LessonRows
              key={lesson.id}
              lesson={lesson}
              lessonProgress={lessonProgress}
              enrolled={enrolled}
              onOpenLesson={onOpenLesson}
              onOpenAssessment={onOpenAssessment}
            />
          ))}
          {moduleQuiz ? (
            <View className="px-2 pb-2">
              <AssessmentRow
                icon="quiz"
                label={localized(moduleQuiz, 'title') || t('courses.quiz')}
                assessment={moduleQuiz}
                progress={progress?.assessment ?? null}
                unlocked={enrolled && unlocked}
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
  depth?: number;
  onOpenLesson: (lessonId: string) => void;
  onOpenAssessment: (assessmentId: string) => void;
}

function LessonRows({
  lesson,
  lessonProgress,
  enrolled,
  depth = 0,
  onOpenLesson,
  onOpenAssessment,
}: LessonRowsProps) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const p = lessonProgress.get(lesson.id);
  const unlocked = enrolled && (p?.unlocked ?? lesson.unlocked);
  const completed = p?.completed ?? false;
  const lessonQuiz = lesson.assessments?.[0];
  const quizProgress = p && 'assessment' in p ? (p.assessment as ProgressAssessment | null) : null;

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
          !unlocked && 'opacity-60',
        )}
      >
        {completed ? (
          <CircleCheck size={18} color={colors.success} />
        ) : (
          <ContentTypeIcon
            type={lesson.contentType}
            color={unlocked ? colors.primary : colors.textMuted}
          />
        )}
        <View className="flex-1">
          <AppText className="text-sm text-slate-800 dark:text-slate-100" numberOfLines={2}>
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

      {byOrder(lesson.subLessons ?? []).map((sub) => (
        <LessonRows
          key={sub.id}
          lesson={sub}
          lessonProgress={lessonProgress}
          enrolled={enrolled}
          depth={depth + 1}
          onOpenLesson={onOpenLesson}
          onOpenAssessment={onOpenAssessment}
        />
      ))}

      {lessonQuiz ? (
        <View style={{ paddingLeft: 8 + (depth + 1) * 20 }} className="pb-2 pr-2">
          <AssessmentRow
            icon="quiz"
            label={localized(lessonQuiz, 'title') || t('courses.quiz')}
            assessment={lessonQuiz}
            progress={quizProgress}
            unlocked={unlocked}
            onPress={() => onOpenAssessment(lessonQuiz.id)}
          />
        </View>
      ) : null}
    </>
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
