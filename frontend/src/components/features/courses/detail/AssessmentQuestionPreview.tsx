'use client';

import { Check } from 'lucide-react';
import type { ApiAssessmentQuestion } from '@/lib/api/types';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface AssessmentQuestionPreviewProps {
  question: ApiAssessmentQuestion;
  index: number;
}

export function AssessmentQuestionPreview({
  question,
  index,
}: AssessmentQuestionPreviewProps) {
  const { t, isAmharic } = useTranslation('courses');
  const isMultipleChoice = question.type === 'MULTIPLE_CHOICE' || !question.type;
  const isTrueFalse = question.type === 'TRUE_FALSE';
  const isShortAnswer = question.type === 'SHORT_ANSWER';

  return (
    <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 text-xs space-y-2.5 shadow-2xs hover:border-slate-300 transition">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white text-[11px] font-bold">
            {index + 1}
          </span>
          <Badge variant="slate" className="font-semibold text-slate-700 bg-white border-slate-200">
            {isMultipleChoice
              ? t('assessmentQuestionPreview.multipleChoice')
              : isTrueFalse
                ? t('assessmentQuestionPreview.trueFalse')
                : t('assessmentQuestionPreview.shortAnswer')}
          </Badge>
        </div>
        {question.points !== undefined && (
          <span className="font-bold text-indigo-700 text-xs">
            {question.points} {question.points === 1 ? t('assessmentQuestionPreview.point') : t('assessmentQuestionPreview.points')}
          </span>
        )}
      </div>

      {/* Prompt */}
      <div
        className="font-medium text-slate-800 text-sm prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{
          __html:
            question.question ||
            (t('assessmentQuestionPreview.emNoQuestionPromptEm')),
        }}
      />

      {/* Image preview */}
      {question.imageUrl ? (
        <div className="pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.imageUrl}
            alt={t('assessmentQuestionPreview.questionContext')}
            className="max-h-48 rounded-lg border border-slate-200 object-cover"
          />
        </div>
      ) : null}

      {/* Multiple Choice Options */}
      {isMultipleChoice && Array.isArray(question.options) && (
        <div className="space-y-1.5 pt-1">
          {question.options.map((opt, optIdx) => {
            const isCorrect =
              question.correctAnswer === optIdx || question.correctAnswer === opt;
            return (
              <div
                key={optIdx}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition',
                  isCorrect
                    ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-xs font-bold',
                    isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span className="flex-1">{opt}</span>
                {isCorrect && (
                  <Badge
                    variant="green"
                    className="ml-auto text-xs py-0.5 px-2 bg-emerald-100 text-emerald-800 font-bold border-emerald-200"
                  >
                    {t('assessmentQuestionPreview.correctAnswer')}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* True / False Options */}
      {isTrueFalse && (
        <div className="flex items-center gap-3 pt-1">
          {['True', 'False'].map((opt, optIdx) => {
            const isCorrect =
              question.correctAnswer === optIdx ||
              question.correctAnswer === opt ||
              (question.correctAnswer === 0 && opt === 'True') ||
              (question.correctAnswer === 1 && opt === 'False');
            return (
              <span
                key={opt}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs',
                  isCorrect
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-500',
                )}
              >
                {opt === 'True' ? t('assessmentQuestionPreview.true') : t('assessmentQuestionPreview.false')}
                {isCorrect && <Check className="h-3.5 w-3.5 text-emerald-600" />}
              </span>
            );
          })}
        </div>
      )}

      {/* Short Answer Rubric */}
      {isShortAnswer && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
          <span className="font-semibold text-slate-700 block mb-1">
            {t('assessmentQuestionPreview.expectedKeywordsGradingRubric')}
          </span>
          <p className="text-slate-600">
            {typeof question.correctAnswer === 'string'
              ? question.correctAnswer
              : t('assessmentQuestionPreview.noGradingCriteriaSpecified')}
          </p>
        </div>
      )}
    </div>
  );
}

