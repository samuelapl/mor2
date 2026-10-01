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
import { useTranslation } from '@/lib/i18n/useTranslation';
import { AttachmentCard } from './AttachmentCard';
import { getItemAttachments } from '../wizard-components';

export function getContentTypeBadge(type?: string, isAmharic?: boolean) {
  const norm = (type || '').toUpperCase();
  switch (norm) {
    case 'VIDEO':
      return {
        label: isAmharic ? 'የቪዲዮ ትምህርት' : 'Video Lesson',
        icon: Film,
        color: 'text-purple-700 bg-purple-50 border-purple-200',
      };
    case 'AUDIO':
      return {
        label: isAmharic ? 'የድምጽ ትምህርት' : 'Audio Lesson',
        icon: Headphones,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
      };
    case 'DOCUMENT':
      return {
        label: isAmharic ? 'ሰነድ / ንባብ' : 'Document / Reading',
        icon: FileText,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
      };
    case 'PRESENTATION':
      return {
        label: isAmharic ? 'የስላይድ ማቅረቢያ' : 'Slide Presentation',
        icon: Presentation,
        color: 'text-orange-700 bg-orange-50 border-orange-200',
      };
    case 'QUIZ':
    case 'ASSESSMENT':
      return {
        label: isAmharic ? 'የፈተና ምዘና' : 'Quiz Assessment',
        icon: FileQuestion,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    case 'ASSIGNMENT':
      return {
        label: isAmharic ? 'የተግባር ስራ' : 'Graded Assignment',
        icon: Award,
        color: 'text-rose-700 bg-rose-50 border-rose-200',
      };
    default:
      return {
        label: isAmharic ? 'ትምህርት' : norm || 'Lesson',
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
  const { tBilingual } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <h4 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide">
              {tBilingual('2. Curriculum Structure & Uploaded Materials', '2. የስርዓተ-ትምህርት አወቃቀር እና የተጫኑ ሰነዶች')}
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            {tBilingual(
              'Review all modules, lessons, reading notes, and attached documents.',
              'ሁሉንም ሞጁሎች፣ ትምህርቶች፣ የማንበቢያ ማስታወሻዎች እና የተያያዙ ሰነዶችን ይገምግሙ።',
            )}
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
            {tBilingual('Edit Curriculum', 'ስርዓተ-ትምህርት አርትዕ')}
          </Button>
        ) : null}
      </div>

      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-5 text-center text-xs text-amber-800">
          {tBilingual('⚠ No modules added to this course yet.', '⚠ እስካሁን ለዚህ ኮርስ የተጨመረ ሞጁል የለም።')}
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
                      {tBilingual(`Module ${mIdx + 1}`, `ሞጁል ${mIdx + 1}`)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h5 className="font-display text-base font-bold text-slate-900 truncate">
                        {lockedModule ? <Lock className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" /> : null}
                        {module.title.trim() || (
                          <span className="text-amber-600 italic font-normal">{tBilingual('Untitled Module', 'ያልተሰየመ ሞጁል')}</span>
                        )}
                      </h5>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {module.durationMinutes ? `${module.durationMinutes} ${isAmharic ? 'ደቂቃ' : 'min'}` : isAmharic ? '60 ደቂቃ' : '60 min'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                      {module.lessons.length} {tBilingual(module.lessons.length !== 1 ? 'Lessons' : 'Lesson', 'ትምህርቶች')}
                    </span>
                    {moduleAttachments.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        <Paperclip className="h-3.5 w-3.5" />
                        {moduleAttachments.length} {tBilingual(moduleAttachments.length !== 1 ? 'Attachments' : 'Attachment', 'አባሪዎች')}
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
                          {tBilingual('Module Description:', 'የሞጁል መግለጫ፡')}
                        </span>
                        {stripHtmlTags(module.description)}
                      </div>
                    )}

                    {/* Module Attachments */}
                    {moduleAttachments.length > 0 && (
                      <div className="rounded-xl border border-indigo-100/80 bg-indigo-50/30 p-3.5 space-y-2">
                        <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                          {tBilingual(
                            `Module Resources & References (${moduleAttachments.length})`,
                            `የሞጁል አጠቃላይ ሰነዶች (${moduleAttachments.length})`,
                          )}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {moduleAttachments.map((file, idx) => (
                            <AttachmentCard key={file.id || file.url || idx} file={file} isAmharic={isAmharic} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lessons List */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        {tBilingual(
                          `Lessons in this Module (${module.lessons.length})`,
                          `በዚህ ሞጁል ውስጥ ያሉ ትምህርቶች (${module.lessons.length})`,
                        )}
                      </p>

                      {module.lessons.length === 0 ? (
                        <p className="text-xs italic text-slate-400 pl-2">
                          {tBilingual('No lessons added inside this module.', 'በዚህ ሞጁል ውስጥ የተጨመረ ትምህርት የለም።')}
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
                                            {tBilingual('Untitled Lesson', 'ያልተሰየመ ትምህርት')}
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
                                    {lesson.durationMin ? (
                                      <span className="text-[11px] text-slate-500 font-medium">
                                        {lesson.durationMin} {isAmharic ? 'ደቂቃ' : 'min'}
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
                                          {tBilingual('Lesson Notes / Body Text:', 'የትምህርት ማስታወሻዎች / ጽሁፍ፡')}
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
                                          {tBilingual('Open Media', 'ክፈት')}
                                        </a>
                                      </div>
                                    )}

                                    {/* Lesson Attachments */}
                                    {lessonAttachments.length > 0 && (
                                      <div className="space-y-1.5 pt-1">
                                        <span className="font-bold text-[11px] uppercase tracking-wide text-slate-500">
                                          {tBilingual(
                                            `Lesson Attachments (${lessonAttachments.length})`,
                                            `የትምህርት አባሪዎች (${lessonAttachments.length})`,
                                          )}
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {lessonAttachments.map((file, idx) => (
                                            <AttachmentCard key={file.id || file.url || idx} file={file} isAmharic={isAmharic} />
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Sublessons Hierarchy */}
                                    {subLessons.length > 0 && (
                                      <div className="space-y-2 pt-2 border-t border-slate-200/60">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                          <Layers className="h-3 w-3 text-indigo-600" />
                                          {tBilingual(
                                            `Sub-Lessons (${subLessons.length})`,
                                            `ንዑስ ትምህርቶች (${subLessons.length})`,
                                          )}
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
                                                          {tBilingual('Untitled Sub-lesson', 'ያልተሰየመ ንዑስ ትምህርት')}
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
                                                        <AttachmentCard key={f.id || f.url || fIdx} file={f} isAmharic={isAmharic} />
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
