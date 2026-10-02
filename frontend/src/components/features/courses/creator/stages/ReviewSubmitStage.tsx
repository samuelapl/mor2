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
} from 'lucide-react';
import type { CourseDeliveryMode, CourseLevel, Question, UploadedResource } from '@/types';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { ModuleDraft } from '../../wizard-types';
import { StepReviewSubmit } from '../../StepReviewSubmit';
import type { CreatorActiveNode } from '../types';

export interface ReviewSubmitStageProps {
  title: string;
  titleAm?: string;
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
  titleAm,
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
  assessmentFileUrl,
  assessmentFileName,
  assessmentFileSize,
  saving = false,
  onSubmitForApproval,
  onSaveDraft,
  onSelectNode,
}: ReviewSubmitStageProps) {
  const { tBilingual } = useTranslation();

  // Calculate stats
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const totalModuleAssessments = modules.filter((m) =>
    m.lessons.some(
      (l) =>
        l.contentType === 'ASSESSMENT' ||
        l.contentType === 'QUIZ' ||
        l.title.toLowerCase().includes('module assessment'),
    ),
  ).length;

  // Calculate assessment weights
  let calculatedWeights = finalAssessmentWeight || 0;
  modules.forEach((m) => {
    m.lessons.forEach((l) => {
      if (l.quizWeight) calculatedWeights += l.quizWeight;
      l.subLessons?.forEach((s) => {
        if (s.quizWeight) calculatedWeights += s.quizWeight;
      });
    });
  });

  const isTitleValid = Boolean(title.trim());
  const isModulesValid = modules.length > 0 && totalLessons > 0;
  const isWeightValid = calculatedWeights === 100;
  const isReadyToSubmit = isTitleValid && isModulesValid;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Pre-flight Validation Checklist Banner */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              {tBilingual('Course Pre-flight Checklist & Submission', 'የኮርስ ዝግጁነት ማረጋገጫ እና ማስረከቢያ')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {tBilingual(
                'Review your syllabus, assessments, and configuration before submitting for approval.',
                'ለማጽደቅ ከማስገባትዎ በፊት የስርዓተ-ትምህርቱን፣ ምዘናዎችን እና ቅንብሮችን ይገምግሙ።',
              )}
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
              {tBilingual('Save as Draft', 'ረቂቅ አድርገህ አስቀምጥ')}
            </Button>
            <Button
              variant="primary"
              disabled={!isReadyToSubmit || saving}
              isLoading={saving}
              onClick={onSubmitForApproval}
              className="gap-2 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold px-4"
            >
              <Send className="h-3.5 w-3.5" />
              {tBilingual('Submit for Approval', 'ለማጽደቅ አስገባ')}
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
                ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                : 'border-rose-200 bg-rose-50/50 hover:bg-rose-50',
            )}
          >
            {isTitleValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800">
                {tBilingual('Course Information', 'የኮርስ መረጃ')}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {isTitleValid ? title : tBilingual('Title required', 'ርዕስ ያስፈልጋል')}
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
                ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                : 'border-amber-200 bg-amber-50/50 hover:bg-amber-50',
            )}
          >
            {isModulesValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800">
                {tBilingual('Curriculum & Content', 'ስርዓተ-ትምህርት እና ይዘት')}
              </p>
              <p className="text-[11px] text-slate-500">
                {modules.length} {tBilingual('modules', 'ሞጁሎች')}, {totalLessons}{' '}
                {tBilingual('lessons', 'ትምህርቶች')}
              </p>
            </div>
          </div>

          {/* 3. Assessment & Weights status */}
          <div
            onClick={() => onSelectNode({ type: 'FINAL_ASSESSMENT' })}
            className={cn(
              'p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5',
              isWeightValid
                ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                : 'border-amber-200 bg-amber-50/50 hover:bg-amber-50',
            )}
          >
            {isWeightValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800">
                {tBilingual('Assessment Weights', 'የምዘና ክብደት')}
              </p>
              <p className="text-[11px] text-slate-500">
                {tBilingual('Total:', 'ድምር:')} {calculatedWeights}%{' '}
                {isWeightValid ? '✓' : `(${100 - calculatedWeights}% unallocated)`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Full Learner-style Review */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            {tBilingual('Learner Preview & Detailed Syllabus', 'የተማሪ ቅድመ-እይታ እና ዝርዝር ይዘት')}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {tBilingual(
              'This matches how enrolled learners experience the course overview and modules.',
              'ይህ ተማሪዎች ሲመዘገቡ የሚያዩትን አቀራረብ ይከተላል።',
            )}
          </p>
        </div>

        <StepReviewSubmit
          title={title}
          titleAm={titleAm}
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
