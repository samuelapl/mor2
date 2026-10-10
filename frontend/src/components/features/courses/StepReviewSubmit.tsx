'use client';

import { calculateCourseDuration, calculateModuleDuration, formatDuration } from '@/lib/duration';
import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  ChevronDown,
  Layers,
  Maximize2,
  Minimize2,
  Pencil,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import type { CourseDeliveryMode, CourseLevel, Question, UploadedResource } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RichContent, stripHtmlTags } from '@/components/ui/RichContent';
import { cn } from '@/lib/utils';
import type { ModuleDraft } from './wizard-types';
import { isModuleAssessmentLesson, isLessonAssessmentSub } from './creator/weights';

export interface StepReviewSubmitProps {
  title: string;
  titleAm?: string;
  code: string;
  category: string;
  level: CourseLevel;
  deliveryMode?: CourseDeliveryMode;
  description: string;
  objectives: string;
  department?: string;
  targetAudience?: string;
  prerequisites?: string;
  coverPreview?: string | null;
  modules: ModuleDraft[];
  quizTitle?: string;
  passMark: number;
  timeLimitMinutes: number | null;
  attemptsAllowed: number;
  allowEarlySubmission?: boolean;
  autoSubmitOnExpire?: boolean;
  questions: Question[];
  finalAssessmentWeight?: number;
  assessmentResources?: UploadedResource[];
  assessmentFileUrl?: string;
  assessmentFileName?: string;
  assessmentFileSize?: number;
  onNavigateToStep?: (stepIndex: number) => void;
}

/**
 * Returns all attached files for an item by combining resources, attachments,
 * and legacy resourceUrl/fileName into a uniform list.
 */
function getItemAttachments(item: {
  resources?: UploadedResource[];
  attachments?: UploadedResource[];
  resourceUrl?: string;
  fileName?: string;
  fileSize?: number;
}): UploadedResource[] {
  const map = new Map<string, UploadedResource>();

  const list = [...(item.resources || []), ...(item.attachments || [])];
  for (const f of list) {
    if (f.url) map.set(f.url, f);
  }

  if (item.resourceUrl && !map.has(item.resourceUrl)) {
    map.set(item.resourceUrl, {
      name: item.fileName || item.resourceUrl.split('/').pop() || 'Attached File',
      url: item.resourceUrl,
      size: item.fileSize,
    });
  }

  return Array.from(map.values());
}

/**
 * Drops a leading outline number the author already typed into a title ("1.2 Intro",
 * "Lesson 1.2: Intro"), since the outline prints its own number next to it.
 */
function withoutOutlineNumber(title: string, number: string): string {
  const escaped = number.replace(/\./g, '\\.');
  const cleaned = title.replace(new RegExp(`^\\s*(?:lesson|topic)?\\s*${escaped}(?!\\d)\\.?\\s*[:\\-–—)]?\\s*`, 'i'), '');
  return cleaned.trim() || title.trim();
}

export function StepReviewSubmit({
  title,
  titleAm,
  code,
  category,
  level,
  deliveryMode = 'BOTH',
  description,
  objectives,
  department,
  targetAudience,
  prerequisites,
  coverPreview,
  modules,
  quizTitle,
  passMark,
  timeLimitMinutes,
  attemptsAllowed,
  allowEarlySubmission = true,
  autoSubmitOnExpire = true,
  questions,
  finalAssessmentWeight = 100,
  assessmentResources = [],
  assessmentFileUrl,
  assessmentFileName,
  assessmentFileSize,
  onNavigateToStep,
}: StepReviewSubmitProps) {
  // Collect all module IDs for default-expanded state
  const initialModuleIds = useMemo(() => new Set(modules.map((m) => m.id)), [modules]);

  const curriculumQuizzes = useMemo(() => {
    const list: Array<{ title: string; weight: number; passMark: number; moduleTitle: string }> = [];
    for (const m of modules) {
      for (const l of m.lessons) {
        if (l.contentType === 'QUIZ' || l.contentType === 'ASSESSMENT') {
          list.push({
            title: l.title || 'Lesson Assessment',
            weight: l.quizWeight ?? 0,
            passMark: passMark,
            moduleTitle: m.title || 'Module',
          });
        }
        if (l.subLessons) {
          for (const sub of l.subLessons) {
            if (sub.contentType === 'QUIZ' || sub.contentType === 'ASSESSMENT') {
              list.push({
                title: sub.title || 'Sub-lesson Assessment',
                weight: sub.quizWeight ?? 0,
                passMark: passMark,
                moduleTitle: m.title || 'Module',
              });
            }
          }
        }
      }
    }
    return list;
  }, [modules, passMark]);

  const hasFinalAssessment = questions.length > 0;
  const totalAllocatedWeight =
    curriculumQuizzes.reduce((sum, q) => sum + q.weight, 0) +
    (hasFinalAssessment ? finalAssessmentWeight : 0);
  const totalAssessmentsCount = curriculumQuizzes.length + (hasFinalAssessment ? 1 : 0);

  const [expandedModules, setExpandedModules] = useState<Set<string>>(initialModuleIds);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedModules(initialModuleIds);
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
  };

  // Aggregated totals — assessment rows are stored inline in the draft tree
  // (module assessment as a lesson, lesson assessment as a sub-lesson) but are
  // saved as separate assessment records, so they are not counted here.
  const totalLessons = useMemo(
    () =>
      modules.reduce(
        (sum, m) => sum + m.lessons.filter((l) => !isModuleAssessmentLesson(l)).length,
        0,
      ),
    [modules],
  );

  const totalSubLessons = useMemo(
    () =>
      modules.reduce(
        (sum, m) =>
          sum +
          m.lessons
            .filter((l) => !isModuleAssessmentLesson(l))
            .reduce(
              (s, l) => s + (l.subLessons ?? []).filter((sub) => !isLessonAssessmentSub(sub)).length,
              0,
            ),
        0,
      ),
    [modules],
  );

  const totalAttachments = useMemo(() => {
    let count = 0;
    for (const m of modules) {
      count += getItemAttachments(m).length;
      for (const l of m.lessons) {
        count += getItemAttachments(l).length;
        if (l.subLessons) {
          for (const s of l.subLessons) {
            count += getItemAttachments(s).length;
          }
        }
      }
    }
    const finalAttachments = getItemAttachments({
      resources: assessmentResources,
      resourceUrl: assessmentFileUrl,
      fileName: assessmentFileName,
      fileSize: assessmentFileSize,
    });
    count += finalAttachments.length;
    return count;
  }, [modules, assessmentResources, assessmentFileUrl, assessmentFileName, assessmentFileSize]);

  const totalEstimatedDurationMin = useMemo(() => calculateCourseDuration(modules), [modules]);


  return (
    <div className="space-y-7">
      {/* ── Header Banner & Quick Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
              4
            </span>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Review & Submit Course
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            A high-level overview of your course before you submit it for approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={expandAll}
            className="gap-1.5 text-xs text-slate-700 hover:text-indigo-700 border-slate-200 bg-white shadow-2xs"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Expand All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={collapseAll}
            className="gap-1.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200 bg-white shadow-2xs"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* ── Summary Stats Badges Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Modules
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">{modules.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Lessons
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">{totalLessons}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Sub-Lessons
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">{totalSubLessons}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Attachments
          </p>
          <p className="mt-1 text-xl font-bold text-indigo-600">{totalAttachments}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Questions
          </p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{questions.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Est. Time
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {formatDuration(totalEstimatedDurationMin)}
          </p>
        </div>
      </div>

      {/* ── Section 1: Course Details Overview ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <h4 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide">
              1. General Course Information
            </h4>
          </div>
          {onNavigateToStep ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToStep(0)}
              className="gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Step 1
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Cover Image */}
          <div className="w-full md:w-52 shrink-0">
            {coverPreview ? (
              <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-2xs aspect-video md:aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverPreview} alt="Course Cover" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center aspect-video md:aspect-[4/3]">
                <BookOpen className="h-8 w-8 text-slate-300 mb-1" />
                <p className="text-xs text-slate-400 font-medium">No cover image</p>
              </div>
            )}
          </div>

          {/* Title & Metadata */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="space-y-1">
              <span className="inline-block rounded-md bg-indigo-50 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                <RichContent inline html={code} placeholder="NO-CODE" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 leading-snug">
                <RichContent inline html={title} placeholder="Untitled Course" />
              </h2>
              {titleAm ? (
                <p className="text-sm text-slate-600 font-medium">
                  የስልጠና ርዕስ (አማርኛ): <RichContent inline html={titleAm} />
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge
                variant="outline"
                className="border-slate-300 text-slate-700 bg-slate-50 font-medium"
              >
                {category}
              </Badge>
              <Badge
                variant={level === 'advanced' ? 'red' : level === 'intermediate' ? 'blue' : 'green'}
                className="font-bold tracking-wider"
              >
                {level.toUpperCase()}
              </Badge>
              <Badge
                className={cn(
                  'font-medium',
                  deliveryMode === 'ONLINE_ONLY' && 'bg-sky-50 text-sky-700 border-sky-200',
                  deliveryMode === 'IN_PERSON_ONLY' &&
                    'bg-amber-50 text-amber-700 border-amber-200',
                  deliveryMode === 'BOTH' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                )}
                variant="outline"
              >
                {deliveryMode === 'ONLINE_ONLY'
                  ? '🌐 Pure Online'
                  : deliveryMode === 'IN_PERSON_ONLY'
                    ? '🏢 In-Person Only'
                    : '🔄 Flexible (Online & In-Person)'}
              </Badge>
            </div>

            {/* Department / Audience / Prerequisites */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="rounded-lg bg-slate-50/80 p-2.5 border border-slate-100">
                <span className="font-semibold text-slate-500 block mb-0.5">Department:</span>
                <span className="text-slate-800 font-medium">
                  <RichContent inline html={department} placeholder="Not specified" />
                </span>
              </div>
              <div className="rounded-lg bg-slate-50/80 p-2.5 border border-slate-100">
                <span className="font-semibold text-slate-500 block mb-0.5">Target Audience:</span>
                <span className="text-slate-800 font-medium">
                  <RichContent inline html={targetAudience} placeholder="Not specified" />
                </span>
              </div>
              <div className="rounded-lg bg-slate-50/80 p-2.5 border border-slate-100">
                <span className="font-semibold text-slate-500 block mb-0.5">Prerequisites:</span>
                <span className="text-slate-800 font-medium">
                  <RichContent inline html={prerequisites} placeholder="None" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Course Description */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Course Description
          </p>
          {description && stripHtmlTags(description) ? (
            <div
              className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none bg-slate-50/50 p-4 rounded-xl border border-slate-100"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-800 italic">
              ⚠ No course description provided.
            </div>
          )}
        </div>

        {/* Course Learning Objectives */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Learning Objectives & Outcomes
          </p>
          {objectives && stripHtmlTags(objectives) ? (
            <div className="rounded-xl bg-blue-50/60 p-4 border border-blue-100/90 space-y-1">
              <div
                className="text-sm text-blue-950 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: objectives }}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-800 italic">
              ⚠ No learning objectives specified.
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Complete Curriculum Hierarchy & Attachments ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              <h4 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide">
                2. Curriculum Structure
              </h4>
            </div>
            <p className="text-xs text-slate-500">
              Course outline at a glance. Expand a module to see its lessons and sub-lessons.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToStep ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onNavigateToStep(1)}
                className="gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Curriculum
              </Button>
            ) : null}
          </div>
        </div>

        {modules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-5 text-center text-xs text-amber-800">
            ⚠ No modules added to this course yet. Go back to Step 2 to add modules and lessons.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200/90 divide-y divide-slate-200/80">
            {modules.map((module, mIdx) => {
              const isModExpanded = expandedModules.has(module.id);
              const lessons = module.lessons.filter((l) => !isModuleAssessmentLesson(l));
              const panelId = `review-module-${module.id}`;

              return (
                <div key={module.id} className="bg-white">
                  <button
                    type="button"
                    onClick={() => toggleModule(module.id)}
                    aria-expanded={isModExpanded}
                    aria-controls={panelId}
                    className={cn(
                      'group flex w-full items-center gap-3 px-4 py-3.5 text-left transition sm:px-5',
                      isModExpanded ? 'bg-indigo-50/40' : 'hover:bg-slate-50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition',
                        isModExpanded
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100',
                      )}
                    >
                      {mIdx + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-semibold text-slate-900">
                        {module.title.trim() || (
                          <span className="font-normal italic text-amber-600">Untitled Module</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">
                        {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
                        <span className="mx-1.5 text-slate-300">•</span>
                        {formatDuration(calculateModuleDuration(module))}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                        isModExpanded && 'rotate-180 text-indigo-600',
                      )}
                    />
                  </button>

                  {isModExpanded && (
                    <div id={panelId} className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
                      {lessons.length === 0 ? (
                        <p className="py-1.5 pl-11 text-xs italic text-amber-700">No lessons in this module yet.</p>
                      ) : (
                        <ol className="space-y-0.5">
                          {lessons.map((lesson, lIdx) => {
                            const subLessons = (lesson.subLessons ?? []).filter((sub) => !isLessonAssessmentSub(sub));
                            return (
                              <li key={lesson.id}>
                                <div className="flex items-baseline gap-3 rounded-lg px-2 py-1.5">
                                  <span className="w-9 shrink-0 text-right font-mono text-[11px] font-semibold text-indigo-600/80">
                                    {mIdx + 1}.{lIdx + 1}
                                  </span>
                                  <span className="min-w-0 text-sm font-medium text-slate-800">
                                    {withoutOutlineNumber(lesson.title, `${mIdx + 1}.${lIdx + 1}`) || (
                                      <span className="font-normal italic text-amber-600">Untitled Lesson</span>
                                    )}
                                  </span>
                                </div>
                                {subLessons.length > 0 && (
                                  <ul className="mb-1 ml-[3.25rem] space-y-0.5 border-l-2 border-slate-200 pl-4">
                                    {subLessons.map((sub, sIdx) => (
                                      <li key={sub.id} className="flex items-baseline gap-2.5 py-1">
                                        <span className="shrink-0 font-mono text-[10px] text-slate-400">
                                          {mIdx + 1}.{lIdx + 1}.{sIdx + 1}
                                        </span>
                                        <span className="min-w-0 text-[13px] text-slate-600">
                                          {withoutOutlineNumber(sub.title, `${mIdx + 1}.${lIdx + 1}.${sIdx + 1}`) || (
                                            <span className="italic text-amber-600">Untitled Sub-lesson</span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 3: Final Assessment & Completion Rules ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <h4 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide">
                3. Final Assessment & Evaluation Rules
              </h4>
            </div>
            <p className="text-xs text-slate-500">
              {quizTitle || 'Comprehensive Final Examination'}
            </p>
          </div>

          {onNavigateToStep ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToStep(2)}
              className="gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Assessment
            </Button>
          ) : null}
        </div>

        {/* Assessment Parameter Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Grade Weight', value: `${finalAssessmentWeight}%`, tone: 'text-indigo-700' },
            { label: 'Passing Score', value: `${passMark}%`, tone: 'text-emerald-600', note: 'Global policy' },
            { label: 'Time Limit', value: timeLimitMinutes ? formatDuration(timeLimitMinutes) : 'No limit', tone: 'text-slate-900' },
            { label: 'Attempts Allowed', value: String(attemptsAllowed), tone: 'text-slate-900' },
            {
              label: 'Questions',
              value: String(questions.length),
              tone: 'text-indigo-600',
              note: `${questions.reduce((sum, q) => sum + (q.points || 10), 0)} pts total`,
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
              <p className={cn('mt-1 text-lg font-bold', stat.tone)}>{stat.value}</p>
              {stat.note ? <p className="mt-0.5 text-[10px] font-medium text-slate-500">{stat.note}</p> : null}
            </div>
          ))}
        </div>

        {questions.length === 0 && (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-3.5 text-xs text-amber-800">
            ⚠ No final assessment questions added yet. Learners will complete the course without a final exam.
          </div>
        )}
      </div>

      {/* Course Assessment Weight Allocation Summary */}
      {totalAssessmentsCount > 0 && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-indigo-600" />
              <h4 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide">
                Course Assessment Weighting Summary ({totalAssessmentsCount} assessment{totalAssessmentsCount !== 1 ? 's' : ''})
              </h4>
            </div>
            <span
              className={cn(
                'text-xs font-bold px-2.5 py-1 rounded-lg border',
                totalAllocatedWeight === 100
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200',
              )}
            >
              Total Weight: {totalAllocatedWeight}% / 100% {totalAllocatedWeight === 100 ? '✓ Balanced' : '⚠ Action Needed'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            {curriculumQuizzes.map((q, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200/80"
              >
                <span className="text-slate-700 font-medium">
                  {q.moduleTitle} • {q.title}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">Pass: {q.passMark}%</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    Weight: {q.weight}%
                  </span>
                </div>
              </div>
            ))}
            {hasFinalAssessment && (
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-indigo-200">
                <span className="text-indigo-900 font-semibold">
                  Final Assessment • {quizTitle || 'Final Exam'}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">Pass: {passMark}%</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    Weight: {finalAssessmentWeight}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {totalAllocatedWeight !== 100 && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              ⚠ The sum of assessment weights is {totalAllocatedWeight}%. For balanced course grading, please allocate weights so that the total equals exactly 100%.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
