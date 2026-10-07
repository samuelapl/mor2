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
  Upload,
  Loader2,
  CheckCircle2,
  Film,
  X,
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

  const [videoTab, setVideoTab] = React.useState<'browse' | 'url'>('browse');
  const [isVideoUploading, setIsVideoUploading] = React.useState(false);
  const [videoUploadError, setVideoUploadError] = React.useState<string | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleVideoBrowse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsVideoUploading(true);
    setVideoUploadError(null);
    try {
      const res = await uploadAttachment(file, { purpose: 'lesson_video' });
      onUpdateLesson({ resourceUrl: res.fileUrl });
    } catch (err: any) {
      setVideoUploadError(err.message || 'Failed to upload video');
    } finally {
      setIsVideoUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

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

        {/* Media Resource (Video / Audio / Presentation) */}
        {lesson.contentType === 'VIDEO' && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-indigo-100">
              <label className={labelClass + ' mb-0'}>
                {tBilingual('Lesson Video Source', 'የቪዲዮ ትምህርት ምንጭ')}
              </label>
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setVideoTab('browse')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all',
                    videoTab === 'browse'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
                  )}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {tBilingual('Browse & Upload File', 'ፋይል ይጫኑ')}
                </button>
                <button
                  type="button"
                  onClick={() => setVideoTab('url')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all',
                    videoTab === 'url'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
                  )}
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  {tBilingual('External / Embed URL', 'የድረ-ገጽ አድራሻ (URL)')}
                </button>
              </div>
            </div>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
              className="hidden"
              onChange={handleVideoBrowse}
            />

            {videoUploadError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {videoUploadError}
              </div>
            )}

            {videoTab === 'browse' ? (
              <div className="space-y-3">
                {lesson.resourceUrl ? (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-xl bg-black/90 shadow-md">
                      <video
                        src={lesson.resourceUrl}
                        controls
                        className="w-full max-h-72 object-contain"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 truncate max-w-md">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span className="font-semibold truncate">{lesson.resourceUrl}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isVideoUploading}
                          onClick={() => videoInputRef.current?.click()}
                          className="h-7 text-xs gap-1 border-emerald-300 hover:bg-emerald-100/50"
                        >
                          <Upload className="h-3 w-3" />
                          {isVideoUploading ? tBilingual('Uploading...', 'በመጫን ላይ...') : tBilingual('Replace Video', 'ቪዲዮውን ይቀይሩ')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onUpdateLesson({ resourceUrl: '' })}
                          className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="h-3 w-3" />
                          {tBilingual('Remove', 'አስወግድ')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isVideoUploading}
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 bg-white dark:bg-slate-900 rounded-2xl transition-all cursor-pointer text-center group"
                  >
                    {isVideoUploading ? (
                      <>
                        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {tBilingual('Uploading video to storage...', 'ቪዲዮውን ወደ ማከማቻ በመጫን ላይ...')}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {tBilingual('Please wait while the file uploads.', 'እባክዎ ፋይሉ እስኪጠናቀቅ ይጠብቁ።')}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                          <Film className="h-8 w-8" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {tBilingual('Browse & Upload Video from Device', 'የቪዲዮ ፋይል ከመሳሪያዎ ይምረጡና ይጫኑ')}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {tBilingual('Supports MP4, WebM, MOV, MKV (Stored in MinIO/S3)', 'MP4, WebM, MOV, MKV ፋይሎችን ይደግፋል')}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow hover:bg-indigo-700">
                          <Upload className="h-3.5 w-3.5" />
                          {tBilingual('Browse Computer', 'ፋይል ምረጥ')}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="url"
                    value={lesson.resourceUrl || ''}
                    onChange={(e) => onUpdateLesson({ resourceUrl: e.target.value })}
                    placeholder="https://example.com/video.mp4 or YouTube / Vimeo link"
                    className={inputClass}
                  />
                  <LinkIcon className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-500">
                  {tBilingual(
                    'Direct MP4 streams, YouTube embed links, and Vimeo URLs are supported.',
                    'ቀጥታ የ MP4 ሊንክ፣ የዩቲዩብ ወይም የቪሚዮ አድራሻ ማስገባት ይችላሉ።',
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {(lesson.contentType === 'AUDIO' || lesson.contentType === 'PRESENTATION') && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3">
            <label className={labelClass}>
              {lesson.contentType === 'AUDIO'
                ? tBilingual('Audio Stream URL', 'የድምጽ አድራሻ (Audio Stream URL)')
                : tBilingual('Slide Deck URL', 'የስላይድ አድራሻ (Slide Deck URL)')}
            </label>
            <div className="relative">
              <input
                type="url"
                value={lesson.resourceUrl || ''}
                onChange={(e) => onUpdateLesson({ resourceUrl: e.target.value })}
                placeholder="https://example.com/media.mp3 or Slide link"
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
