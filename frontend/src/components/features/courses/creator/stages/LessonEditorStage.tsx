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
  ArrowUp,
  ArrowDown,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { LessonDraft, WizardContentType } from '../../wizard-types';
import type { UploadedResource } from '@/types';
import { uploadAttachment } from '@/lib/api/files';
import { inputClass, labelClass } from '../../wizard-types';
import { MultiFileUploader, RichEditor, formatFileSize } from '../../wizard-components';
import { cn } from '@/lib/utils';
import {
  parseLessonBlocks,
  serializeLessonBlocks,
  type LessonContentBlock,
  type LessonBlockType,
} from '@/lib/course-draft-blocks';

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

  const isExternalUrl = (url?: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.includes('youtube.com') ||
      lower.includes('youtu.be') ||
      lower.includes('vimeo.com') ||
      lower.includes('docs.google.com') ||
      lower.includes('drive.google.com') ||
      lower.includes('canva.com') ||
      lower.includes('slideshare.net') ||
      (lower.startsWith('http') && !lower.includes('/uploads/') && !lower.includes('/api/files/') && !lower.includes(':9000'))
    );
  };

  const activeVideoUrl = lesson.contentType === 'VIDEO' ? (lesson.resourceUrl || lesson.videoResourceUrl || '') : (lesson.videoResourceUrl || '');
  const activeSlideUrl = lesson.contentType === 'PRESENTATION' ? (lesson.resourceUrl || lesson.slideResourceUrl || '') : (lesson.slideResourceUrl || '');
  const activeAudioUrl = lesson.contentType === 'AUDIO' ? (lesson.resourceUrl || lesson.audioResourceUrl || '') : (lesson.audioResourceUrl || '');

  // ── Multi-Content Blocks State ──
  const [blocks, setBlocks] = React.useState<LessonContentBlock[]>(() => parseLessonBlocks(lesson));
  const [blockTab, setBlockTab] = React.useState<Record<string, 'browse' | 'url'>>({});
  const [blockUploading, setBlockUploading] = React.useState<Record<string, boolean>>({});
  const [blockUploadError, setBlockUploadError] = React.useState<Record<string, string | null>>({});

  // Re-sync blocks when navigating to a different lesson ID
  React.useEffect(() => {
    const parsed = parseLessonBlocks(lesson);
    setBlocks(parsed);
  }, [lesson.id]);

  const updateBlocksAndLesson = (newBlocks: LessonContentBlock[]) => {
    setBlocks(newBlocks);
    const serializedContent = serializeLessonBlocks(newBlocks);

    // Synchronize primary media and contentType for backward compatibility
    const firstMedia = newBlocks.find((b) => b.type === 'VIDEO' || b.type === 'PRESENTATION' || b.type === 'AUDIO');
    const firstVideo = newBlocks.find((b) => b.type === 'VIDEO');
    const firstSlide = newBlocks.find((b) => b.type === 'PRESENTATION');
    const firstAudio = newBlocks.find((b) => b.type === 'AUDIO');
    const primaryType: WizardContentType = firstMedia ? firstMedia.type : 'DOCUMENT';

    onUpdateLesson({
      contentBlocks: newBlocks,
      content: serializedContent,
      contentType: primaryType,
      resourceUrl: firstMedia ? firstMedia.url : '',
      fileName: firstMedia ? firstMedia.fileName : undefined,
      fileSize: firstMedia ? firstMedia.fileSize : undefined,
      videoResourceUrl: firstVideo?.url ?? '',
      videoFileName: firstVideo?.fileName,
      videoFileSize: firstVideo?.fileSize,
      slideResourceUrl: firstSlide?.url ?? '',
      slideFileName: firstSlide?.fileName,
      slideFileSize: firstSlide?.fileSize,
      audioResourceUrl: firstAudio?.url ?? '',
      audioFileName: firstAudio?.fileName,
      audioFileSize: firstAudio?.fileSize,
    });
  };

  const handleAddBlock = (type: LessonBlockType, position: 'top' | 'bottom') => {
    const id = `block-${type.toLowerCase()}-${Date.now()}`;
    const newBlock: LessonContentBlock = {
      id,
      type,
      title:
        type === 'PRESENTATION'
          ? 'Slide Deck Presentation'
          : type === 'VIDEO'
            ? 'Video Lecture'
            : type === 'AUDIO'
              ? 'Audio Lecture'
              : 'Lecture Notes & Study Material',
      content: type === 'DOCUMENT' ? '<p></p>' : undefined,
      url: '',
    };

    const nextBlocks = position === 'top' ? [newBlock, ...blocks] : [...blocks, newBlock];
    updateBlocksAndLesson(nextBlocks);
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const nextBlocks = [...blocks];
    const [moved] = nextBlocks.splice(index, 1);
    nextBlocks.splice(targetIndex, 0, moved);
    updateBlocksAndLesson(nextBlocks);
  };

  const handleDeleteBlock = (blockId: string) => {
    const nextBlocks = blocks.filter((b) => b.id !== blockId);
    updateBlocksAndLesson(nextBlocks);
  };

  const handleUpdateBlock = (blockId: string, patch: Partial<LessonContentBlock>) => {
    const nextBlocks = blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b));
    updateBlocksAndLesson(nextBlocks);
  };

  const handleBlockFileUpload = async (blockId: string, type: LessonBlockType, file: File) => {
    setBlockUploading((prev) => ({ ...prev, [blockId]: true }));
    setBlockUploadError((prev) => ({ ...prev, [blockId]: null }));
    try {
      const purpose =
        type === 'VIDEO'
          ? 'lesson_video'
          : type === 'PRESENTATION'
            ? 'lesson_presentation'
            : type === 'AUDIO'
              ? 'lesson_audio'
              : 'lesson_resource';
      const res = await uploadAttachment(file, { purpose });
      handleUpdateBlock(blockId, {
        url: res.fileUrl,
        fileName: res.fileName,
        fileSize: res.sizeBytes,
      });
    } catch (err: any) {
      setBlockUploadError((prev) => ({ ...prev, [blockId]: err.message || 'Failed to upload file' }));
    } finally {
      setBlockUploading((prev) => ({ ...prev, [blockId]: false }));
    }
  };

  const renderAddBlockControls = (position: 'top' | 'bottom') => (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20">
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
          {position === 'top'
            ? tBilingual('Add Content to Top', 'ከላይ ይዘት ጨምር')
            : tBilingual('Add Content to Bottom', 'ከታች ይዘት ጨምር')}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleAddBlock('PRESENTATION', position)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition shadow-2xs"
        >
          <Presentation className="h-3.5 w-3.5 text-indigo-600" />
          <span>+ {tBilingual('Slide Deck', 'ስላይድ')}</span>
        </button>
        <button
          type="button"
          onClick={() => handleAddBlock('VIDEO', position)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition shadow-2xs"
        >
          <Video className="h-3.5 w-3.5 text-rose-600" />
          <span>+ {tBilingual('Video Lecture', 'ቪዲዮ')}</span>
        </button>
        <button
          type="button"
          onClick={() => handleAddBlock('AUDIO', position)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition shadow-2xs"
        >
          <Headphones className="h-3.5 w-3.5 text-amber-600" />
          <span>+ {tBilingual('Audio Lecture', 'ድምጽ')}</span>
        </button>
        <button
          type="button"
          onClick={() => handleAddBlock('DOCUMENT', position)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
        >
          <FileText className="h-3.5 w-3.5 text-slate-600" />
          <span>+ {tBilingual('Lecture Notes', 'ጽሑፍ/ማስታወሻ')}</span>
        </button>
      </div>
    </div>
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
                  onClick={() => {
                    onUpdateLesson({ contentType: ct.type });
                    // Also check if a block of this type exists; if not, add it
                    if (
                      (ct.type === 'VIDEO' || ct.type === 'PRESENTATION' || ct.type === 'AUDIO') &&
                      !blocks.some((b) => b.type === ct.type)
                    ) {
                      handleAddBlock(ct.type as LessonBlockType, 'top');
                    }
                  }}
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

        {/* Multi-Content Blocks Studio */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>{tBilingual('Lesson Content Blocks & Ordering', 'የትምህርት ይዘቶች እና ቅደም ተከተል')}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {tBilingual(
                  'Add multiple content pieces (videos, slides, audio, lecture notes), reorder their positions, and arrange how learners experience them.',
                  'በርካታ ይዘቶችን (ቪዲዮ፣ ስላይድ፣ ድምጽ፣ ማስታወሻ) በአንድ ትምህርት ውስጥ ያቀናብሩ፣ ቅደም ተከተላቸውን ይቀይሩ።',
                )}
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60">
              {blocks.length} {blocks.length === 1 ? 'Block' : 'Blocks'}
            </span>
          </div>

          {/* Top Add Controls */}
          {renderAddBlockControls('top')}

          {/* Blocks List */}
          <div className="space-y-4">
            {blocks.map((block, idx) => {
              const tab = blockTab[block.id] || (isExternalUrl(block.url) ? 'url' : 'browse');
              const isUploading = Boolean(blockUploading[block.id]);
              const uploadError = blockUploadError[block.id];

              return (
                <div
                  key={block.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all"
                >
                  {/* Block Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-700/80">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      {block.type === 'PRESENTATION' ? (
                        <Presentation className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      ) : block.type === 'VIDEO' ? (
                        <Video className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      ) : block.type === 'AUDIO' ? (
                        <Headphones className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400 shrink-0" />
                      )}
                      <input
                        type="text"
                        value={block.title || ''}
                        onChange={(e) => handleUpdateBlock(block.id, { title: e.target.value })}
                        placeholder={
                          block.type === 'PRESENTATION'
                            ? 'Slide Deck Presentation'
                            : block.type === 'VIDEO'
                              ? 'Video Lecture'
                              : block.type === 'AUDIO'
                                ? 'Audio Lecture'
                                : 'Lecture Notes & Study Material'
                        }
                        className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-0 px-1 py-0.5 truncate max-w-xs sm:max-w-md outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveBlock(idx, 'up')}
                        title={tBilingual('Move Up', 'ወደ ላይ ውሰድ')}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={idx === blocks.length - 1}
                        onClick={() => handleMoveBlock(idx, 'down')}
                        title={tBilingual('Move Down', 'ወደ ታች ውሰድ')}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(block.id)}
                        title={tBilingual('Delete Block', 'ይዘቱን ሰርዝ')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition ml-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Block Content Body */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* DOCUMENT BLOCK */}
                    {block.type === 'DOCUMENT' && (
                      <div>
                        <RichEditor
                          value={block.content || ''}
                          placeholder={tBilingual(
                            'Write comprehensive lecture notes, definitions, instructions and examples for this block…',
                            'የትምህርቱን ይዘት፣ ትርጓሜዎች፣ መመሪያዎች እና ምሳሌዎችን በዝርዝር ይጻፉ…',
                          )}
                          onChange={(val) => handleUpdateBlock(block.id, { content: val })}
                          minHeight={150}
                        />
                      </div>
                    )}

                    {/* PRESENTATION / SLIDE BLOCK */}
                    {block.type === 'PRESENTATION' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {tBilingual('Slide Deck Presentation Source', 'የስላይድ ማቅረቢያ ፋይል ወይም ሊንክ')}
                          </label>
                          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
                            <button
                              type="button"
                              onClick={() => setBlockTab((prev) => ({ ...prev, [block.id]: 'browse' }))}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all',
                                tab === 'browse'
                                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
                              )}
                            >
                              <Upload className="h-3.5 w-3.5" />
                              {tBilingual('Browse & Upload File', 'ፋይል ይጫኑ')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setBlockTab((prev) => ({ ...prev, [block.id]: 'url' }))}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all',
                                tab === 'url'
                                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
                              )}
                            >
                              <LinkIcon className="h-3.5 w-3.5" />
                              {tBilingual('Embed / Web URL', 'የድረ-ገጽ አድራሻ (URL)')}
                            </button>
                          </div>
                        </div>

                        {uploadError && (
                          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                            {uploadError}
                          </div>
                        )}

                        {tab === 'browse' ? (
                          block.url ? (
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                              <div className="flex items-center gap-3 min-w-0">
                                <Presentation className="h-5 w-5 text-indigo-600 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {block.fileName || block.url.split('/').pop() || 'Presentation File'}
                                  </p>
                                  {block.fileSize ? (
                                    <span className="text-[11px] text-slate-500">{formatFileSize(block.fileSize)}</span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept=".ppt,.pptx,.pdf,.odp,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleBlockFileUpload(block.id, 'PRESENTATION', file);
                                    }}
                                  />
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50">
                                    <Upload className="h-3 w-3" />
                                    {isUploading ? tBilingual('Uploading...', 'በመጫን ላይ...') : tBilingual('Replace', 'ቀይር')}
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBlock(block.id, { url: '', fileName: undefined, fileSize: undefined })}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl hover:border-indigo-400 cursor-pointer text-center bg-slate-50/50 dark:bg-slate-900/50">
                              <input
                                type="file"
                                accept=".ppt,.pptx,.pdf,.odp,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleBlockFileUpload(block.id, 'PRESENTATION', file);
                                }}
                              />
                              {isUploading ? (
                                <>
                                  <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                                  <span className="text-xs text-slate-600">{tBilingual('Uploading slide deck...', 'ስላይድ በመጫን ላይ...')}</span>
                                </>
                              ) : (
                                <>
                                  <Presentation className="h-6 w-6 text-indigo-600" />
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {tBilingual('Upload PPT, PPTX, or PDF Slide Deck', 'PPT፣ PPTX ወይም PDF ስላይድ ይጫኑ')}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    {tBilingual('Opens directly inside the student classroom', 'ለተማሪዎች በቀጥታ በክላስሩም ውስጥ ይከፈታል')}
                                  </span>
                                </>
                              )}
                            </label>
                          )
                        ) : (
                          <div className="space-y-1.5">
                            <input
                              type="url"
                              value={block.url || ''}
                              onChange={(e) => handleUpdateBlock(block.id, { url: e.target.value })}
                              placeholder="https://docs.google.com/presentation/d/... or Canva / OneDrive URL"
                              className={inputClass}
                            />
                            <p className="text-[11px] text-slate-500">
                              {tBilingual('Google Slides, Canva, Microsoft 365, or public slide URLs are supported.', 'የጉግል ስላይድ፣ የካንቫ ወይም ማይክሮሶፍት ስላይድ ሊንክ ማስገባት ይችላሉ።')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* VIDEO BLOCK */}
                    {block.type === 'VIDEO' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {tBilingual('Video Lecture Source', 'የቪዲዮ ትምህርት ፋይል ወይም ሊንክ')}
                          </label>
                          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
                            <button
                              type="button"
                              onClick={() => setBlockTab((prev) => ({ ...prev, [block.id]: 'browse' }))}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all',
                                tab === 'browse'
                                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
                              )}
                            >
                              <Upload className="h-3.5 w-3.5" />
                              {tBilingual('Browse & Upload Video', 'ቪዲዮ ይጫኑ')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setBlockTab((prev) => ({ ...prev, [block.id]: 'url' }))}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all',
                                tab === 'url'
                                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
                              )}
                            >
                              <LinkIcon className="h-3.5 w-3.5" />
                              {tBilingual('YouTube / Embed URL', 'የዩቲዩብ / ቪዲዮ አድራሻ')}
                            </button>
                          </div>
                        </div>

                        {uploadError && (
                          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                            {uploadError}
                          </div>
                        )}

                        {tab === 'browse' ? (
                          block.url ? (
                            <div className="space-y-3">
                              <div className="overflow-hidden rounded-xl bg-black max-h-60 flex items-center justify-center">
                                <video src={block.url} controls className="max-h-60 w-full object-contain" />
                              </div>
                              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border">
                                <span className="font-semibold truncate max-w-sm">{block.fileName || block.url}</span>
                                <div className="flex items-center gap-2">
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleBlockFileUpload(block.id, 'VIDEO', file);
                                      }}
                                    />
                                    <span className="px-2 py-1 rounded bg-white dark:bg-slate-700 border text-xs font-semibold hover:bg-slate-100">
                                      {isUploading ? 'Uploading...' : 'Replace'}
                                    </span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateBlock(block.id, { url: '', fileName: undefined, fileSize: undefined })}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-rose-200 dark:border-rose-800 rounded-xl hover:border-rose-400 cursor-pointer text-center bg-slate-50/50 dark:bg-slate-900/50">
                              <input
                                type="file"
                                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleBlockFileUpload(block.id, 'VIDEO', file);
                                }}
                              />
                              {isUploading ? (
                                <>
                                  <Loader2 className="h-6 w-6 text-rose-600 animate-spin" />
                                  <span className="text-xs text-slate-600">{tBilingual('Uploading video...', 'ቪዲዮ በመጫን ላይ...')}</span>
                                </>
                              ) : (
                                <>
                                  <Video className="h-6 w-6 text-rose-600" />
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {tBilingual('Upload MP4, WebM, MOV Video Lecture', 'የ MP4፣ WebM ወይም MOV ቪዲዮ ይጫኑ')}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    {tBilingual('Stored securely and streamed in the classroom', 'ደህንነቱ ተጠብቆ በክላስሩም ውስጥ ይጫወታል')}
                                  </span>
                                </>
                              )}
                            </label>
                          )
                        ) : (
                          <div className="space-y-1.5">
                            <input
                              type="url"
                              value={block.url || ''}
                              onChange={(e) => handleUpdateBlock(block.id, { url: e.target.value })}
                              placeholder="https://www.youtube.com/watch?v=... or direct MP4 URL"
                              className={inputClass}
                            />
                            <p className="text-[11px] text-slate-500">
                              {tBilingual('YouTube video URLs and direct MP4 streams are supported.', 'የዩቲዩብ ወይም ቀጥታ የ MP4 ሊንክ ማስገባት ይችላሉ።')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* AUDIO BLOCK */}
                    {block.type === 'AUDIO' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {tBilingual('Audio Lecture Source', 'የድምጽ ትምህርት ፋይል ወይም ሊንክ')}
                          </label>
                          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
                            <button
                              type="button"
                              onClick={() => setBlockTab((prev) => ({ ...prev, [block.id]: 'browse' }))}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all',
                                tab === 'browse'
                                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
                              )}
                            >
                              <Upload className="h-3.5 w-3.5" />
                              {tBilingual('Browse & Upload Audio', 'የድምጽ ፋይል ይጫኑ')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setBlockTab((prev) => ({ ...prev, [block.id]: 'url' }))}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all',
                                tab === 'url'
                                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
                              )}
                            >
                              <LinkIcon className="h-3.5 w-3.5" />
                              {tBilingual('Audio Stream URL', 'የድምጽ አድራሻ (URL)')}
                            </button>
                          </div>
                        </div>

                        {uploadError && (
                          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                            {uploadError}
                          </div>
                        )}

                        {tab === 'browse' ? (
                          block.url ? (
                            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold truncate max-w-sm">{block.fileName || block.url}</span>
                                <div className="flex items-center gap-2">
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleBlockFileUpload(block.id, 'AUDIO', file);
                                      }}
                                    />
                                    <span className="px-2 py-1 rounded bg-white dark:bg-slate-800 border text-xs font-semibold hover:bg-slate-100">
                                      {isUploading ? 'Uploading...' : 'Replace'}
                                    </span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateBlock(block.id, { url: '', fileName: undefined, fileSize: undefined })}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              <audio src={block.url} controls className="w-full" />
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-amber-200 dark:border-amber-800 rounded-xl hover:border-amber-400 cursor-pointer text-center bg-slate-50/50 dark:bg-slate-900/50">
                              <input
                                type="file"
                                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleBlockFileUpload(block.id, 'AUDIO', file);
                                }}
                              />
                              {isUploading ? (
                                <>
                                  <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />
                                  <span className="text-xs text-slate-600">{tBilingual('Uploading audio...', 'ድምጽ በመጫን ላይ...')}</span>
                                </>
                              ) : (
                                <>
                                  <Headphones className="h-6 w-6 text-amber-600" />
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {tBilingual('Upload MP3, WAV, AAC Audio Lecture', 'የ MP3፣ WAV ወይም AAC የድምጽ ትምህርት ይጫኑ')}
                                  </span>
                                </>
                              )}
                            </label>
                          )
                        ) : (
                          <div className="space-y-1.5">
                            <input
                              type="url"
                              value={block.url || ''}
                              onChange={(e) => handleUpdateBlock(block.id, { url: e.target.value })}
                              placeholder="https://example.com/audio.mp3"
                              className={inputClass}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Add Controls */}
          {blocks.length > 0 && renderAddBlockControls('bottom')}
        </div>

        {/* Attachments (Separate Handouts & Reference Materials) */}
        <div>
          <label className={labelClass}>
            {tBilingual('Lesson Handouts & Resources', 'የትምህርት ሰነዶች እና ማጣቀሻዎች')}
          </label>
          <MultiFileUploader
            id={`lesson-files-${lesson.id}`}
            files={lesson.resources || lesson.attachments || []}
            legacyUrl={lesson.contentType === 'DOCUMENT' ? lesson.resourceUrl : undefined}
            legacyName={lesson.contentType === 'DOCUMENT' ? lesson.fileName : undefined}
            legacySize={lesson.contentType === 'DOCUMENT' ? lesson.fileSize : undefined}
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
