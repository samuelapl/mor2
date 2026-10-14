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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/90 bg-gradient-to-r from-muted via-primary-soft/20 to-card p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
              4
            </span>
            <h3 className="font-display text-lg font-bold text-foreground">
              Review & Submit Course
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            A high-level overview of your course before you submit it for approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={expandAll}
            className="gap-1.5 text-xs text-secondary-foreground hover:text-primary border-border bg-card shadow-2xs"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Expand All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={collapseAll}
            className="gap-1.5 text-xs text-secondary-foreground hover:text-foreground border-border bg-card shadow-2xs"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* ── Summary Stats Badges Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-border/90 bg-card p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
            Modules
          </p>
          <p className="mt-1 text-xl font-bold text-foreground">{modules.length}</p>
        </div>
        <div className="rounded-xl border border-border/90 bg-card p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
            Lessons
          </p>
          <p className="mt-1 text-xl font-bold text-foreground">{totalLessons}</p>
        </div>
        <div className="rounded-xl border border-border/90 bg-card p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
            Sub-Lessons
          </p>
          <p className="mt-1 text-xl font-bold text-foreground">{totalSubLessons}</p>
        </div>
        <div className="rounded-xl border border-border/90 bg-card p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
            Attachments
          </p>
          <p className="mt-1 text-xl font-bold text-primary">{totalAttachments}</p>
        </div>
        <div className="rounded-xl border border-border/90 bg-card p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
            Questions
          </p>
          <p className="mt-1 text-xl font-bold text-success">{questions.length}</p>
        </div>
        <div className="rounded-xl border border-border/90 bg-card p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
            Est. Time
          </p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {formatDuration(totalEstimatedDurationMin)}
          </p>
        </div>
      </div>

      {/* ── Section 1: Course Details Overview ── */}
      <div className="rounded-2xl border border-border/90 bg-card p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h4 className="font-display text-sm font-bold text-foreground uppercase tracking-wide">
              1. General Course Information
            </h4>
          </div>
          {onNavigateToStep ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToStep(0)}
              className="gap-1.5 text-xs text-primary hover:text-primary/80 hover:bg-primary-soft"
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
              <div className="relative overflow-hidden rounded-xl border border-border shadow-2xs aspect-video md:aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverPreview} alt="Course Cover" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/80 p-6 text-center aspect-video md:aspect-[4/3]">
                <BookOpen className="h-8 w-8 text-subtle-foreground mb-1" />
                <p className="text-xs text-subtle-foreground font-medium">No cover image</p>
              </div>
            )}
          </div>

          {/* Title & Metadata */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="space-y-1">
              <span className="inline-block rounded-md bg-primary-soft px-2.5 py-0.5 font-mono text-xs font-bold text-primary border border-primary/30 uppercase tracking-wider">
                <RichContent inline html={code} placeholder="NO-CODE" />
              </span>
              <h2 className="text-xl font-bold text-foreground leading-snug">
                <RichContent inline html={title} placeholder="Untitled Course" />
              </h2>
              {titleAm ? (
                <p className="text-sm text-secondary-foreground font-medium">
                  የስልጠና ርዕስ (አማርኛ): <RichContent inline html={titleAm} />
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge
                variant="outline"
                className="border-input text-secondary-foreground bg-muted font-medium"
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
                  deliveryMode === 'ONLINE_ONLY' && 'bg-info-soft text-info border-info/30',
                  deliveryMode === 'IN_PERSON_ONLY' &&
                    'bg-warning-soft text-warning border-warning/30',
                  deliveryMode === 'BOTH' && 'bg-success-soft text-success border-success/30',
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60 text-xs">
              <div className="rounded-lg bg-muted/80 p-2.5 border border-border/60">
                <span className="font-semibold text-muted-foreground block mb-0.5">Department:</span>
                <span className="text-foreground font-medium">
                  <RichContent inline html={department} placeholder="Not specified" />
                </span>
              </div>
              <div className="rounded-lg bg-muted/80 p-2.5 border border-border/60">
                <span className="font-semibold text-muted-foreground block mb-0.5">Target Audience:</span>
                <span className="text-foreground font-medium">
                  <RichContent inline html={targetAudience} placeholder="Not specified" />
                </span>
              </div>
              <div className="rounded-lg bg-muted/80 p-2.5 border border-border/60">
                <span className="font-semibold text-muted-foreground block mb-0.5">Prerequisites:</span>
                <span className="text-foreground font-medium">
                  <RichContent inline html={prerequisites} placeholder="None" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Course Description */}
        <div className="space-y-1.5 pt-2 border-t border-border/60">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Course Description
          </p>
          {description && stripHtmlTags(description) ? (
            <RichContent
              className="text-sm text-secondary-foreground leading-relaxed prose prose-sm max-w-none bg-muted/50 p-4 rounded-xl border border-border/60"
              html={description}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-warning/30 bg-warning-soft/60 p-3 text-xs text-warning italic">
              ⚠ No course description provided.
            </div>
          )}
        </div>

        {/* Course Learning Objectives */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Learning Objectives & Outcomes
          </p>
          {objectives && stripHtmlTags(objectives) ? (
            <div className="rounded-xl bg-info-soft/60 p-4 border border-info/25 space-y-1">
              <RichContent
                className="text-sm text-info leading-relaxed prose prose-sm max-w-none"
                html={objectives}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-warning/30 bg-warning-soft/60 p-3 text-xs text-warning italic">
              ⚠ No learning objectives specified.
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Complete Curriculum Hierarchy & Attachments ── */}
      <div className="rounded-2xl border border-border/90 bg-card p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h4 className="font-display text-sm font-bold text-foreground uppercase tracking-wide">
                2. Curriculum Structure
              </h4>
            </div>
            <p className="text-xs text-muted-foreground">
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
                className="gap-1.5 text-xs text-primary hover:text-primary/80 hover:bg-primary-soft"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Curriculum
              </Button>
            ) : null}
          </div>
        </div>

        {modules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-warning/30 bg-warning-soft/70 p-5 text-center text-xs text-warning">
            ⚠ No modules added to this course yet. Go back to Step 2 to add modules and lessons.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/90 divide-y divide-border/80">
            {modules.map((module, mIdx) => {
              const isModExpanded = expandedModules.has(module.id);
              const lessons = module.lessons.filter((l) => !isModuleAssessmentLesson(l));
              const panelId = `review-module-${module.id}`;

              return (
                <div key={module.id} className="bg-card">
                  <button
                    type="button"
                    onClick={() => toggleModule(module.id)}
                    aria-expanded={isModExpanded}
                    aria-controls={panelId}
                    className={cn(
                      'group flex w-full items-center gap-3 px-4 py-3.5 text-left transition sm:px-5',
                      isModExpanded ? 'bg-primary-soft/40' : 'hover:bg-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition',
                        isModExpanded
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-primary-soft text-primary group-hover:bg-primary/15',
                      )}
                    >
                      {mIdx + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-semibold text-foreground">
                        {module.title.trim() || (
                          <span className="font-normal italic text-warning">Untitled Module</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
                        <span className="mx-1.5 text-subtle-foreground">•</span>
                        {formatDuration(calculateModuleDuration(module))}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-subtle-foreground transition-transform duration-200',
                        isModExpanded && 'rotate-180 text-primary',
                      )}
                    />
                  </button>

                  {isModExpanded && (
                    <div id={panelId} className="border-t border-border/60 bg-muted/50 px-4 py-3 sm:px-5">
                      {lessons.length === 0 ? (
                        <p className="py-1.5 pl-11 text-xs italic text-warning">No lessons in this module yet.</p>
                      ) : (
                        <ol className="space-y-0.5">
                          {lessons.map((lesson, lIdx) => {
                            const subLessons = (lesson.subLessons ?? []).filter((sub) => !isLessonAssessmentSub(sub));
                            return (
                              <li key={lesson.id}>
                                <div className="flex items-baseline gap-3 rounded-lg px-2 py-1.5">
                                  <span className="w-9 shrink-0 text-right font-mono text-[11px] font-semibold text-primary/80">
                                    {mIdx + 1}.{lIdx + 1}
                                  </span>
                                  <span className="min-w-0 text-sm font-medium text-foreground">
                                    {withoutOutlineNumber(lesson.title, `${mIdx + 1}.${lIdx + 1}`) || (
                                      <span className="font-normal italic text-warning">Untitled Lesson</span>
                                    )}
                                  </span>
                                </div>
                                {subLessons.length > 0 && (
                                  <ul className="mb-1 ml-[3.25rem] space-y-0.5 border-l-2 border-border pl-4">
                                    {subLessons.map((sub, sIdx) => (
                                      <li key={sub.id} className="flex items-baseline gap-2.5 py-1">
                                        <span className="shrink-0 font-mono text-[10px] text-subtle-foreground">
                                          {mIdx + 1}.{lIdx + 1}.{sIdx + 1}
                                        </span>
                                        <span className="min-w-0 text-[13px] text-secondary-foreground">
                                          {withoutOutlineNumber(sub.title, `${mIdx + 1}.${lIdx + 1}.${sIdx + 1}`) || (
                                            <span className="italic text-warning">Untitled Sub-lesson</span>
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
      <div className="rounded-2xl border border-border/90 bg-card p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h4 className="font-display text-sm font-bold text-foreground uppercase tracking-wide">
                3. Final Assessment & Evaluation Rules
              </h4>
            </div>
            <p className="text-xs text-muted-foreground">
              {quizTitle || 'Comprehensive Final Examination'}
            </p>
          </div>

          {onNavigateToStep ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToStep(2)}
              className="gap-1.5 text-xs text-primary hover:text-primary/80 hover:bg-primary-soft"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Assessment
            </Button>
          ) : null}
        </div>

        {/* Assessment Parameter Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Grade Weight', value: `${finalAssessmentWeight}%`, tone: 'text-primary' },
            { label: 'Passing Score', value: `${passMark}%`, tone: 'text-success', note: 'Global policy' },
            { label: 'Time Limit', value: timeLimitMinutes ? formatDuration(timeLimitMinutes) : 'No limit', tone: 'text-foreground' },
            { label: 'Attempts Allowed', value: String(attemptsAllowed), tone: 'text-foreground' },
            {
              label: 'Questions',
              value: String(questions.length),
              tone: 'text-primary',
              note: `${questions.reduce((sum, q) => sum + (q.points || 10), 0)} pts total`,
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border/80 bg-muted/70 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
              <p className={cn('mt-1 text-lg font-bold', stat.tone)}>{stat.value}</p>
              {stat.note ? <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{stat.note}</p> : null}
            </div>
          ))}
        </div>

        {questions.length === 0 && (
          <div className="rounded-xl border border-dashed border-warning/30 bg-warning-soft/70 p-3.5 text-xs text-warning">
            ⚠ No final assessment questions added yet. Learners will complete the course without a final exam.
          </div>
        )}
      </div>

      {/* Course Assessment Weight Allocation Summary */}
      {totalAssessmentsCount > 0 && (
        <div className="rounded-2xl border border-border/90 bg-card p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <h4 className="font-display text-sm font-bold text-foreground uppercase tracking-wide">
                Course Assessment Weighting Summary ({totalAssessmentsCount} assessment{totalAssessmentsCount !== 1 ? 's' : ''})
              </h4>
            </div>
            <span
              className={cn(
                'text-xs font-bold px-2.5 py-1 rounded-lg border',
                totalAllocatedWeight === 100
                  ? 'bg-success-soft text-success border-success/30'
                  : 'bg-warning-soft text-warning border-warning/30',
              )}
            >
              Total Weight: {totalAllocatedWeight}% / 100% {totalAllocatedWeight === 100 ? '✓ Balanced' : '⚠ Action Needed'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            {curriculumQuizzes.map((q, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-card px-3 py-2 rounded-lg border border-border/80"
              >
                <span className="text-secondary-foreground font-medium">
                  {q.moduleTitle} • {q.title}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Pass: {q.passMark}%</span>
                  <span className="font-bold text-primary bg-primary-soft px-2 py-0.5 rounded">
                    Weight: {q.weight}%
                  </span>
                </div>
              </div>
            ))}
            {hasFinalAssessment && (
              <div className="flex items-center justify-between bg-card px-3 py-2 rounded-lg border border-primary/30">
                <span className="text-primary font-semibold">
                  Final Assessment • {quizTitle || 'Final Exam'}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Pass: {passMark}%</span>
                  <span className="font-bold text-primary bg-primary-soft px-2 py-0.5 rounded">
                    Weight: {finalAssessmentWeight}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {totalAllocatedWeight !== 100 && (
            <p className="text-xs text-warning bg-warning-soft p-2.5 rounded-lg border border-warning/30">
              ⚠ The sum of assessment weights is {totalAllocatedWeight}%. For balanced course grading, please allocate weights so that the total equals exactly 100%.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
