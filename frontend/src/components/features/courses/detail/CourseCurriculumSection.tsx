'use client';

import {
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileQuestion,
  FileText,
  Film,
  Headphones,
  Layers,
  Lock,
  Paperclip,
  Pencil,
  Presentation,
} from 'lucide-react';
import type { Module } from '@/types';
import { Button } from '@/components/ui/Button';
import { stripHtmlTags } from '@/components/ui/RichContent';
import { cn } from '@/lib/utils';
import { lookupIn } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { AttachmentCard } from './AttachmentCard';
import { getItemAttachments } from '../wizard-components';
import { calculateLessonDuration, calculateModuleDuration, formatDuration } from '@/lib/duration';

/** Content type label (locales courses.contentType.*). English unless `isAmharic` is passed. */
function contentTypeLabel(type: string, isAmharic?: boolean): string {
  const key = `courses.contentType.${type}`;
  return (isAmharic && lookupIn('am', key)) || lookupIn('en', key) || type;
}

export function getContentTypeBadge(type?: string, isAmharic?: boolean) {
  const norm = (type || '').toUpperCase();
  switch (norm) {
    case 'VIDEO':
      return {
        label: contentTypeLabel('VIDEO', isAmharic),
        icon: Film,
        color: 'text-purple-700 bg-purple-50 border-purple-200',
      };
    case 'AUDIO':
      return {
        label: contentTypeLabel('AUDIO', isAmharic),
        icon: Headphones,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
      };
    case 'DOCUMENT':
      return {
        label: contentTypeLabel('DOCUMENT', isAmharic),
        icon: FileText,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
      };
    case 'PRESENTATION':
      return {
        label: contentTypeLabel('PRESENTATION', isAmharic),
        icon: Presentation,
        color: 'text-orange-700 bg-orange-50 border-orange-200',
      };
    case 'QUIZ':
    case 'ASSESSMENT':
      return {
        label: contentTypeLabel('ASSESSMENT', isAmharic),
        icon: FileQuestion,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    case 'ASSIGNMENT':
      return {
        label: contentTypeLabel('ASSIGNMENT', isAmharic),
        icon: Award,
        color: 'text-rose-700 bg-rose-50 border-rose-200',
      };
    default:
      return {
        label: isAmharic ? contentTypeLabel('LESSON', true) : norm || contentTypeLabel('LESSON'),
        icon: BookOpen,
        color: 'text-slate-700 bg-slate-100 border-slate-200',
      };
  }
}

interface CourseCurriculumSectionProps {
  modules: Module[];
  expandedModules: Set<string>;
  toggleModule: (id: string) => void;
  expandedLessons: Set<string>;
  toggleLesson: (id: string) => void;
  canEdit?: boolean;
  onEdit?: () => void;
  isAmharic?: boolean;
}

export function CourseCurriculumSection({
  modules,
  expandedModules,
  toggleModule,
  expandedLessons,
  toggleLesson,
  canEdit,
  onEdit,
  isAmharic,
}: CourseCurriculumSectionProps) {
  const { t } = useTranslation('courses');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <h4 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide">
              {t('courseCurriculumSection.n2CurriculumStructureUploadedMaterials')}
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            {t('courseCurriculumSection.reviewAllModulesLessonsReadingNotes')}
          </p>
        </div>
        {canEdit && onEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t('courseCurriculumSection.editCurriculum')}
          </Button>
        ) : null}
      </div>

      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-5 text-center text-xs text-amber-800">
          {t('courseCurriculumSection.noModulesAddedToThisCourse')}
        </div>
      ) : (
        <div className="space-y-5">
          {modules.map((module, mIdx) => {
            const isModExpanded = expandedModules.has(module.id);
            const moduleAttachments = getItemAttachments(module);
            const lockedModule = module.unlocked === false;

            return (
              <div
                key={module.id}
                className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/50 shadow-2xs transition hover:border-slate-300"
              >
                {/* Module Header Bar */}
                <div
                  onClick={() => toggleModule(module.id)}
                  className="flex cursor-pointer flex-wrap items-center justify-between gap-3 border-l-4 border-l-indigo-600 bg-white p-4.5 px-5 transition hover:bg-slate-50/80 select-none"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="flex h-7 px-2.5 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-2xs">
                      {t('creatorSidebar.module', { value: mIdx + 1 })}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h5 className="font-display text-base font-bold text-slate-900 truncate">
                        {lockedModule ? <Lock className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" /> : null}
                        {module.title.trim() || (
                          <span className="text-amber-600 italic font-normal">{t('courseCurriculumSection.untitledModule')}</span>
                        )}
                      </h5>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {formatDuration(calculateModuleDuration(module), isAmharic)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                      {module.lessons.length} {t(module.lessons.length !== 1 ? 'courseCurriculumSection.lessonsUnit' : 'courseCurriculumSection.lessonUnit')}
                    </span>
                    {moduleAttachments.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        <Paperclip className="h-3.5 w-3.5" />
                        {moduleAttachments.length} {t(moduleAttachments.length !== 1 ? 'courseCurriculumSection.attachmentsUnit' : 'courseCurriculumSection.attachmentUnit')}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleModule(module.id);
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      {isModExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Module Body */}
                {isModExpanded && (
                  <div className="border-t border-slate-200/80 p-5 space-y-4 bg-white/70">
                    {module.description && (
                      <div className="rounded-xl border border-slate-100 bg-white p-3.5 text-xs text-slate-600 leading-relaxed shadow-2xs">
                        <span className="font-semibold text-slate-700 block mb-1">
                          {t('courseCurriculumSection.moduleDescription')}
                        </span>
                        {stripHtmlTags(module.description)}
                      </div>
                    )}

                    {/* Module Attachments */}
                    {moduleAttachments.length > 0 && (
                      <div className="rounded-xl border border-indigo-100/80 bg-indigo-50/30 p-3.5 space-y-2">
                        <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                          {t('courseCurriculumSection.moduleResourcesReferences', { count: moduleAttachments.length })}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {moduleAttachments.map((file, idx) => (
                            <AttachmentCard key={file.id || file.url || idx} file={file} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lessons List */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        {t('courseCurriculumSection.lessonsInThisModule', { count: module.lessons.length })}
                      </p>

                      {module.lessons.length === 0 ? (
                        <p className="text-xs italic text-slate-400 pl-2">
                          {t('courseCurriculumSection.noLessonsAddedInsideThisModule')}
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {module.lessons.map((lesson, lIdx) => {
                            const isLesExpanded = expandedLessons.has(lesson.id);
                            const badge = getContentTypeBadge(lesson.contentType, isAmharic);
                            const ContentIcon = badge.icon;
                            const lessonAttachments = getItemAttachments(lesson);
                            const lockedLesson = lesson.unlocked === false;
                            const subLessons = lesson.subLessons || [];

                            return (
                              <div
                                key={lesson.id}
                                className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs hover:border-slate-300 transition"
                              >
                                {/* Lesson Header */}
                                <div
                                  onClick={() => toggleLesson(lesson.id)}
                                  className="flex cursor-pointer flex-wrap items-center justify-between gap-2.5 p-3.5 px-4 transition hover:bg-slate-50/70 select-none"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
                                      {lIdx + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-xs text-slate-900 truncate">
                                        {lockedLesson ? <Lock className="mr-1 inline h-3 w-3 text-slate-400" /> : null}
                                        {lesson.title.trim() || (
                                          <span className="text-amber-600 italic font-normal">
                                            {t('courseCurriculumSection.untitledLesson')}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span
                                      className={cn(
                                        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                                        badge.color,
                                      )}
                                    >
                                      <ContentIcon className="h-3 w-3" />
                                      {badge.label}
                                    </span>
                                    {calculateLessonDuration(lesson) > 0 ? (
                                      <span className="text-[11px] text-slate-500 font-medium">
                                        {formatDuration(calculateLessonDuration(lesson), isAmharic)}
                                      </span>
                                    ) : null}
                                    {lessonAttachments.length > 0 && (
                                      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                        <Paperclip className="h-3 w-3" />
                                        {lessonAttachments.length}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleLesson(lesson.id);
                                      }}
                                      className="rounded p-1 text-slate-400 hover:text-slate-600"
                                    >
                                      {isLesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </div>

                                {/* Lesson Expanded Content */}
                                {isLesExpanded && (
                                  <div className="border-t border-slate-100 bg-slate-50/40 p-4 space-y-3 text-xs">
                                    {/* Lesson Notes / HTML Body */}
                                    {lesson.content && (
                                      <div className="rounded-lg border border-slate-200/70 bg-white p-3 shadow-2xs">
                                        <span className="font-semibold text-slate-700 block mb-1">
                                          {t('courseCurriculumSection.lessonNotesBodyText')}
                                        </span>
                                        <div className="text-slate-600 leading-relaxed max-h-48 overflow-y-auto prose prose-xs max-w-none">
                                          {stripHtmlTags(lesson.content)}
                                        </div>
                                      </div>
                                    )}

                                    {/* Media URL if direct video/audio */}
                                    {lesson.resourceUrl && (
                                      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 px-3 shadow-2xs">
                                        <span className="font-semibold text-slate-700 truncate">{lesson.resourceUrl}</span>
                                        <a
                                          href={lesson.resourceUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-indigo-700 font-semibold text-xs hover:bg-indigo-100 transition shrink-0"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                          {t('courseCurriculumSection.openMedia')}
                                        </a>
                                      </div>
                                    )}

                                    {/* Lesson Attachments */}
                                    {lessonAttachments.length > 0 && (
                                      <div className="space-y-1.5 pt-1">
                                        <span className="font-bold text-[11px] uppercase tracking-wide text-slate-500">
                                          {t('courseCurriculumSection.lessonAttachments', { count: lessonAttachments.length })}
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {lessonAttachments.map((file, idx) => (
                                            <AttachmentCard key={file.id || file.url || idx} file={file} />
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Sublessons Hierarchy */}
                                    {subLessons.length > 0 && (
                                      <div className="space-y-2 pt-2 border-t border-slate-200/60">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                          <Layers className="h-3 w-3 text-indigo-600" />
                                          {t('courseCurriculumSection.subLessons', { count: subLessons.length })}
                                        </p>
                                        <div className="space-y-1.5 pl-2 border-l-2 border-indigo-200">
                                          {subLessons.map((sub, sIdx) => {
                                            const subBadge = getContentTypeBadge(sub.contentType, isAmharic);
                                            const SubIcon = subBadge.icon;
                                            const subAttachments = getItemAttachments(sub);
                                            return (
                                              <div
                                                key={sub.id || sIdx}
                                                className="rounded-lg border border-slate-200 bg-white p-2.5 px-3 space-y-1.5 shadow-2xs"
                                              >
                                                <div className="flex items-center justify-between gap-2">
                                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
                                                      {lIdx + 1}.{sIdx + 1}
                                                    </span>
                                                    <p className="font-medium text-xs text-slate-800 truncate">
                                                      {sub.title || (
                                                        <span className="italic text-slate-400">
                                                          {t('courseCurriculumSection.untitledSubLesson')}
                                                        </span>
                                                      )}
                                                    </p>
                                                  </div>
                                                  <span
                                                    className={cn(
                                                      'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold',
                                                      subBadge.color,
                                                    )}
                                                  >
                                                    <SubIcon className="h-2.5 w-2.5" />
                                                    {subBadge.label}
                                                  </span>
                                                </div>

                                                {sub.content && (
                                                  <p className="text-[11px] text-slate-500 line-clamp-2 pl-7">
                                                    {stripHtmlTags(sub.content)}
                                                  </p>
                                                )}

                                                {subAttachments.length > 0 && (
                                                  <div className="pl-7 pt-1">
                                                    <div className="grid grid-cols-1 gap-1.5">
                                                      {subAttachments.map((f, fIdx) => (
                                                        <AttachmentCard key={f.id || f.url || fIdx} file={f} />
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
