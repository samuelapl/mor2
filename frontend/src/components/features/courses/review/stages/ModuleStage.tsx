'use client';

import { calculateLessonDuration, calculateModuleDuration, formatDuration } from '@/lib/duration';
import { ChevronRight, Clock, FileQuestion, Layers, Paperclip } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { ApiAssessment } from '@/lib/api/types';
import type { Module } from '@/types';
import { AttachmentCard } from '../../detail/AttachmentCard';
import { getContentTypeBadge } from '../../detail/CourseCurriculumSection';
import { getItemAttachments } from '../../wizard-components';
import type { ReviewNode } from '../types';
import { RichSection, StageCard, StageTitle } from './StageParts';

interface ModuleStageProps {
  module: Module;
  index: number;
  assessment?: ApiAssessment;
  lessonAssessments: Record<string, ApiAssessment>;
  onSelectNode: (node: ReviewNode) => void;
}

export function ModuleStage({ module, index, assessment, lessonAssessments, onSelectNode }: ModuleStageProps) {
  const { tBilingual, isAmharic } = useTranslation();
  const files = getItemAttachments(module);
  const minutes = calculateModuleDuration(module);

  return (
    <div className="space-y-6">
      <StageTitle
        icon={<Layers className="h-4 w-4" />}
        eyebrow={`${tBilingual('Module', 'ሞጁል')} ${index + 1}`}
        title={module.title || tBilingual('Untitled module', 'ርዕስ የሌለው ሞጁል')}
        meta={
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(minutes, isAmharic)} · {module.lessons.length} {tBilingual('lessons', 'ትምህርቶች')}
          </span>
        }
      />

      <StageCard>
        <RichSection
          label={tBilingual('Description', 'ማብራሪያ')}
          html={module.description}
          missing={tBilingual('No description provided.', 'ማብራሪያ አልተሰጠም።')}
        />
        <RichSection
          label={tBilingual('Learning Objectives', 'የመማሪያ ዓላማዎች')}
          html={module.objectives}
          missing={tBilingual('No objectives specified.', 'ዓላማዎች አልተገለጹም።')}
        />
      </StageCard>

      <StageCard title={tBilingual('Lessons', 'ትምህርቶች')}>
        {module.lessons.length === 0 ? (
          <p className="text-xs italic text-amber-700">{tBilingual('⚠ This module has no lessons.', '⚠ ይህ ሞጁል ትምህርት የለውም።')}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {module.lessons.map((l, i) => {
              const badge = getContentTypeBadge(l.contentType, isAmharic);
              const BadgeIcon = badge.icon;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => onSelectNode({ type: 'LESSON', moduleId: module.id, lessonId: l.id })}
                    className="flex w-full items-center gap-3 py-2.5 text-left text-sm transition hover:text-indigo-700"
                  >
                    <span className="w-8 shrink-0 text-xs font-bold text-slate-400">
                      {index + 1}.{i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{l.title}</span>
                    {lessonAssessments[l.id] && <FileQuestion className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                    <span
                      className={`hidden shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold sm:flex ${badge.color}`}
                    >
                      <BadgeIcon className="h-3 w-3" />
                      {badge.label}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{formatDuration(calculateLessonDuration(l), isAmharic)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </StageCard>

      {assessment && (
        <button
          type="button"
          onClick={() => onSelectNode({ type: 'MODULE_ASSESSMENT', moduleId: module.id })}
          className="flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-left transition hover:bg-emerald-50"
        >
          <FileQuestion className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">{assessment.titleEn}</p>
            <p className="text-xs text-slate-600">
              {assessment.questions.length} {tBilingual('questions', 'ጥያቄዎች')} · {assessment.weight ?? 0}% {tBilingual('weight', 'ክብደት')} ·{' '}
              {tBilingual('pass', 'ማለፊያ')} {assessment.passingScore}%
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-emerald-500" />
        </button>
      )}

      {files.length > 0 && (
        <StageCard title={tBilingual(`Module files (${files.length})`, `የሞጁል ፋይሎች (${files.length})`)} icon={<Paperclip className="h-4 w-4" />}>
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
