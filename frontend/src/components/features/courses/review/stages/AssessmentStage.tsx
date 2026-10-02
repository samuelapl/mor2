'use client';

import { AlertTriangle, Award, FileQuestion, Paperclip } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { uploadedResourceFromApi } from '@/lib/api/transform';
import type { ApiAssessment } from '@/lib/api/types';
import { AttachmentCard } from '../../detail/AttachmentCard';
import { AssessmentDetailSection } from '../../detail/AssessmentDetailSection';
import { assessmentIssues } from '../nodes';
import { StageCard, StageTitle } from './StageParts';

interface AssessmentStageProps {
  scope: 'FINAL_ASSESSMENT' | 'MODULE_ASSESSMENT' | 'LESSON_ASSESSMENT';
  /** One assessment for module/lesson scope; the final tier may hold several. */
  assessments: ApiAssessment[];
  /** Module or lesson the assessment belongs to. */
  parentTitle?: string;
}

/** One view for all three assessment tiers: settings, weight, every question and its answer. */
export function AssessmentStage({ scope, assessments, parentTitle }: AssessmentStageProps) {
  const { tBilingual, isAmharic } = useTranslation();

  const eyebrow =
    scope === 'FINAL_ASSESSMENT'
      ? tBilingual('Final assessment', 'የማጠቃለያ ምዘና')
      : scope === 'MODULE_ASSESSMENT'
        ? `${tBilingual('Module assessment', 'የሞጁል ምዘና')} · ${parentTitle ?? ''}`
        : `${tBilingual('Lesson assessment', 'የትምህርት ምዘና')} · ${parentTitle ?? ''}`;

  const issues = assessments.flatMap(assessmentIssues);
  const files = assessments.flatMap((a) => (a.attachments ?? []).map(uploadedResourceFromApi));

  return (
    <div className="space-y-6">
      <StageTitle
        icon={scope === 'FINAL_ASSESSMENT' ? <Award className="h-4 w-4" /> : <FileQuestion className="h-4 w-4" />}
        eyebrow={eyebrow}
        title={assessments[0]?.titleEn || tBilingual('Assessment', 'ምዘና')}
      />

      {issues.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            {tBilingual('Check before approving', 'ከማጽደቅዎ በፊት ያረጋግጡ')}
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-800">
            {issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <StageCard>
        <AssessmentDetailSection assessments={assessments} isAmharic={isAmharic} />
      </StageCard>

      {files.length > 0 && (
        <StageCard title={tBilingual(`Assessment files (${files.length})`, `የምዘና ፋይሎች (${files.length})`)} icon={<Paperclip className="h-4 w-4" />}>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {files.map((file, i) => (
              <AttachmentCard key={file.id || file.url || i} file={file} isAmharic={isAmharic} />
            ))}
          </div>
        </StageCard>
      )}
    </div>
  );
}
