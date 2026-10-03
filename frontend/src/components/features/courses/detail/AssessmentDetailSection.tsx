'use client';

import { Paperclip } from 'lucide-react';
import type { ApiAssessment } from '@/lib/api/types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { AttachmentCard } from './AttachmentCard';
import { AssessmentQuestionPreview } from './AssessmentQuestionPreview';

interface AssessmentDetailSectionProps {
  assessments: ApiAssessment[];
  isAmharic?: boolean;
}

export function AssessmentDetailSection({ assessments, isAmharic }: AssessmentDetailSectionProps) {
  const { tBilingual } = useTranslation();

  if (assessments.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        {tBilingual('No assessment has been attached yet.', 'እስካሁን ምንም ምዘና አልተያያዘም።')}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {assessments.map((assessment) => (
        <div key={assessment.id} className="space-y-4">
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50/70 p-4 shadow-2xs">
            <h5 className="font-bold text-slate-900 text-sm">{assessment.titleEn}</h5>
            {assessment.descriptionEn ? (
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{assessment.descriptionEn}</p>
            ) : null}
          </div>

          {/* Metrics cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 shadow-2xs">
              <p className="text-slate-500 font-medium">{tBilingual('Grade Weight', 'የውጤት ክብደት')}</p>
              <p className="text-lg font-bold text-indigo-700 mt-1">{assessment.weight ?? 0}%</p>
            </div>
            <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 shadow-2xs">
              <p className="text-slate-500 font-medium">{tBilingual('Passing Score', 'ማለፊያ ነጥብ')}</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">{assessment.passingScore}%</p>
            </div>
            <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 shadow-2xs">
              <p className="text-slate-500 font-medium">{tBilingual('Time Limit', 'የጊዜ ገደብ')}</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {assessment.timeLimitMinutes
                  ? `${assessment.timeLimitMinutes} ${tBilingual('min', 'ደቂቃ')}`
                  : tBilingual('No limit', 'ገደብ የለውም')}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 shadow-2xs">
              <p className="text-slate-500 font-medium">{tBilingual('Attempts Allowed', 'የተፈቀዱ ሙከራዎች')}</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{assessment.maxAttempts}</p>
            </div>
            <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 shadow-2xs">
              <p className="text-slate-500 font-medium">{tBilingual('Total Questions', 'አጠቃላይ ጥያቄዎች')}</p>
              <p className="text-lg font-bold text-indigo-600 mt-1">{assessment.questions.length}</p>
            </div>
          </div>

          {/* Assessment Attached Reference File */}
          {assessment.resourceUrl ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5 space-y-2">
              <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                {tBilingual('Exam Reference Material', 'የፈተና ማመሳከሪያ ሰነድ')}
              </p>
              <AttachmentCard
                file={{
                  name: assessment.fileName || (isAmharic ? 'የፈተና ማመሳከሪያ ፋይል' : 'Exam Reference File'),
                  url: assessment.resourceUrl,
                  size: assessment.fileSize || undefined,
                }}
                isAmharic={isAmharic}
              />
            </div>
          ) : null}

          {/* All Questions Preview */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {tBilingual(
                `Exam Questions Preview (${assessment.questions.length})`,
                `የፈተና ጥያቄዎች ቅድመ-ዕይታ (${assessment.questions.length})`,
              )}
            </p>

            {assessment.questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-4 text-amber-800 text-xs">
                {tBilingual('⚠ No questions added to this assessment yet.', '⚠ ለዚህ ምዘና እስካሁን ምንም ጥያቄ አልተጨመረም።')}
              </div>
            ) : (
              <div className="space-y-3">
                {assessment.questions.map((q, qIdx) => (
                  <AssessmentQuestionPreview
                    key={q.id || qIdx}
                    question={q}
                    index={qIdx}
                    isAmharic={isAmharic}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

