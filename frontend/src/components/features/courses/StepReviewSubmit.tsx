"use client";

import React, { useState, useMemo } from "react";
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  Film,
  FolderOpen,
  Headphones,
  HelpCircle,
  Layers,
  Link as LinkIcon,
  Maximize2,
  Minimize2,
  Paperclip,
  Pencil,
  Presentation,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { CourseDeliveryMode, CourseLevel, Question, UploadedResource } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RichContent, stripHtmlTags } from "@/components/ui/RichContent";
import { cn } from "@/lib/utils";
import type { LessonDraft, ModuleDraft, WizardContentType } from "./wizard-types";
import { formatFileSize } from "./wizard-components";

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
      name: item.fileName || item.resourceUrl.split("/").pop() || "Attached File",
      url: item.resourceUrl,
      size: item.fileSize,
    });
  }

  return Array.from(map.values());
}

/**
 * Determines appropriate icon and color based on file extension or URL.
 */
function getFileBadge(file: UploadedResource) {
  const url = (file.url || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const ext = name.split(".").pop() || url.split(".").pop() || "";

  if (["pdf"].includes(ext)) {
    return {
      icon: FileText,
      bgColor: "bg-rose-50 text-rose-700 border-rose-200",
      badgeLabel: "PDF",
    };
  }
  if (["doc", "docx"].includes(ext)) {
    return {
      icon: FileText,
      bgColor: "bg-blue-50 text-blue-700 border-blue-200",
      badgeLabel: "Word",
    };
  }
  if (["xls", "xlsx", "csv"].includes(ext)) {
    return {
      icon: FileSpreadsheet,
      bgColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      badgeLabel: "Spreadsheet",
    };
  }
  if (["ppt", "pptx"].includes(ext)) {
    return {
      icon: Presentation,
      bgColor: "bg-orange-50 text-orange-700 border-orange-200",
      badgeLabel: "Presentation",
    };
  }
  if (["mp4", "webm", "mov", "mkv"].includes(ext)) {
    return {
      icon: Film,
      bgColor: "bg-purple-50 text-purple-700 border-purple-200",
      badgeLabel: "Video",
    };
  }
  if (["mp3", "wav", "m4a", "aac"].includes(ext)) {
    return {
      icon: Headphones,
      bgColor: "bg-amber-50 text-amber-700 border-amber-200",
      badgeLabel: "Audio",
    };
  }
  return {
    icon: Paperclip,
    bgColor: "bg-slate-100 text-slate-700 border-slate-200",
    badgeLabel: ext.toUpperCase() || "File",
  };
}

/**
 * Renders an attachment row with file details and open/download action buttons.
 */
function AttachmentCard({ file }: { file: UploadedResource }) {
  const badge = getFileBadge(file);
  const Icon = badge.icon;
  const fileName = file.name || file.url.split("/").pop() || "Attachment";

  return (
    <div className="group flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-white p-2.5 px-3 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
            badge.bgColor,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-xs font-semibold text-slate-800 group-hover:text-indigo-700 transition"
            title={fileName}
          >
            {fileName}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-medium text-slate-600">{badge.badgeLabel}</span>
            {file.size ? (
              <>
                <span>•</span>
                <span>{formatFileSize(file.size)}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition shadow-2xs"
          title="Open file in new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Open</span>
        </a>
        <a
          href={file.url}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
          title="Download file"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download</span>
        </a>
      </div>
    </div>
  );
}

/**
 * Helper to get content type icon and styling
 */
function getContentTypeBadge(type: WizardContentType) {
  switch (type) {
    case "VIDEO":
      return { label: "Video Lesson", icon: Film, color: "text-purple-700 bg-purple-50 border-purple-200" };
    case "AUDIO":
      return { label: "Audio Lesson", icon: Headphones, color: "text-amber-700 bg-amber-50 border-amber-200" };
    case "DOCUMENT":
      return { label: "Document / Reading", icon: FileText, color: "text-blue-700 bg-blue-50 border-blue-200" };
    case "PRESENTATION":
      return { label: "Slide Presentation", icon: Presentation, color: "text-orange-700 bg-orange-50 border-orange-200" };
    case "QUIZ":
    case "ASSESSMENT":
      return { label: "Quiz Assessment", icon: FileQuestion, color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    case "ASSIGNMENT":
      return { label: "Graded Assignment", icon: Award, color: "text-rose-700 bg-rose-50 border-rose-200" };
    default:
      return { label: type, icon: BookOpen, color: "text-slate-700 bg-slate-100 border-slate-200" };
  }
}

export function StepReviewSubmit({
  title,
  titleAm,
  code,
  category,
  level,
  deliveryMode = "BOTH",
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
  assessmentResources = [],
  assessmentFileUrl,
  assessmentFileName,
  assessmentFileSize,
  onNavigateToStep,
}: StepReviewSubmitProps) {
  // Collect all module IDs for default-expanded state
  const initialModuleIds = useMemo(() => new Set(modules.map((m) => m.id)), [modules]);
  const initialLessonIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of modules) {
      for (const l of m.lessons) {
        ids.add(l.id);
        if (l.subLessons) {
          for (const sub of l.subLessons) {
            ids.add(sub.id);
          }
        }
      }
    }
    return ids;
  }, [modules]);

  const [expandedModules, setExpandedModules] = useState<Set<string>>(initialModuleIds);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(initialLessonIds);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleLesson = (id: string) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedModules(initialModuleIds);
    setExpandedLessons(initialLessonIds);
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
    setExpandedLessons(new Set());
  };

  // Aggregated totals
  const totalLessons = useMemo(
    () => modules.reduce((sum, m) => sum + m.lessons.length, 0),
    [modules],
  );

  const totalSubLessons = useMemo(
    () =>
      modules.reduce(
        (sum, m) => sum + m.lessons.reduce((s, l) => s + (l.subLessons?.length || 0), 0),
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

  const totalEstimatedDurationMin = useMemo(() => {
    let total = 0;
    for (const m of modules) {
      if (m.durationMinutes) {
        total += m.durationMinutes;
      } else {
        const lessonDuration = m.lessons.reduce((s, l) => {
          const subSum = (l.subLessons || []).reduce((ss, sub) => ss + (sub.durationMin || 0), 0);
          return s + (l.durationMin || 0) + subSum;
        }, 0);
        total += lessonDuration || 60;
      }
    }
    return total;
  }, [modules]);

  const allAssessmentAttachments = getItemAttachments({
    resources: assessmentResources,
    resourceUrl: assessmentFileUrl,
    fileName: assessmentFileName,
    fileSize: assessmentFileSize,
  });

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
            Comprehensive pre-publication review. All modules, attachments, reading notes, and
            assessment questions are fully expanded below for your verification.
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Modules</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{modules.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lessons</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{totalLessons}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sub-Lessons</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{totalSubLessons}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Attachments</p>
          <p className="mt-1 text-xl font-bold text-indigo-600">{totalAttachments}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Questions</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{questions.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Est. Time</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {totalEstimatedDurationMin >= 60
              ? `${Math.floor(totalEstimatedDurationMin / 60)}h ${totalEstimatedDurationMin % 60}m`
              : `${totalEstimatedDurationMin}m`}
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
                <img
                  src={coverPreview}
                  alt="Course Cover"
                  className="h-full w-full object-cover"
                />
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
              <Badge variant="outline" className="border-slate-300 text-slate-700 bg-slate-50 font-medium">
                {category}
              </Badge>
              <Badge
                variant={
                  level === "advanced" ? "red" : level === "intermediate" ? "blue" : "green"
                }
                className="font-bold tracking-wider"
              >
                {level.toUpperCase()}
              </Badge>
              <Badge
                className={cn(
                  "font-medium",
                  deliveryMode === "ONLINE_ONLY" && "bg-sky-50 text-sky-700 border-sky-200",
                  deliveryMode === "IN_PERSON_ONLY" && "bg-amber-50 text-amber-700 border-amber-200",
                  deliveryMode === "BOTH" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                )}
                variant="outline"
              >
                {deliveryMode === "ONLINE_ONLY"
                  ? "🌐 Pure Online"
                  : deliveryMode === "IN_PERSON_ONLY"
                    ? "🏢 In-Person Only"
                    : "🔄 Flexible (Online & In-Person)"}
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
                2. Curriculum Structure & Uploaded Materials
              </h4>
            </div>
            <p className="text-xs text-slate-500">
              Review all modules, lessons, reading notes, and every attached file.
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
          <div className="space-y-5">
            {modules.map((module, mIdx) => {
              const isModExpanded = expandedModules.has(module.id);
              const moduleAttachments = getItemAttachments(module);

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
                        Module {mIdx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-display text-base font-bold text-slate-900 truncate">
                          {module.title.trim() || (
                            <span className="text-amber-600 italic font-normal">
                              Untitled Module
                            </span>
                          )}
                        </h5>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {module.durationMinutes ? `${module.durationMinutes} min` : "60 min"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                        {module.lessons.length} Lesson{module.lessons.length !== 1 ? "s" : ""}
                      </span>
                      {moduleAttachments.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          <Paperclip className="h-3.5 w-3.5" />
                          {moduleAttachments.length} Attachment
                          {moduleAttachments.length !== 1 ? "s" : ""}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                        title={isModExpanded ? "Collapse Module" : "Expand Module"}
                      >
                        {isModExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Module Expanded Content */}
                  {isModExpanded && (
                    <div className="border-t border-slate-200/80 p-5 space-y-5">
                      {/* Module Description & Objectives */}
                      {module.description && stripHtmlTags(module.description) ? (
                        <div className="rounded-xl bg-white p-4 border border-slate-200/70 space-y-1">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Module Overview & Description
                          </p>
                          <div
                            className="text-xs text-slate-700 leading-relaxed prose prose-xs max-w-none"
                            dangerouslySetInnerHTML={{ __html: module.description }}
                          />
                        </div>
                      ) : null}

                      {/* Module Attached Materials */}
                      {moduleAttachments.length > 0 && (
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-2.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                            <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Module Attachments & Reference Materials ({moduleAttachments.length})</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {moduleAttachments.map((file, fIdx) => (
                              <AttachmentCard key={file.id || file.url || fIdx} file={file} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Module Lessons List */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Lessons in Module {mIdx + 1} ({module.lessons.length})
                          </p>
                        </div>

                        {module.lessons.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3.5 text-xs text-amber-800 italic">
                            ⚠ No lessons created for this module.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {module.lessons.map((lesson, lIdx) => {
                              const isLessExpanded = expandedLessons.has(lesson.id);
                              const lessonBadge = getContentTypeBadge(lesson.contentType);
                              const LessonTypeIcon = lessonBadge.icon;
                              const lessonAttachments = getItemAttachments(lesson);
                              const subLessons = lesson.subLessons || [];

                              return (
                                <div
                                  key={lesson.id}
                                  className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs"
                                >
                                  {/* Lesson Card Header */}
                                  <div
                                    onClick={() => toggleLesson(lesson.id)}
                                    className="flex cursor-pointer flex-wrap items-center justify-between gap-2.5 p-3.5 px-4 transition hover:bg-slate-50/60 select-none"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <span className="flex h-6 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 font-mono text-xs font-bold text-slate-700">
                                        {mIdx + 1}.{lIdx + 1}
                                      </span>
                                      <span className="font-semibold text-slate-900 text-sm truncate">
                                        {lesson.title.trim() || (
                                          <span className="text-amber-600 italic font-normal">
                                            Untitled Lesson
                                          </span>
                                        )}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                      <span
                                        className={cn(
                                          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
                                          lessonBadge.color,
                                        )}
                                      >
                                        <LessonTypeIcon className="h-3 w-3" />
                                        {lessonBadge.label}
                                      </span>
                                      <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                                        {lesson.durationMin || 15} min
                                      </span>
                                      {lesson.required === false ? (
                                        <Badge variant="outline" className="text-slate-500 border-slate-300">
                                          Optional
                                        </Badge>
                                      ) : (
                                        <Badge variant="slate" className="bg-slate-100 text-slate-700">
                                          Required
                                        </Badge>
                                      )}
                                      {lessonAttachments.length > 0 ? (
                                        <Badge variant="blue" className="gap-1">
                                          <Paperclip className="h-3 w-3" />
                                          {lessonAttachments.length}
                                        </Badge>
                                      ) : null}
                                      <button
                                        type="button"
                                        className="rounded p-1 text-slate-400 hover:text-slate-600"
                                        title={isLessExpanded ? "Collapse Lesson" : "Expand Lesson"}
                                      >
                                        {isLessExpanded ? (
                                          <ChevronUp className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Lesson Body (Fully Visible by default) */}
                                  {isLessExpanded && (
                                    <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/30 text-xs">
                                      {/* Lesson Reading Notes / Content */}
                                      <div className="space-y-1.5">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                          Reading Notes & Detailed Content
                                        </p>
                                        {lesson.content && stripHtmlTags(lesson.content) ? (
                                          <div
                                            className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-slate-700 leading-relaxed prose prose-sm max-w-none shadow-2xs"
                                            dangerouslySetInnerHTML={{ __html: lesson.content }}
                                          />
                                        ) : (
                                          <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 p-2.5 text-xs text-amber-700 italic">
                                            ⚠ No reading notes or instructions written for this lesson.
                                          </div>
                                        )}
                                      </div>

                                      {/* Lesson Attachments */}
                                      {lessonAttachments.length > 0 && (
                                        <div className="space-y-1.5">
                                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Lesson Attachments ({lessonAttachments.length})
                                          </p>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {lessonAttachments.map((file, fIdx) => (
                                              <AttachmentCard
                                                key={file.id || file.url || fIdx}
                                                file={file}
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Assignment Configuration Preview (if ASSIGNMENT) */}
                                      {lesson.contentType === "ASSIGNMENT" && (
                                        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3.5 space-y-2">
                                          <p className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                                            <Award className="h-4 w-4 text-rose-600" />
                                            Assignment Guidelines & Submission Rules
                                          </p>
                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                            <div className="bg-white/80 p-2 rounded-lg border border-rose-100">
                                              <span className="text-slate-500 font-medium">Max Marks: </span>
                                              <span className="font-bold text-slate-800">
                                                {lesson.assignmentMaxMarks || 100}
                                              </span>
                                            </div>
                                            <div className="bg-white/80 p-2 rounded-lg border border-rose-100">
                                              <span className="text-slate-500 font-medium">Due Date: </span>
                                              <span className="font-bold text-slate-800">
                                                {lesson.assignmentDueDate || "No deadline"}
                                              </span>
                                            </div>
                                            <div className="bg-white/80 p-2 rounded-lg border border-rose-100">
                                              <span className="text-slate-500 font-medium">Max File Size: </span>
                                              <span className="font-bold text-slate-800">
                                                {lesson.assignmentMaxFileSizeMb || 50} MB
                                              </span>
                                            </div>
                                          </div>
                                          {lesson.assignmentInstructions && (
                                            <div
                                              className="mt-1 text-slate-700 leading-relaxed prose prose-xs max-w-none bg-white p-2.5 rounded-lg border border-rose-100"
                                              dangerouslySetInnerHTML={{
                                                __html: lesson.assignmentInstructions,
                                              }}
                                            />
                                          )}
                                        </div>
                                      )}

                                      {/* Lesson Quiz Questions Preview (if QUIZ / ASSESSMENT) */}
                                      {lesson.quizQuestions && lesson.quizQuestions.length > 0 && (
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                                          <div className="flex items-center justify-between">
                                            <p className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                                              <FileQuestion className="h-4 w-4 text-emerald-600" />
                                              Lesson Quiz Questions ({lesson.quizQuestions.length})
                                            </p>
                                            <span className="text-[11px] font-semibold text-emerald-700">
                                              Passing score: {lesson.quizPassMark || 70}%
                                            </span>
                                          </div>

                                          <div className="space-y-2.5">
                                            {lesson.quizQuestions.map((q, qIdx) => (
                                              <div
                                                key={q.id || qIdx}
                                                className="rounded-lg border border-emerald-200/80 bg-white p-3 space-y-2 shadow-2xs"
                                              >
                                                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                                                  <span className="font-bold text-emerald-800 text-xs">
                                                    Q{qIdx + 1}:{" "}
                                                    <span className="font-medium text-slate-700">
                                                      {q.text}
                                                    </span>
                                                  </span>
                                                  <span className="text-[11px] font-semibold text-slate-500">
                                                    {q.points || 10} pts
                                                  </span>
                                                </div>

                                                {q.type === "multiple_choice" && (
                                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                    {q.options.map((opt, optIdx) => (
                                                      <div
                                                        key={optIdx}
                                                        className={cn(
                                                          "flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs",
                                                          q.correctIndex === optIdx
                                                            ? "bg-emerald-50 border-emerald-300 font-semibold text-emerald-900"
                                                            : "bg-slate-50 border-slate-200 text-slate-600",
                                                        )}
                                                      >
                                                        <span className="font-mono text-[11px] text-slate-400">
                                                          {String.fromCharCode(65 + optIdx)}.
                                                        </span>
                                                        <span className="truncate">{opt}</span>
                                                        {q.correctIndex === optIdx && (
                                                          <Check className="ml-auto h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}

                                                {q.type === "true_false" && (
                                                  <div className="flex items-center gap-2">
                                                    {["True", "False"].map((opt, optIdx) => (
                                                      <span
                                                        key={opt}
                                                        className={cn(
                                                          "px-2.5 py-1 rounded-md border text-xs font-semibold",
                                                          q.correctIndex === optIdx
                                                            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                                                            : "bg-slate-50 border-slate-200 text-slate-500",
                                                        )}
                                                      >
                                                        {opt}{" "}
                                                        {q.correctIndex === optIdx
                                                          ? "✓ (Correct)"
                                                          : ""}
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Sub-lessons Tree Container */}
                                      {subLessons.length > 0 && (
                                        <div className="space-y-2.5 pt-2">
                                          <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-indigo-500" />
                                            <p className="text-xs font-bold text-slate-800">
                                              Sub-Lessons ({subLessons.length})
                                            </p>
                                          </div>

                                          <div className="space-y-2.5 pl-3 sm:pl-4 border-l-2 border-indigo-200">
                                            {subLessons.map((sub, sIdx) => {
                                              const subBadge = getContentTypeBadge(sub.contentType);
                                              const SubIcon = subBadge.icon;
                                              const subAttachments = getItemAttachments(sub);

                                              return (
                                                <div
                                                  key={sub.id}
                                                  className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs"
                                                >
                                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                        {mIdx + 1}.{lIdx + 1}.{sIdx + 1}
                                                      </span>
                                                      <span className="font-semibold text-slate-800 text-xs truncate">
                                                        {sub.title.trim() || (
                                                          <span className="text-amber-600 italic font-normal">
                                                            Untitled Sub-lesson
                                                          </span>
                                                        )}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                      <span
                                                        className={cn(
                                                          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold border",
                                                          subBadge.color,
                                                        )}
                                                      >
                                                        <SubIcon className="h-3 w-3" />
                                                        {subBadge.label}
                                                      </span>
                                                      <span className="text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                                                        {sub.durationMin || 10} min
                                                      </span>
                                                    </div>
                                                  </div>

                                                  {/* Sub-lesson content */}
                                                  {sub.content && stripHtmlTags(sub.content) ? (
                                                    <div
                                                      className="rounded-lg bg-slate-50/70 p-2.5 text-slate-700 text-xs leading-relaxed prose prose-xs max-w-none border border-slate-100"
                                                      dangerouslySetInnerHTML={{ __html: sub.content }}
                                                    />
                                                  ) : null}

                                                  {/* Sub-lesson attachments */}
                                                  {subAttachments.length > 0 && (
                                                    <div className="space-y-1.5 pt-1">
                                                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                        Sub-Lesson Files ({subAttachments.length})
                                                      </p>
                                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {subAttachments.map((file, sfIdx) => (
                                                          <AttachmentCard
                                                            key={file.id || file.url || sfIdx}
                                                            file={file}
                                                          />
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
              {quizTitle || "Comprehensive Final Examination"}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
            <p className="text-slate-500 font-medium">Passing Score</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">{passMark}%</p>
          </div>
          <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
            <p className="text-slate-500 font-medium">Time Limit</p>
            <p className="text-lg font-bold text-slate-900 mt-1">
              {timeLimitMinutes ? `${timeLimitMinutes} min` : "No limit"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
            <p className="text-slate-500 font-medium">Attempts Allowed</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{attemptsAllowed}</p>
          </div>
          <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
            <p className="text-slate-500 font-medium">Total Questions</p>
            <p className="text-lg font-bold text-indigo-600 mt-1">{questions.length}</p>
          </div>
        </div>

        {/* Assessment Reference Files */}
        {allAssessmentAttachments.length > 0 && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider">
              <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
              <span>Assessment Reference Documents ({allAssessmentAttachments.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allAssessmentAttachments.map((file, fIdx) => (
                <AttachmentCard key={file.id || file.url || fIdx} file={file} />
              ))}
            </div>
          </div>
        )}

        {/* All Questions Preview (Expanded by default — no button click required!) */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Exam Questions Preview ({questions.length})
            </p>
            <span className="text-xs font-medium text-slate-500">
              Total Points: {questions.reduce((sum, q) => sum + (q.points || 10), 0)} pts
            </span>
          </div>

          {questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-4 text-amber-800 text-xs">
              ⚠ No assessment questions added yet. Learners will complete the course without an exam.
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, qIdx) => (
                <div
                  key={q.id || qIdx}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 text-xs space-y-2.5 shadow-2xs hover:border-slate-300 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white text-[11px] font-bold">
                        {qIdx + 1}
                      </span>
                      <Badge variant="slate" className="font-semibold text-slate-700 bg-white border-slate-200">
                        {q.type === "multiple_choice"
                          ? "Multiple Choice"
                          : q.type === "true_false"
                            ? "True / False"
                            : "Short Answer"}
                      </Badge>
                    </div>
                    <span className="font-bold text-indigo-700 text-xs">
                      {q.points || 10} Points
                    </span>
                  </div>

                  {/* Question Prompt */}
                  <div
                    className="font-medium text-slate-800 text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: q.text || "<em>No question prompt</em>" }}
                  />

                  {/* Question Image if present */}
                  {q.imageUrl ? (
                    <div className="pt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={q.imageUrl}
                        alt="Question context"
                        className="max-h-48 rounded-lg border border-slate-200 object-cover"
                      />
                    </div>
                  ) : null}

                  {/* Multiple Choice Options */}
                  {q.type === "multiple_choice" && (
                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctIndex === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition",
                              isCorrect
                                ? "bg-emerald-50 border-emerald-300 font-semibold text-emerald-900 shadow-2xs"
                                : "bg-white border-slate-200 text-slate-600",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-xs font-bold",
                                isCorrect
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-100 text-slate-500",
                              )}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isCorrect && (
                              <Badge
                                variant="green"
                                className="ml-auto text-xs py-0.5 px-2 bg-emerald-100 text-emerald-800 font-bold border-emerald-200"
                              >
                                Correct Answer ✓
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* True / False Options */}
                  {q.type === "true_false" && (
                    <div className="flex items-center gap-3 pt-1">
                      {["True", "False"].map((opt, optIdx) => {
                        const isCorrect = q.correctIndex === optIdx;
                        return (
                          <span
                            key={opt}
                            className={cn(
                              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs",
                              isCorrect
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                                : "bg-white border-slate-200 text-slate-500",
                            )}
                          >
                            {opt}
                            {isCorrect && (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer Rubric */}
                  {q.type === "short_answer" && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                      <span className="font-semibold text-slate-700 block mb-1">
                        Expected Keywords & Grading Rubric:
                      </span>
                      <p className="text-slate-600">
                        {q.answerText || (
                          <span className="italic text-slate-400">
                            No grading criteria specified.
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
