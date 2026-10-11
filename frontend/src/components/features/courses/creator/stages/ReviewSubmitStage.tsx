'use client';

import React from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  FileCheck,
  HelpCircle,
  Layers,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react';
import type { CourseDeliveryMode, CourseLevel, Question, UploadedResource } from '@/types';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { ModuleDraft } from '../../wizard-types';
import { StepReviewSubmit } from '../../StepReviewSubmit';
import type { CreatorActiveNode } from '../types';
import { computeWeightTotal, hasAnyAssessment, isModuleAssessmentLesson, isLessonAssessmentSub, pointsMismatch } from '../weights';
import type { SessionPlanDraft } from '../types';

export interface ReviewSubmitStageProps {
  title: string;
  code: string;
  category: string;
  level: CourseLevel;
  deliveryMode?: CourseDeliveryMode;
  description: string;
  objectives: string;
  department?: string;
  targetAudience?: string;
  prerequisites?: string;
  coverPreview?: string | null;
  modules: ModuleDraft[];
  quizTitle?: string;
  passMark: number;
  timeLimitMinutes: number | null;
  attemptsAllowed: number;
  allowEarlySubmission?: boolean;
  autoSubmitOnExpire?: boolean;
  questions: Question[];
  finalAssessmentWeight?: number;
  assessmentResources?: UploadedResource[];
  /** Planned online sessions (empty when the course has none). */
  sessionPlans?: SessionPlanDraft[];
  assessmentFileUrl?: string;
  assessmentFileName?: string;
  assessmentFileSize?: number;
  saving?: boolean;
  onSubmitForApproval: () => Promise<void>;
  onSaveDraft: () => Promise<void>;
  onSelectNode: (node: CreatorActiveNode) => void;
}

export function ReviewSubmitStage({
  title,
  code,
  category,
  level,
  deliveryMode,
  description,
  objectives,
  department,
  targetAudience,
  prerequisites,
  coverPreview,
  modules,
  quizTitle,
  passMark,
  timeLimitMinutes,
  attemptsAllowed,
  allowEarlySubmission,
  autoSubmitOnExpire,
  questions,
  finalAssessmentWeight = 60,
  assessmentResources,
  sessionPlans = [],
  assessmentFileUrl,
  assessmentFileName,
  assessmentFileSize,
  saving = false,
  onSubmitForApproval,
  onSaveDraft,
  onSelectNode,
}: ReviewSubmitStageProps) {
  const { t } = useTranslation('courses');

  // Calculate stats — assessment rows live inline in the draft tree but are saved
  // as separate assessment records, so they are not counted as lessons.
  const totalLessons = modules.reduce(
    (acc, m) => acc + m.lessons.filter((l) => !isModuleAssessmentLesson(l)).length,
    0,
  );
  const totalModuleAssessments = modules.filter((m) =>
    m.lessons.some(
      (l) =>
        l.contentType === 'ASSESSMENT' ||
        l.contentType === 'QUIZ' ||
        l.title.toLowerCase().includes('module assessment'),
    ),
  ).length;

  // Same total the studio and the backend submit check use.
  const calculatedWeights = computeWeightTotal(modules, { weight: finalAssessmentWeight, questionCount: questions.length }, sessionPlans);
  const gradedCourse = hasAnyAssessment(modules, questions.length, sessionPlans);

  // Blocking problems: anything here prevents submission.
  const issues: { message: string; node: CreatorActiveNode }[] = [];
  if (!code.trim()) issues.push({ message: t('reviewSubmitStage.courseCodeIsRequired'), node: { type: 'COURSE_DETAILS' } });
  if (modules.length === 0) issues.push({ message: t('reviewSubmitStage.addAtLeastOneModule'), node: { type: 'COURSE_DETAILS' } });

  const checkQuestions = (qs: Question[] | undefined, weight: number, label: string, node: CreatorActiveNode) => {
    if (!qs || qs.length === 0) {
      issues.push({ message: `${label}: ${t('reviewSubmitStage.hasNoQuestions')}`, node });
      return;
    }
    const mismatch = pointsMismatch(qs, weight);
    if (mismatch) {
      issues.push({
        message: `${label}: ${t('reviewSubmitStage.questionPointsTotalButTheWeight', { total: mismatch.total, required: mismatch.required })}`,
        node,
      });
    }
    qs.forEach((q, i) => {
      const n = `${label} · Q${i + 1}`;
      if (!q.text.trim()) issues.push({ message: `${n}: ${t('reviewSubmitStage.questionTextIsEmpty')}`, node });
      else if (q.type === 'multiple_choice' && q.options.some((o) => !o.trim()))
        issues.push({ message: `${n}: ${t('reviewSubmitStage.hasBlankOptions')}`, node });
      else if (q.type === 'short_answer' && !q.answerText?.trim())
        issues.push({ message: `${n}: ${t('reviewSubmitStage.expectedAnswerIsMissing')}`, node });
    });
  };

  modules.forEach((m, mIdx) => {
    const mLabel = m.title.trim() || `${t('reviewSubmitStage.module')} ${mIdx + 1}`;
    const moduleNode: CreatorActiveNode = { type: 'MODULE', moduleId: m.id };
    if (!m.title.trim()) issues.push({ message: `${mLabel}: ${t('reviewSubmitStage.titleIsMissing')}`, node: moduleNode });
    const lessons = m.lessons.filter((l) => !isModuleAssessmentLesson(l));
    if (lessons.length === 0) issues.push({ message: `${mLabel}: ${t('reviewSubmitStage.hasNoLessons')}`, node: moduleNode });
    m.lessons.filter(isModuleAssessmentLesson).forEach((a) =>
      checkQuestions(a.quizQuestions, a.quizWeight ?? 0, `${mLabel} › ${a.title || 'Module Assessment'}`, { type: 'MODULE_ASSESSMENT', moduleId: m.id }),
    );
    lessons.forEach((l, lIdx) => {
      const lLabel = `${mLabel} › ${l.title.trim() || `${t('creatorSidebar.lesson2')} ${lIdx + 1}`}`;
      if (!l.title.trim())
        issues.push({ message: `${lLabel}: ${t('reviewSubmitStage.titleIsMissing')}`, node: { type: 'LESSON', moduleId: m.id, lessonId: l.id } });
      (l.subLessons ?? []).filter((s) => isLessonAssessmentSub(s)).forEach((a) =>
        checkQuestions(a.quizQuestions, a.quizWeight ?? 0, `${lLabel} › ${a.title || 'Lesson Assessment'}`, {
          type: 'LESSON_ASSESSMENT',
          moduleId: m.id,
          lessonId: l.id,
        }),
      );
    });
  });
  if (questions.length > 0) checkQuestions(questions, finalAssessmentWeight, quizTitle || 'Final Assessment', { type: 'FINAL_ASSESSMENT' });
  sessionPlans.forEach((plan, i) => {
    const label = plan.titleEn.trim() || `${t('reviewSubmitStage.onlineSession')} ${i + 1}`;
    const node: CreatorActiveNode = { type: 'SESSION_PLAN', sessionPlanId: plan.id };
    if (!plan.titleEn.trim()) issues.push({ message: `${label}: ${t('reviewSubmitStage.titleIsMissing')}`, node });
    plan.quizzes.forEach((quiz, qi) => {
      const qLabel = `${label} › ${quiz.titleEn.trim() || `${t('reviewSubmitStage.quiz')} ${qi + 1}`}`;
      if (!quiz.titleEn.trim()) issues.push({ message: `${qLabel}: ${t('reviewSubmitStage.titleIsMissing')}`, node });
      if (!quiz.weight) issues.push({ message: `${qLabel}: ${t('reviewSubmitStage.weightIs0')}`, node });
    });
  });
  if (gradedCourse && calculatedWeights !== 100) {
    issues.push({
      message: t('reviewSubmitStage.assessmentWeightsTotalTheyMustAdd', { calculatedWeights }),
      node: { type: 'FINAL_ASSESSMENT' },
    });
  }

  const isTitleValid = Boolean(title.trim());
  const isModulesValid = modules.length > 0 && totalLessons > 0;
  const isWeightValid = !gradedCourse || calculatedWeights === 100;
  const isReadyToSubmit = isTitleValid && isModulesValid && issues.length === 0;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Pre-flight Validation Checklist Banner */}
      <div className="rounded-2xl border border-border/90 bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              {t('reviewSubmitStage.coursePreFlightChecklistSubmission')}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('reviewSubmitStage.reviewYourSyllabusAssessmentsAndConfigur')}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              isLoading={saving}
              onClick={onSaveDraft}
              className="gap-1.5 shadow-xs text-xs"
            >
              <Save className="h-3.5 w-3.5" />
              {t('creatorHeader.saveAsDraft')}
            </Button>
            <Button
              variant="primary"
              disabled={!isReadyToSubmit || saving}
              isLoading={saving}
              onClick={onSubmitForApproval}
              className="gap-2 shadow-sm bg-primary hover:bg-primary/90 text-xs font-semibold px-4"
            >
              <Send className="h-3.5 w-3.5" />
              {t('reviewSubmitStage.submitForApproval')}
            </Button>
          </div>
        </div>

        {/* Verification Checkpoints */}
        <div className="grid gap-3 sm:grid-cols-3 pt-2">
          {/* 1. Details status */}
          <div
            onClick={() => onSelectNode({ type: 'COURSE_DETAILS' })}
            className={cn(
              'p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5',
              isTitleValid
                ? 'border-success/30 bg-success-soft/50 hover:bg-success-soft'
                : 'border-danger/30 bg-danger-soft/50 hover:bg-danger-soft',
            )}
          >
            {isTitleValid ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">
                {t('reviewSubmitStage.courseInformation')}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {isTitleValid ? title : t('reviewSubmitStage.titleRequired')}
              </p>
            </div>
          </div>

          {/* 2. Curriculum status */}
          <div
            onClick={() => {
              if (modules.length > 0) {
                onSelectNode({ type: 'MODULE', moduleId: modules[0].id });
              }
            }}
            className={cn(
              'p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5',
              isModulesValid
                ? 'border-success/30 bg-success-soft/50 hover:bg-success-soft'
                : 'border-warning/30 bg-warning-soft/50 hover:bg-warning-soft',
            )}
          >
            {isModulesValid ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">
                {t('reviewSubmitStage.curriculumContent')}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {modules.length} {t('reviewSubmitStage.modules')}, {totalLessons}{' '}
                {t('creatorSidebar.lessons')}
              </p>
            </div>
          </div>

          {/* 3. Assessment & Weights status */}
          <div
            onClick={() => onSelectNode({ type: 'FINAL_ASSESSMENT' })}
            className={cn(
              'p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5',
              isWeightValid
                ? 'border-success/30 bg-success-soft/50 hover:bg-success-soft'
                : 'border-warning/30 bg-warning-soft/50 hover:bg-warning-soft',
            )}
          >
            {isWeightValid ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">
                {t('reviewSubmitStage.assessmentWeights')}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t('reviewSubmitStage.total')} {calculatedWeights}%{' '}
                {isWeightValid
                  ? '✓'
                  : calculatedWeights > 100
                    ? `(${calculatedWeights - 100}% over-allocated)`
                    : `(${100 - calculatedWeights}% unallocated)`}
              </p>
            </div>
          </div>
        </div>

        {issues.length > 0 && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft/50 p-4">
            <p className="mb-2 text-xs font-bold text-danger">
              {t('reviewSubmitStage.fixIssueSBeforeSubmitting', { count: issues.length })}
            </p>
            <ul className="space-y-1">
              {issues.map((issue, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onSelectNode(issue.node)}
                    className="flex items-start gap-1.5 text-left text-[11px] text-danger hover:underline"
                  >
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    {issue.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Embedded Full Learner-style Review */}
      <div className="rounded-2xl border border-border/90 bg-card p-6 shadow-xs">
        <div className="border-b border-border/60 pb-4 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-secondary-foreground">
            {t('reviewSubmitStage.learnerPreviewDetailedSyllabus')}
          </h3>
          <p className="text-xs text-subtle-foreground mt-0.5">
            {t('reviewSubmitStage.thisMatchesHowEnrolledLearnersExperience')}
          </p>
        </div>

        {sessionPlans.length > 0 && (
          <div className="mb-6 space-y-2 rounded-xl border border-info/30 bg-info-soft/40 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-info">
              <Video className="h-3.5 w-3.5" />
              {t('reviewSubmitStage.plannedOnlineSessions', { count: sessionPlans.length })}
            </p>
            <ol className="space-y-1.5">
              {sessionPlans.map((plan, i) => (
                <li key={plan.id} className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                  <span className="text-xs font-bold text-subtle-foreground">{i + 1}.</span>
                  <span className="font-medium">{plan.titleEn || t('creatorSidebar.untitledSession')}</span>
                  {plan.quizzes.map((q) => (
                    <span key={q.id} className="rounded-md border border-primary/30 bg-card px-1.5 text-[11px] font-semibold text-primary">
                      {q.titleEn} · {q.weight}% · {t('reviewSubmitStage.pass')} {q.passingScore}%
                    </span>
                  ))}
                </li>
              ))}
            </ol>
            <p className="text-[11px] text-muted-foreground">
              {t('reviewSubmitStage.scheduledWithADateTrainerAnd')}
            </p>
          </div>
        )}

        <StepReviewSubmit
          title={title}
          code={code}
          category={category}
          level={level}
          deliveryMode={deliveryMode}
          description={description}
          objectives={objectives}
          department={department}
          targetAudience={targetAudience}
          prerequisites={prerequisites}
          coverPreview={coverPreview}
          modules={modules}
          quizTitle={quizTitle}
          passMark={passMark}
          finalAssessmentWeight={finalAssessmentWeight}
          timeLimitMinutes={timeLimitMinutes}
          attemptsAllowed={attemptsAllowed}
          allowEarlySubmission={allowEarlySubmission}
          autoSubmitOnExpire={autoSubmitOnExpire}
          questions={questions}
          assessmentResources={assessmentResources}
          assessmentFileUrl={assessmentFileUrl}
          assessmentFileName={assessmentFileName}
          assessmentFileSize={assessmentFileSize}
          onNavigateToStep={(targetIdx) => {
            if (targetIdx === 0) onSelectNode({ type: 'COURSE_DETAILS' });
            else if (targetIdx === 1 && modules[0])
              onSelectNode({ type: 'MODULE', moduleId: modules[0].id });
            else if (targetIdx === 2) onSelectNode({ type: 'FINAL_ASSESSMENT' });
          }}
        />
      </div>
    </div>
  );
}
