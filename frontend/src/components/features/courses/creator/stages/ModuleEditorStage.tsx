'use client';

import React from 'react';
import {
  Award,
  BookOpen,
  Clock,
  FileCheck,
  FileQuestion,
  FileText,
  Layers,
  Paperclip,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { LessonDraft, ModuleDraft, WizardContentType } from '../../wizard-types';
import type { UploadedResource } from '@/types';
import { uploadAttachment } from '@/lib/api/files';
import { inputClass, labelClass } from '../../wizard-types';
import { MultiFileUploader, RichEditor } from '../../wizard-components';
import { cn } from '@/lib/utils';
import { calculateModuleDuration, formatDuration } from '@/lib/duration';

export interface ModuleEditorStageProps {
  module: ModuleDraft;
  moduleIndex: number;
  onUpdateModule: (patch: Partial<ModuleDraft>) => void;
  onAddLesson: () => void;
  onAddModuleAssessment: () => void;
  onSelectLesson: (lessonId: string) => void;
  onSelectModuleAssessment: () => void;
  onDeleteLesson: (lessonId: string) => void;
  onDeleteModuleAssessment: () => void;
}

export function ModuleEditorStage({
  module,
  moduleIndex,
  onUpdateModule,
  onAddLesson,
  onAddModuleAssessment,
  onSelectLesson,
  onSelectModuleAssessment,
  onDeleteLesson,
  onDeleteModuleAssessment,
}: ModuleEditorStageProps) {
  const { isAmharic, t } = useTranslation('courses');
  const moduleMinutes = calculateModuleDuration({ lessons: module.lessons });

  const instructionalLessons = module.lessons.filter(
    (l) =>
      l.contentType !== 'ASSESSMENT' &&
      l.contentType !== 'QUIZ' &&
      !l.title.toLowerCase().includes('module assessment'),
  );

  const moduleAssessment = module.lessons.find(
    (l) =>
      l.contentType === 'ASSESSMENT' ||
      l.contentType === 'QUIZ' ||
      l.title.toLowerCase().includes('module assessment'),
  );

  const handleUpload = async (files: File | File[] | FileList) => {
    const fileList = Array.isArray(files) ? files : files instanceof File ? [files] : Array.from(files);
    if (fileList.length === 0) return;
    onUpdateModule({ uploading: true, uploadError: null });
    try {
      const uploaded: UploadedResource[] = [];
      for (const f of fileList) {
        const res = await uploadAttachment(f);
        uploaded.push({
          id: res.id,
          name: res.fileName,
          url: res.fileUrl,
          size: res.sizeBytes,
          type: res.fileType,
        });
      }
      const existing = module.resources || module.attachments || [];
      const combined = [...existing, ...uploaded];
      onUpdateModule({ resources: combined, attachments: combined, uploading: false });
    } catch (err: any) {
      onUpdateModule({ uploading: false, uploadError: err.message || 'Upload failed' });
    }
  };

  const handleRemove = (fileIdOrUrl: string) => {
    const existing = module.resources || module.attachments || [];
    const filtered = existing.filter((f) => f.id !== fileIdOrUrl && f.url !== fileIdOrUrl);
    onUpdateModule({ resources: filtered, attachments: filtered });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Module Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 p-6 shadow-2xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                {t('creatorSidebar.module', { value: moduleIndex + 1 })}
              </span>
              <h2 className="text-lg font-bold text-slate-900 truncate">
                {module.title.trim() || t('creatorSidebar.untitledModule')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {instructionalLessons.length} {t('moduleEditorStage.lessons')}
            </span>
            {moduleAssessment && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                {t('moduleEditorStage.assessmentAttached')} ({moduleAssessment.quizWeight ?? 20}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Module Metadata Form */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
          {t('moduleEditorStage.moduleParameters')}
        </h3>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              {t('moduleEditorStage.moduleTitle')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={module.title}
              onChange={(e) => onUpdateModule({ title: e.target.value })}
              placeholder={t('moduleEditorStage.eGModule1IntroductionTo')}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{t('moduleEditorStage.moduleDuration')}</label>
            {/* Derived from the lessons; set study time on each lesson / sub-lesson instead. */}
            <div className={cn(inputClass, 'flex items-center justify-between bg-slate-50 text-slate-700')}>
              <span className="font-semibold">{formatDuration(moduleMinutes, isAmharic)}</span>
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>{t('moduleEditorStage.moduleOverviewSummary')}</label>
          <RichEditor
            value={module.description || ''}
            placeholder={t('moduleEditorStage.brieflyDescribeWhatThisModuleCovers')}
            onChange={(val) => onUpdateModule({ description: val })}
            minHeight={100}
          />
        </div>

        <div>
          <label className={labelClass}>{t('moduleEditorStage.moduleLearningObjectives')}</label>
          <RichEditor
            value={module.objectives || ''}
            placeholder={t('moduleEditorStage.specifyTheExpectedCompetencyOutcomesFor')}
            onChange={(val) => onUpdateModule({ objectives: val })}
            minHeight={100}
          />
        </div>

        <div>
          <label className={labelClass}>{t('moduleEditorStage.moduleAttachmentsReferenceMaterials')}</label>
          <MultiFileUploader
            id={`module-files-${module.id}`}
            files={module.resources || module.attachments || []}
            legacyUrl={module.resourceUrl}
            legacyName={module.fileName}
            legacySize={module.fileSize}
            uploading={module.uploading}
            uploadError={module.uploadError}
            theme="emerald"
            placeholderText="Upload Module Handouts (PDF, Slides, Guides)"
            descriptionText="Attach supplementary study materials for this module."
            onUpload={handleUpload}
            onRemove={handleRemove}
          />
        </div>
      </div>

      {/* Module Contents Quick Overview */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-sm font-bold text-slate-900">
            {t('moduleEditorStage.moduleContentsUnits')}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddLesson}
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5 text-indigo-600" />
              <span>{t('moduleEditorStage.addLesson')}</span>
            </Button>
            {!moduleAssessment && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddModuleAssessment}
                className="gap-1.5 text-xs font-semibold text-emerald-800 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70"
              >
                <Award className="h-3.5 w-3.5 text-emerald-600" />
                <span>{t('lessonEditorStage.addAssessment')}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Instructional Lessons List */}
        <div className="space-y-2">
          {instructionalLessons.map((les, lIdx) => (
            <div
              key={les.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectLesson(les.id)}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-200 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700">
                  {lIdx + 1}
                </span>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {les.title.trim() || t('creatorSidebar.lesson', { value: lIdx + 1 })}
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {les.contentType || 'DOCUMENT'} • {les.durationMin || 15} {t('lessonEditorStage.min')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-indigo-600 font-bold group-hover:underline">
                  {t('moduleEditorStage.openEditor')} &rarr;
                </span>
                {instructionalLessons.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLesson(les.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Module Assessment Card (if present) */}
          {moduleAssessment && (
            <div
              role="button"
              tabIndex={0}
              onClick={onSelectModuleAssessment}
              className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-100/60 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <Award className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-emerald-950 truncate">
                    {t('moduleEditorStage.moduleAssessmentCheckpoint')}
                  </h4>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    {moduleAssessment.quizQuestions?.length || 0} {t('creatorSidebar.questions')} • {moduleAssessment.quizWeight ?? 20}% {t('lessonEditorStage.weight')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-800 font-bold group-hover:underline">
                  {t('lessonEditorStage.editQuestions')} &rarr;
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteModuleAssessment();
                  }}
                  className="p-1 text-emerald-700 hover:text-rose-600 rounded transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
