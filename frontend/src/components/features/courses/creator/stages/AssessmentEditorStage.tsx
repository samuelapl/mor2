'use client';

import React from 'react';
import {
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileQuestion,
  HelpCircle,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Question, QuestionType, UploadedResource } from '@/types';
import { Button } from '@/components/ui/Button';
import { uploadAttachment } from '@/lib/api/files';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLookupCategories } from '@/lib/api/useLookupCategories';
import { usePolicyPassMark } from '@/lib/api/usePolicyPassMark';
import { cn } from '@/lib/utils';
import { inputClass, labelClass, uid } from '../../wizard-types';
import { CompactRichEditor, MultiFileUploader } from '../../wizard-components';
import { splitEvenly } from '@/components/features/prepared-quiz/quiz-points';
import { pointsMismatch, totalQuestionPoints } from '../weights';

export interface AssessmentEditorStageProps {
  scope: 'FINAL_ASSESSMENT' | 'MODULE_ASSESSMENT' | 'LESSON_ASSESSMENT';
  parentTitle?: string;
  quizTitle: string;
  setQuizTitle: (val: string) => void;
  weight: number;
  setWeight: (val: number) => void;
  /** Most this assessment may weigh so the course total stays at or below 100%. */
  maxWeight?: number;
  totalAllocatedWeight?: number;
  passMark: number;
  setPassMark: (val: number) => void;
  timeLimitMinutes: number | null;
  setTimeLimitMinutes: (val: number) => void;
  attemptsAllowed: number;
  setAttemptsAllowed: (val: number) => void;
  allowEarlySubmission?: boolean;
  setAllowEarlySubmission?: (val: boolean) => void;
  autoSubmitOnExpire?: boolean;
  setAutoSubmitOnExpire?: (val: boolean) => void;
  questions: Question[];
  setQuestions: (updater: (prev: Question[]) => Question[]) => void;
  bankQuestions?: Question[];
  resources?: UploadedResource[];
  legacyUrl?: string;
  legacyName?: string;
  legacySize?: number;
  uploading?: boolean;
  uploadError?: string | null;
  onFileUpload?: (files: File | File[] | FileList) => Promise<void>;
  onFileRemove?: (fileIdOrUrl: string) => void;
  courseId?: string;
}

function blankQuestion(type: QuestionType = 'multiple_choice', category = '', points = 10): Question {
  return {
    id: uid('q'),
    type,
    text: '',
    options: type === 'true_false' ? ['True', 'False'] : ['', '', '', ''],
    correctIndex: 0,
    answerText: '',
    points,
    category,
  };
}

function optionsForType(type: QuestionType): string[] {
  if (type === 'true_false') return ['True', 'False'];
  if (type === 'short_answer') return [];
  return ['', '', '', ''];
}

export function AssessmentEditorStage({
  scope,
  parentTitle,
  quizTitle,
  setQuizTitle,
  weight,
  setWeight,
  maxWeight = 100,
  totalAllocatedWeight,
  passMark,
  setPassMark,
  timeLimitMinutes,
  setTimeLimitMinutes,
  attemptsAllowed,
  setAttemptsAllowed,
  allowEarlySubmission = true,
  setAllowEarlySubmission,
  autoSubmitOnExpire = true,
  setAutoSubmitOnExpire,
  questions,
  setQuestions,
  bankQuestions = [],
  resources = [],
  legacyUrl,
  legacyName,
  legacySize,
  uploading = false,
  uploadError = null,
  onFileUpload,
  onFileRemove,
  courseId,
}: AssessmentEditorStageProps) {
  const { isAmharic, t } = useTranslation('courses');
  const policyPassMark = usePolicyPassMark();
  const { items: dynamicQuestionTypes } = useLookupCategories('QUESTION_TYPE');
  const { items: dynamicCategories } = useLookupCategories('COURSE_CATEGORY');

  const questionTypeOptions =
    dynamicQuestionTypes.length > 0
      ? dynamicQuestionTypes.map((qt) => ({
          value: qt.value.toLowerCase() as QuestionType,
          label: isAmharic && qt.labelAm ? qt.labelAm : qt.labelEn,
        }))
      : [
          { value: 'multiple_choice' as QuestionType, label: 'Multiple Choice' },
          { value: 'true_false' as QuestionType, label: 'True / False' },
          { value: 'short_answer' as QuestionType, label: 'Short Answer' },
        ];

  // Points must total the weight (one point per percent), so a new question takes what is left.
  const pointsTotal = totalQuestionPoints(questions);
  const mismatch = pointsMismatch(questions, weight);
  const canDistribute = weight > 0 && questions.length > 0 && weight >= questions.length;

  const addQuestion = () =>
    setQuestions((prev) => [
      ...prev,
      blankQuestion('multiple_choice', '', weight > 0 ? Math.max(1, weight - totalQuestionPoints(prev)) : 10),
    ]);

  const distributePointsEvenly = () =>
    setQuestions((prev) => {
      const split = splitEvenly(weight, prev.length);
      return prev.map((q, i) => ({ ...q, points: split[i] }));
    });

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const patchQuestion = (index: number, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    setQuestions((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const setQuestionType = (index: number, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? { ...q, type, options: optionsForType(type), correctIndex: 0, answerText: '' }
          : q,
      ),
    );
  };

  const patchOption = (index: number, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        const options = q.options.map((option, j) => (j === optionIndex ? value : option));
        return { ...q, options };
      }),
    );
  };

  const handleQuestionImageUpload = async (
    file: File,
    onSuccess: (url: string) => void,
    onError: (err: string) => void,
  ) => {
    try {
      const res = await uploadAttachment(file, { courseId });
      onSuccess(res.fileUrl);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to upload image');
    }
  };

  const getScopeMeta = () => {
    switch (scope) {
      case 'FINAL_ASSESSMENT':
        return {
          title: t('assessmentEditorStage.finalCertificationAssessment'),
          subtitle: t('assessmentEditorStage.highStakesFinalExamRequiredFor'),
          badge: t('assessmentEditorStage.finalExam'),
          color: 'indigo',
        };
      case 'MODULE_ASSESSMENT':
        return {
          title: t('assessmentEditorStage.moduleAssessmentTitle', {
            title: parentTitle || t('assessmentEditorStage.moduleFallback'),
          }),
          subtitle: t('assessmentEditorStage.evaluatesComprehensiveUnderstandingOfThi'),
          badge: t('assessmentEditorStage.moduleCheckpoint'),
          color: 'emerald',
        };
      case 'LESSON_ASSESSMENT':
        return {
          title: t('assessmentEditorStage.lessonQuizTitle', {
            title: parentTitle || t('assessmentEditorStage.lessonFallback'),
          }),
          subtitle: t('assessmentEditorStage.formativeQuizToReinforceKeyConcepts'),
          badge: t('assessmentEditorStage.lessonQuiz'),
          color: 'amber',
        };
    }
  };

  const meta = getScopeMeta();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/90 bg-card p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl shadow-xs',
              scope === 'FINAL_ASSESSMENT' && 'bg-primary-soft text-primary border border-primary/30',
              scope === 'MODULE_ASSESSMENT' && 'bg-success-soft text-success border border-success/30',
              scope === 'LESSON_ASSESSMENT' && 'bg-warning-soft text-warning border border-warning/30',
            )}
          >
            {scope === 'FINAL_ASSESSMENT' ? (
              <ShieldCheck className="h-6 w-6" />
            ) : scope === 'MODULE_ASSESSMENT' ? (
              <Award className="h-6 w-6" />
            ) : (
              <FileQuestion className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold text-foreground">{meta.title}</h2>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  scope === 'FINAL_ASSESSMENT' && 'bg-primary-soft text-primary',
                  scope === 'MODULE_ASSESSMENT' && 'bg-success-soft text-success',
                  scope === 'LESSON_ASSESSMENT' && 'bg-warning-soft text-warning',
                )}
              >
                {meta.badge}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{meta.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalAllocatedWeight !== undefined && (
            <span
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-bold shadow-2xs border',
                totalAllocatedWeight === 100
                  ? 'border-success/30 bg-success-soft text-success'
                  : 'border-warning/30 bg-warning-soft text-warning',
              )}
            >
              {t('assessmentEditorStage.totalWeight')} {totalAllocatedWeight}% / 100%
            </span>
          )}
        </div>
      </div>

      {/* Rules & Parameters Configuration */}
      <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs space-y-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('assessmentEditorStage.gradingRulesConfiguration')}
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              {t('assessmentEditorStage.assessmentTitle')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="e.g. Final Certification Exam"
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-secondary-foreground">
                {t('assessmentEditorStage.courseGradeWeight')}
              </label>
              <span className="text-[10px] text-subtle-foreground font-medium">
                {t('assessmentEditorStage.upToAvailable', { value: Math.max(0, maxWeight) })}
              </span>
            </div>
            <input
              type="number"
              min={0}
              max={Math.max(0, maxWeight)}
              value={weight}
              onChange={(e) => setWeight(Math.max(0, Math.min(Math.max(0, maxWeight), parseInt(e.target.value, 10) || 0)))}
              className={cn(inputClass, mismatch && 'border-danger/30 bg-danger-soft/40 focus:border-danger/60 focus:ring-danger/20')}
              placeholder="e.g. 20"
              aria-invalid={Boolean(mismatch)}
            />
            {mismatch && (
              <p className="mt-1.5 text-[11px] font-medium text-danger">
                {t('assessmentEditorStage.questionPointsTotalButThisAssessment', { total: mismatch.total, required: mismatch.required })}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>{t('assessmentEditorStage.passingScore')}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={passMark}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) setPassMark(Math.max(1, Math.min(100, v)));
                }}
                className={inputClass}
              />
            </div>
            {policyPassMark !== null && passMark < policyPassMark && (
              <p className="mt-1.5 text-[11px] leading-snug text-warning">
                {t('assessmentEditorStage.theCourseNeedsAOverallGrade', { policyPassMark, passMark })}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>{t('assessmentEditorStage.timeLimitMinutes')}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={300}
                value={timeLimitMinutes ?? 45}
                onChange={(e) => setTimeLimitMinutes(Math.max(5, parseInt(e.target.value) || 45))}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('assessmentEditorStage.maximumAttemptsAllowed')}</label>
            <input
              type="number"
              min={1}
              max={10}
              value={attemptsAllowed}
              onChange={(e) => setAttemptsAllowed(Math.max(1, parseInt(e.target.value) || 2))}
              className={inputClass}
            />
          </div>
        </div>

        {scope === 'FINAL_ASSESSMENT' && (
          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/60">
            {setAllowEarlySubmission && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowEarlySubmission}
                  onChange={(e) => setAllowEarlySubmission(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {t('assessmentEditorStage.allowEarlySubmission')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('assessmentEditorStage.learnersCanManuallySubmitAnytimeBefore')}
                  </p>
                </div>
              </label>
            )}

            {setAutoSubmitOnExpire && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSubmitOnExpire}
                  onChange={(e) => setAutoSubmitOnExpire(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {t('assessmentEditorStage.autoSubmitWhenTimeExpires')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('assessmentEditorStage.serverAutomaticallyGradesAnswersWhenDead')}
                  </p>
                </div>
              </label>
            )}
          </div>
        )}
      </div>

      {/* Reference Documents / Attachments (Optional for Final or Module Assessment) */}
      {onFileUpload && onFileRemove && (
        <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                {t('assessmentEditorStage.assessmentReferenceDocumentsOptional')}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t('assessmentEditorStage.attachFormulaSheetsCaseStudiesOr')}
              </p>
            </div>
            {uploading && (
              <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
              </span>
            )}
          </div>

          <MultiFileUploader
            id={`assessment-file-${scope}`}
            files={resources}
            legacyUrl={legacyUrl}
            legacyName={legacyName}
            legacySize={legacySize}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.rtf,.zip,.png,.jpg,.jpeg"
            uploading={uploading}
            uploadError={uploadError}
            theme={scope === 'FINAL_ASSESSMENT' ? 'indigo' : 'emerald'}
            placeholderText="Upload assessment brief or reference document"
            descriptionText="Attach files to be referenced by learners during this assessment."
            onUpload={onFileUpload}
            onRemove={onFileRemove}
          />
        </div>
      )}

      {/* Questions Bank List */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('assessmentEditorStage.questions')} ({questions.length})
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            {weight > 0 && questions.length > 0 && (
              <span
                className={cn(
                  'rounded-lg border px-2 py-1 text-[11px] font-bold',
                  mismatch ? 'border-danger/30 bg-danger-soft text-danger' : 'border-success/30 bg-success-soft text-success',
                )}
              >
                {t('assessmentEditorStage.points')} {pointsTotal} / {weight}
              </span>
            )}
            {mismatch && (
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={distributePointsEvenly}
                disabled={!canDistribute}
                title={
                  canDistribute
                    ? undefined
                    : t('assessmentEditorStage.questionsNeedAtLeastWeightTo', { count: questions.length })
                }
                className="gap-1.5 shadow-xs text-xs"
              >
                {t('assessmentEditorStage.distributeEvenly')}
              </Button>
            )}
            {bankQuestions.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => {
                  setQuestions((prev) => [
                    ...prev,
                    ...bankQuestions.map((bq) => ({
                      ...bq,
                      id: uid('q'),
                    })),
                  ]);
                }}
                className="gap-1.5 shadow-xs text-xs"
              >
                <Copy className="h-3.5 w-3.5" /> {t('assessmentEditorStage.importBank')} ({bankQuestions.length})
              </Button>
            )}
            <Button size="sm" onClick={addQuestion} className="gap-1.5 shadow-xs text-xs">
              <Plus className="h-4 w-4" /> {t('assessmentEditorStage.addQuestion')}
            </Button>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-8 text-center">
            <FileQuestion className="mx-auto h-8 w-8 text-subtle-foreground" />
            <p className="mt-2 text-sm font-semibold text-secondary-foreground">
              {t('assessmentEditorStage.noQuestionsAddedYet')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('assessmentEditorStage.addMultipleChoiceTrueFalseOr')}
            </p>
            <Button size="sm" onClick={addQuestion} className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" /> {t('assessmentEditorStage.addFirstQuestion')}
            </Button>
          </div>
        ) : (
          questions.map((q, qIdx) => (
            <div
              key={q.id}
              className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <span className="text-xs font-bold text-primary">
                  {t('assessmentEditorStage.question')} {qIdx + 1}
                </span>

                <div className="flex items-center gap-2">
                  <select
                    value={q.type}
                    onChange={(e) => setQuestionType(qIdx, e.target.value as QuestionType)}
                    className="rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {questionTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={q.category || ''}
                    onChange={(e) => patchQuestion(qIdx, { category: e.target.value })}
                    className="rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    <option value="">{t('assessmentEditorStage.selectCategoryOptional')}</option>
                    {dynamicCategories.map((c) => (
                      <option key={c.id || c.value} value={c.value}>
                        {isAmharic && c.labelAm ? c.labelAm : c.labelEn || c.value}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="font-medium text-secondary-foreground">{t('assessmentEditorStage.pts')}</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      value={q.points}
                      onChange={(e) =>
                        patchQuestion(qIdx, { points: Math.max(1, parseInt(e.target.value, 10) || 1) })
                      }
                      className="w-14 rounded-lg border border-border px-2 py-1 text-xs text-center font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-0.5 border-l border-border pl-2">
                    <button
                      type="button"
                      disabled={qIdx === 0}
                      onClick={() => moveQuestion(qIdx, -1)}
                      className="rounded p-1 text-subtle-foreground hover:bg-secondary disabled:opacity-30"
                      title="Move up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={qIdx === questions.length - 1}
                      onClick={() => moveQuestion(qIdx, 1)}
                      className="rounded p-1 text-subtle-foreground hover:bg-secondary disabled:opacity-30"
                      title="Move down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      className="rounded p-1 text-rose-500 hover:bg-danger-soft"
                      title="Delete question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Question Text Editor */}
              <div>
                <label className={labelClass}>
                  {t('assessmentEditorStage.questionPrompt')} <span className="text-rose-500">*</span>
                </label>
                <CompactRichEditor
                  value={q.text}
                  onChange={(val) => patchQuestion(qIdx, { text: val })}
                  placeholder="Type your question prompt here..."
                />
              </div>

              {/* Optional Question Image */}
              <div className="rounded-xl border border-border/60 bg-muted/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-secondary-foreground">
                    {t('assessmentEditorStage.questionImageDiagramOptional')}
                  </span>
                  {q.imageUrl && (
                    <button
                      type="button"
                      onClick={() => patchQuestion(qIdx, { imageUrl: undefined })}
                      className="text-[11px] text-danger hover:underline"
                    >
                      {t('assessmentEditorStage.removeImage')}
                    </button>
                  )}
                </div>

                {q.imageUrl ? (
                  <div className="relative inline-block rounded-lg overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={q.imageUrl}
                      alt="Question diagram"
                      className="max-h-48 rounded-lg object-contain bg-card"
                    />
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer w-fit rounded-lg border border-dashed border-input bg-card px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-muted transition">
                    <Upload className="h-3.5 w-3.5 text-subtle-foreground" />
                    <span>{t('assessmentEditorStage.uploadImageDiagram')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleQuestionImageUpload(
                            file,
                            (url) => patchQuestion(qIdx, { imageUrl: url }),
                            (err) => alert(err),
                          );
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Answer Choices */}
              {q.type !== 'short_answer' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>
                      {t('assessmentEditorStage.answerChoicesSelectTheCorrectAnswer')}
                    </label>
                    {q.type === 'multiple_choice' && q.options.length < 6 && (
                      <button
                        type="button"
                        onClick={() =>
                          patchQuestion(qIdx, { options: [...q.options, ''] })
                        }
                        className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> {t('assessmentEditorStage.addChoice')}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2.5">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() => patchQuestion(qIdx, { correctIndex: optIdx })}
                            className="h-4 w-4 text-success focus:ring-success"
                          />
                        </label>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => patchOption(qIdx, optIdx, e.target.value)}
                          disabled={q.type === 'true_false'}
                          placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                          className={cn(
                            inputClass,
                            q.correctIndex === optIdx &&
                              'border-success/30 bg-success-soft/30 text-success font-medium',
                          )}
                        />
                        {q.type === 'multiple_choice' && q.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextOptions = q.options.filter((_, i) => i !== optIdx);
                              const nextCorrect =
                                q.correctIndex >= nextOptions.length
                                  ? nextOptions.length - 1
                                  : q.correctIndex;
                              patchQuestion(qIdx, {
                                options: nextOptions,
                                correctIndex: nextCorrect,
                              });
                            }}
                            className="p-1 text-subtle-foreground hover:text-danger rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Short Answer Configuration */}
              {q.type === 'short_answer' && (
                <div>
                  <label className={labelClass}>
                    {t('assessmentEditorStage.expectedCorrectAnswerKeyword')}
                  </label>
                  <input
                    type="text"
                    value={q.answerText || ''}
                    onChange={(e) => patchQuestion(qIdx, { answerText: e.target.value })}
                    placeholder="Enter expected answer for automatic grading..."
                    className={inputClass}
                  />
                </div>
              )}

              {/* Explanation / Solution Details */}
              <div>
                <label className={labelClass}>
                  {t('assessmentEditorStage.explanationSolutionGuideShownAfterReview')}
                </label>
                <input
                  type="text"
                  value={q.explanation || ''}
                  onChange={(e) => patchQuestion(qIdx, { explanation: e.target.value })}
                  placeholder="Explain why this answer is correct..."
                  className={inputClass}
                />
              </div>
            </div>
          ))
        )}

        {questions.length > 0 && (
          <div className="pt-2 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={addQuestion}
              className="gap-2 border-dashed border-2 border-primary/30 bg-primary-soft/50 hover:bg-primary-soft/70 text-primary w-full py-4 text-sm font-semibold rounded-2xl shadow-xs transition-all hover:scale-[1.005]"
            >
              <Plus className="h-5 w-5" />
              {t('assessmentEditorStage.addAnotherQuestion')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
