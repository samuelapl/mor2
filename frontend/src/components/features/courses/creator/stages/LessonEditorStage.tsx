'use client';

import React from 'react';
import {
  Award,
  BookOpen,
  ClipboardList,
  Clock,
  ExternalLink,
  FileQuestion,
  FileText,
  Headphones,
  Link as LinkIcon,
  Plus,
  Presentation,
  Trash2,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { LessonDraft, WizardContentType } from '../../wizard-types';
import type { UploadedResource } from '@/types';
import { uploadAttachment } from '@/lib/api/files';
import { inputClass, labelClass } from '../../wizard-types';
import { MultiFileUploader, RichEditor } from '../../wizard-components';
import { cn } from '@/lib/utils';

export interface LessonEditorStageProps {
  lesson: LessonDraft;
  lessonIndex: number;
  moduleTitle: string;
  isSubLesson?: boolean;
  parentLessonTitle?: string;
  onUpdateLesson: (patch: Partial<LessonDraft>) => void;
  onAddSubLesson?: () => void;
  onSelectSubLesson?: (subId: string) => void;
  onDeleteSubLesson?: (subId: string) => void;
  onAddLessonAssessment?: () => void;
  onSelectLessonAssessment?: () => void;
  onDeleteLessonAssessment?: () => void;
}

export function LessonEditorStage({
  lesson,
  lessonIndex,
  moduleTitle,
  isSubLesson = false,
  parentLessonTitle,
  onUpdateLesson,
  onAddSubLesson,
  onSelectSubLesson,
  onDeleteSubLesson,
  onAddLessonAssessment,
  onSelectLessonAssessment,
  onDeleteLessonAssessment,
}: LessonEditorStageProps) {
  const { tBilingual } = useTranslation();

  const CONTENT_TYPES: Array<{
    type: WizardContentType;
    labelEn: string;
    labelAm: string;
    icon: typeof FileText;
  }> = [
    { type: 'DOCUMENT', labelEn: 'Reading Document', labelAm: 'የንባብ ሰነድ', icon: FileText },
    { type: 'VIDEO', labelEn: 'Video Lecture', labelAm: 'የቪዲዮ ትምህርት', icon: Video },
    { type: 'AUDIO', labelEn: 'Audio Lecture', labelAm: 'የድምጽ ትምህርት', icon: Headphones },
    { type: 'PRESENTATION', labelEn: 'Slide Deck', labelAm: 'ስላይድ', icon: Presentation },
    { type: 'ASSIGNMENT', labelEn: 'Practical Assignment', labelAm: 'የተግባር ስራ', icon: ClipboardList },
  ];

  const subLessons = (lesson.subLessons ?? []).filter(
    (s) =>
      s.contentType !== 'ASSESSMENT' &&
      s.contentType !== 'QUIZ' &&
      !s.title.toLowerCase().includes('lesson assessment'),
  );

  const lessonAssessment = (lesson.subLessons ?? []).find(
    (s) =>
      s.contentType === 'ASSESSMENT' ||
      s.contentType === 'QUIZ' ||
      s.title.toLowerCase().includes('lesson assessment'),
  );

  const handleUpload = async (files: File | File[] | FileList) => {
    const fileList = Array.isArray(files) ? files : files instanceof File ? [files] : Array.from(files);
    if (fileList.length === 0) return;
    onUpdateLesson({ uploading: true, uploadError: null });
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
      const existing = lesson.resources || lesson.attachments || [];
      const combined = [...existing, ...uploaded];
      onUpdateLesson({ resources: combined, attachments: combined, uploading: false });
    } catch (err: any) {
      onUpdateLesson({ uploading: false, uploadError: err.message || 'Upload failed' });
    }
  };

  const handleRemove = (fileIdOrUrl: string) => {
    const existing = lesson.resources || lesson.attachments || [];
    const filtered = existing.filter((f) => f.id !== fileIdOrUrl && f.url !== fileIdOrUrl);
    onUpdateLesson({ resources: filtered, attachments: filtered });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Lesson Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 p-6 shadow-2xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                {moduleTitle} {isSubLesson && parentLessonTitle ? `• ${parentLessonTitle}` : ''}
              </span>
              <h2 className="text-lg font-bold text-slate-900 truncate">
                {lesson.title.trim() ||
                  (isSubLesson
                    ? tBilingual(`Sub-lesson ${lessonIndex + 1}`, `ንዑስ ትምህርት ${lessonIndex + 1}`)
                    : tBilingual(`Lesson ${lessonIndex + 1}`, `ትምህርት ${lessonIndex + 1}`))}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {lesson.contentType || 'DOCUMENT'}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              {lesson.durationMin || 15} {tBilingual('min', 'ደቂቃ')}
            </span>
          </div>
        </div>
      </div>

      {/* Lesson Settings */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
          {tBilingual('Lesson Details & Format', 'የትምህርት ዝርዝር እና ቅርጽ')}
        </h3>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              {tBilingual('Lesson Title', 'የትምህርት ርዕስ')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={lesson.title}
              onChange={(e) => onUpdateLesson({ title: e.target.value })}
              placeholder={tBilingual('Enter lesson title…', 'የትምህርት ርዕስ ያስገቡ…')}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              {tBilingual('Duration (Minutes)', 'የሚፈጀው ጊዜ (በደቂቃ)')}
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={lesson.durationMin || 15}
                onChange={(e) =>
                  onUpdateLesson({ durationMin: Number(e.target.value) || 15 })
                }
                className={inputClass}
              />
              <Clock className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Content Type Selector */}
        <div>
          <label className={labelClass}>{tBilingual('Lesson Content Type', 'የትምህርት ይዘት ዓይነት')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-1.5">
            {CONTENT_TYPES.map((ct) => {
              const isSelected = (lesson.contentType || 'DOCUMENT') === ct.type;
              const Icon = ct.icon;

              return (
                <button
                  key={ct.type}
                  type="button"
                  onClick={() => onUpdateLesson({ contentType: ct.type })}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition cursor-pointer',
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      isSelected ? 'text-indigo-600' : 'text-slate-500',
                    )}
                  />
                  <span className="text-xs">{tBilingual(ct.labelEn, ct.labelAm)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Media Resource URL (if Video/Audio/Presentation) */}
        {(lesson.contentType === 'VIDEO' ||
          lesson.contentType === 'AUDIO' ||
          lesson.contentType === 'PRESENTATION') && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3">
            <label className={labelClass}>
              {lesson.contentType === 'VIDEO'
                ? tBilingual('Video Embed / Stream URL', 'የቪዲዮ አድራሻ (Stream / Embed URL)')
                : lesson.contentType === 'AUDIO'
                  ? tBilingual('Audio Stream URL', 'የድምጽ አድራሻ (Audio Stream URL)')
                  : tBilingual('Slide Deck URL', 'የስላይድ አድራሻ (Slide Deck URL)')}
            </label>
            <div className="relative">
              <input
                type="url"
                value={lesson.resourceUrl || ''}
                onChange={(e) => onUpdateLesson({ resourceUrl: e.target.value })}
                placeholder="https://example.com/media.mp4 or YouTube / Vimeo link"
                className={inputClass}
              />
              <LinkIcon className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500">
              {tBilingual(
                'You can also attach downloadable media files below.',
                'ተጨማሪ የሚወርዱ የሚዲያ ፋይሎችን ከታች ማያያዝ ይችላሉ።',
              )}
            </p>
          </div>
        )}

        {/* Assignment Specifics */}
        {lesson.contentType === 'ASSIGNMENT' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-amber-600" />
              {tBilingual('Assignment Parameters', 'የተግባር ስራ መመሪያዎች')}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{tBilingual('Max Marks (Points)', 'ከፍተኛ ውጤት (ነጥብ)')}</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={lesson.assignmentMaxMarks || 100}
                  onChange={(e) =>
                    onUpdateLesson({ assignmentMaxMarks: Number(e.target.value) || 100 })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{tBilingual('Accepted File Types', 'ተቀባይነት ያላቸው የፋይል አይነቶች')}</label>
                <input
                  type="text"
                  value={lesson.assignmentFileTypes?.join(', ') || 'PDF, DOCX, PPTX'}
                  onChange={(e) =>
                    onUpdateLesson({
                      assignmentFileTypes: e.target.value.split(',').map((s) => s.trim()),
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* Content Body Editor */}
        <div>
          <label className={labelClass}>
            {lesson.contentType === 'ASSIGNMENT'
              ? tBilingual('Assignment Instructions & Prompt', 'የተግባር ስራው መመሪያ')
              : tBilingual('Lesson Content & Text', 'የትምህርት ማብራሪያ ይዘት')}
          </label>
          <RichEditor
            value={lesson.content || ''}
            placeholder={tBilingual(
              'Write comprehensive lesson notes, definitions, instructions and examples…',
              'የትምህርቱን ይዘት፣ ትርጓሜዎች፣ መመሪያዎች እና ምሳሌዎችን በዝርዝር ይጻፉ…',
            )}
            onChange={(val) => onUpdateLesson({ content: val })}
            minHeight={160}
          />
        </div>

        {/* Attachments */}
        <div>
          <label className={labelClass}>
            {tBilingual('Lesson Handouts & Resources', 'የትምህርት ሰነዶች እና ማጣቀሻዎች')}
          </label>
          <MultiFileUploader
            id={`lesson-files-${lesson.id}`}
            files={lesson.resources || lesson.attachments || []}
            legacyUrl={lesson.resourceUrl}
            legacyName={lesson.fileName}
            legacySize={lesson.fileSize}
            uploading={lesson.uploading}
            uploadError={lesson.uploadError}
            theme="indigo"
            placeholderText="Upload Lesson Handouts & Resources"
            descriptionText="Attach supplementary study materials for this lesson."
            onUpload={handleUpload}
            onRemove={handleRemove}
          />
        </div>
      </div>

      {/* Sub-lessons & Lesson Assessment section (only for parent lessons) */}
      {!isSubLesson && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-bold text-slate-900">
              {tBilingual('Sub-Lessons & Checkpoint Quiz', 'ንዑስ ትምህርቶች እና የክፍለ-ትምህርት ምዘና')}
            </h3>

            <div className="flex items-center gap-2">
              {onAddSubLesson && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddSubLesson}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{tBilingual('Add Sub-Lesson', 'ንዑስ ትምህርት ጨምር')}</span>
                </Button>
              )}

              {!lessonAssessment && onAddLessonAssessment && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddLessonAssessment}
                  className="gap-1.5 text-xs font-semibold text-amber-800 border-amber-200 bg-amber-50/50 hover:bg-amber-100/70"
                >
                  <Award className="h-3.5 w-3.5 text-amber-600" />
                  <span>{tBilingual('Add Assessment', 'ምዘና ጨምር')}</span>
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {subLessons.map((sub, sIdx) => (
              <div
                key={sub.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectSubLesson?.(sub.id)}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-200 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
                    {sIdx + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {sub.title.trim() || tBilingual(`Sub-lesson ${sIdx + 1}`, `ንዑስ ትምህርት ${sIdx + 1}`)}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {sub.contentType || 'DOCUMENT'} • {sub.durationMin || 10} {tBilingual('min', 'ደቂቃ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-indigo-600 font-bold group-hover:underline">
                    {tBilingual('Edit Sub-lesson', 'ያርትዑ')} &rarr;
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSubLesson?.(sub.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Lesson Assessment Card */}
            {lessonAssessment && (
              <div
                role="button"
                tabIndex={0}
                onClick={onSelectLessonAssessment}
                className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-100/60 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                    <FileQuestion className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-amber-950 truncate">
                      {tBilingual('Lesson Assessment Checkpoint', 'የክፍለ-ትምህርት ምዘና')}
                    </h4>
                    <span className="text-[10px] text-amber-700 font-medium">
                      {lessonAssessment.quizQuestions?.length || 0} {tBilingual('questions', 'ጥያቄዎች')} • {lessonAssessment.quizWeight ?? 20}% {tBilingual('weight', 'ክብደት')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-amber-800 font-bold group-hover:underline">
                    {tBilingual('Edit Questions', 'ጥያቄዎችን ያርትዑ')} &rarr;
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLessonAssessment?.();
                    }}
                    className="p-1 text-amber-700 hover:text-rose-600 rounded transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
