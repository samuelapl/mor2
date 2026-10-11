'use client';

import React from 'react';
import {
  Award,
  BookOpen,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
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
import type { NamespaceKey } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { LessonDraft, WizardContentType } from '../../wizard-types';
import type { UploadedResource } from '@/types';
import { uploadAttachment } from '@/lib/api/files';
import { inputClass, labelClass } from '../../wizard-types';
import { MultiFileUploader, RichEditor, formatFileSize } from '../../wizard-components';
import { cn } from '@/lib/utils';
import { SlideDeckViewer, getSlideDeckKind } from '@/components/shared/SlideDeckViewer';
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
  const { t } = useTranslation('courses');

  const CONTENT_TYPES: Array<{
    type: WizardContentType;
    labelKey: NamespaceKey<'courses'>;
    icon: typeof FileText;
  }> = [
    { type: 'DOCUMENT', labelKey: 'lessonEditorStage.readingDocument', icon: FileText },
    { type: 'VIDEO', labelKey: 'lessonEditorStage.videoLecture2', icon: Video },
    { type: 'AUDIO', labelKey: 'lessonEditorStage.audioLecture2', icon: Headphones },
    { type: 'PRESENTATION', labelKey: 'lessonEditorStage.slideDeck', icon: Presentation },
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
  const [collapsedBlocks, setCollapsedBlocks] = React.useState<Record<string, boolean>>({});

  const toggleBlockCollapsed = (blockId: string) =>
    setCollapsedBlocks((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
  const setAllBlocksCollapsed = (collapsed: boolean) =>
    setCollapsedBlocks(Object.fromEntries(blocks.map((b) => [b.id, collapsed])));
  const allBlocksCollapsed = blocks.length > 0 && blocks.every((b) => collapsedBlocks[b.id]);

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
    if (type === 'PRESENTATION' && !['pdf', 'pptx'].includes(getSlideDeckKind(file.name))) {
      setBlockUploadError((prev) => ({
        ...prev,
        [blockId]: t('lessonEditorStage.onlyPdfOrPptxSlideDecks'),
      }));
      return;
    }
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
            ? t('lessonEditorStage.addContentToTop')
            : t('lessonEditorStage.addContentToBottom')}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleAddBlock('PRESENTATION', position)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition shadow-2xs"
        >
          <Presentation className="h-3.5 w-3.5 text-indigo-600" />
          <span>+ {t('lessonEditorStage.slideDeck')}</span>
        </button>
        <button
          type="button"
          onClick={() => handleAddBlock('VIDEO', position)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition shadow-2xs"
        >
          <Video className="h-3.5 w-3.5 text-rose-600" />
          <span>+ {t('lessonEditorStage.videoLecture')}</span>
        </button>
        <button
          type="button"
          onClick={() => handleAddBlock('AUDIO', position)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition shadow-2xs"
        >
          <Headphones className="h-3.5 w-3.5 text-amber-600" />
          <span>+ {t('lessonEditorStage.audioLecture')}</span>
        </button>
        <button
          type="button"
          onClick={() => handleAddBlock('DOCUMENT', position)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
        >
          <FileText className="h-3.5 w-3.5 text-slate-600" />
          <span>+ {t('lessonEditorStage.lectureNotes')}</span>
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
                    ? t('creatorSidebar.subLesson', { value: lessonIndex + 1 })
                    : t('creatorSidebar.lesson', { value: lessonIndex + 1 }))}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {lesson.contentType || 'DOCUMENT'}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              {lesson.durationMin || 15} {t('lessonEditorStage.min')}
            </span>
          </div>
        </div>
      </div>

      {/* Lesson Settings */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
          {t('lessonEditorStage.lessonDetailsFormat')}
        </h3>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              {t('lessonEditorStage.lessonTitle')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={lesson.title}
              onChange={(e) => onUpdateLesson({ title: e.target.value })}
              placeholder={t('lessonEditorStage.enterLessonTitle')}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              {t('lessonEditorStage.durationMinutes')}
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
          <label className={labelClass}>{t('lessonEditorStage.lessonContentType')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
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
                  <span className="text-xs">{t(ct.labelKey)}</span>
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
                <span>{t('lessonEditorStage.lessonContentBlocksOrdering')}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('lessonEditorStage.addMultipleContentPiecesVideosSlides')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {blocks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAllBlocksCollapsed(!allBlocksCollapsed)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  {allBlocksCollapsed ? (
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronsDownUp className="h-3.5 w-3.5" />
                  )}
                  {allBlocksCollapsed
                    ? t('lessonEditorStage.expandAll')
                    : t('lessonEditorStage.collapseAll')}
                </button>
              )}
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60">
                {blocks.length} {blocks.length === 1 ? 'Block' : 'Blocks'}
              </span>
            </div>
          </div>

          {/* Top Add Controls */}
          {renderAddBlockControls('top')}

          {/* Blocks List */}
          <div className="space-y-4">
            {blocks.map((block, idx) => {
              const tab = blockTab[block.id] || (isExternalUrl(block.url) ? 'url' : 'browse');
              const isUploading = Boolean(blockUploading[block.id]);
              const uploadError = blockUploadError[block.id];
              const isCollapsed = Boolean(collapsedBlocks[block.id]);

              return (
                <div
                  key={block.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all"
                >
                  {/* Block Header */}
                  <div
                    className={cn(
                      'flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60',
                      !isCollapsed && 'border-b border-slate-200/80 dark:border-slate-700/80',
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleBlockCollapsed(block.id)}
                        title={isCollapsed ? t('lessonEditorStage.expand') : t('lessonEditorStage.collapse')}
                        aria-expanded={!isCollapsed}
                        className="p-1 -ml-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
                      >
                        <ChevronDown className={cn('h-4 w-4 transition-transform', isCollapsed && '-rotate-90')} />
                      </button>
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
                        title={t('lessonEditorStage.moveUp')}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={idx === blocks.length - 1}
                        onClick={() => handleMoveBlock(idx, 'down')}
                        title={t('lessonEditorStage.moveDown')}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(block.id)}
                        title={t('lessonEditorStage.deleteBlock')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition ml-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Block Content Body */}
                  {!isCollapsed && (
                    <div className="p-4 sm:p-5 space-y-4">
                      {/* DOCUMENT BLOCK */}
                      {block.type === 'DOCUMENT' && (
                        <div>
                          <RichEditor
                            value={block.content || ''}
                            placeholder={t('lessonEditorStage.writeComprehensiveLectureNotesDefinition')}
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
                              {t('lessonEditorStage.slideDeckPresentationSource')}
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
                                {t('lessonEditorStage.browseUploadFile')}
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
                                {t('lessonEditorStage.embedWebUrl')}
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
                                      accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleBlockFileUpload(block.id, 'PRESENTATION', file);
                                      }}
                                    />
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50">
                                      <Upload className="h-3 w-3" />
                                      {isUploading ? t('lessonEditorStage.uploading') : t('lessonEditorStage.replace')}
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
                                  accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleBlockFileUpload(block.id, 'PRESENTATION', file);
                                  }}
                                />
                                {isUploading ? (
                                  <>
                                    <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                                    <span className="text-xs text-slate-600">{t('lessonEditorStage.uploadingSlideDeck')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Presentation className="h-6 w-6 text-indigo-600" />
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                      {t('lessonEditorStage.uploadPptxOrPdfSlideDeck')}
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                      {t('lessonEditorStage.opensDirectlyInsideTheStudentClassroom')}
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
                                {t('lessonEditorStage.googleSlidesCanvaMicrosoft365Or')}
                              </p>
                            </div>
                          )}

                          {/* In-page preview, exactly as learners will see it */}
                          {block.url && /^(https?:\/\/|\/)/.test(block.url) && !isUploading && (
                            <SlideDeckViewer url={block.url} fileName={block.fileName} maxHeightClass="max-h-[60vh]" />
                          )}
                        </div>
                      )}

                      {/* VIDEO BLOCK */}
                      {block.type === 'VIDEO' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {t('lessonEditorStage.videoLectureSource')}
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
                                {t('lessonEditorStage.browseUploadVideo')}
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
                                {t('lessonEditorStage.youtubeEmbedUrl')}
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
                                    <span className="text-xs text-slate-600">{t('lessonEditorStage.uploadingVideo')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Video className="h-6 w-6 text-rose-600" />
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                      {t('lessonEditorStage.uploadMp4WebmMovVideoLecture')}
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                      {t('lessonEditorStage.storedSecurelyAndStreamedInThe')}
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
                                {t('lessonEditorStage.youtubeVideoUrlsAndDirectMp4')}
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
                              {t('lessonEditorStage.audioLectureSource')}
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
                                {t('lessonEditorStage.browseUploadAudio')}
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
                                {t('lessonEditorStage.audioStreamUrl')}
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
                                    <span className="text-xs text-slate-600">{t('lessonEditorStage.uploadingAudio')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Headphones className="h-6 w-6 text-amber-600" />
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                      {t('lessonEditorStage.uploadMp3WavAacAudioLecture')}
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
                  )}
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
            {t('lessonEditorStage.lessonHandoutsResources')}
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
              {t('lessonEditorStage.subLessonsCheckpointQuiz')}
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
                  <span>{t('lessonEditorStage.addSubLesson')}</span>
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
                  <span>{t('lessonEditorStage.addAssessment')}</span>
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
                      {sub.title.trim() || t('creatorSidebar.subLesson', { value: sIdx + 1 })}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {sub.contentType || 'DOCUMENT'} • {sub.durationMin || 10} {t('lessonEditorStage.min')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-indigo-600 font-bold group-hover:underline">
                    {t('lessonEditorStage.editSubLesson')} &rarr;
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
                      {t('lessonEditorStage.lessonAssessmentCheckpoint')}
                    </h4>
                    <span className="text-[10px] text-amber-700 font-medium">
                      {lessonAssessment.quizQuestions?.length || 0} {t('creatorSidebar.questions')} • {lessonAssessment.quizWeight ?? 20}% {t('lessonEditorStage.weight')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-amber-800 font-bold group-hover:underline">
                    {t('lessonEditorStage.editQuestions')} &rarr;
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
