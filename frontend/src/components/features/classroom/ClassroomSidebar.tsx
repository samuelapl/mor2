"use client";

import { useMemo } from "react";
import {
  Award,
  BookOpen,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  FileSpreadsheet,
  FileText,
  Headphones,
  Lock,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import type { Course, Lesson, Module } from "@/types";
import type { ApiCourseProgress } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import type { ClassroomActiveContent, ClassroomFlatItem } from "./types";

interface ClassroomSidebarProps {
  course: Course;
  progress: ApiCourseProgress | null;
  flatItems: ClassroomFlatItem[];
  activeContent: ClassroomActiveContent | null;
  expandedModules: Record<string, boolean>;
  onToggleModule: (moduleId: string) => void;
  onSelectItem: (item: ClassroomFlatItem) => void;
  isOpen: boolean;
}

function renderContentIcon(type?: string, className = "h-3.5 w-3.5") {
  const norm = (type || "").toUpperCase();
  if (norm === "VIDEO") return <PlayCircle className={cn("text-rose-500", className)} />;
  if (norm === "AUDIO") return <Headphones className={cn("text-amber-500", className)} />;
  if (norm === "ASSIGNMENT") return <FileSpreadsheet className={cn("text-emerald-500", className)} />;
  return <FileText className={cn("text-indigo-500", className)} />;
}

function cleanModuleTitle(title: string): string {
  if (!title) return "";
  return title.replace(/^(Module\s*)?\d+\s*[:\-–]?\s*/i, "").trim() || title;
}

function cleanLessonTitle(title: string): string {
  if (!title) return "";
  return title.replace(/^(Lesson\s*)?(\d+\.)*\d*\s*[:\-–]?\s*/i, "").trim() || title;
}

function cleanSubTitle(title: string): string {
  if (!title) return "";
  return title.replace(/^(\d+\.)+\d*\s*[:\-–]?\s*/, "").trim() || title;
}

export function ClassroomSidebar({
  course,
  progress,
  flatItems,
  activeContent,
  expandedModules,
  onToggleModule,
  onSelectItem,
  isOpen,
}: ClassroomSidebarProps) {
  // Map flat items by key for instant lookup
  const itemsByKey = useMemo(() => {
    const map = new Map<string, ClassroomFlatItem>();
    flatItems.forEach((i) => map.set(i.key, i));
    return map;
  }, [flatItems]);

  const moduleProgressMap = useMemo(() => {
    const map = new Map<string, any>();
    progress?.modules.forEach((m) => map.set(m.moduleId, m));
    return map;
  }, [progress]);

  const activeKey = activeContent?.item.key;
  const courseOverviewItem = flatItems.find((i) => i.type === "COURSE_OVERVIEW");
  const isCourseOverviewActive = activeKey === courseOverviewItem?.key;

  if (!isOpen) return null;

  return (
    <aside className="w-80 sm:w-88 shrink-0 border-r border-slate-200 bg-white flex flex-col h-full overflow-hidden select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Course Curriculum
          </p>
          <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
            {course.modules.length} Modules
          </span>
        </div>
      </div>

      {/* Curriculum Tree (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {courseOverviewItem && (
          <button
            type="button"
            onClick={() => onSelectItem(courseOverviewItem)}
            className={cn(
              "w-full flex items-center justify-between p-3 rounded-xl border text-left transition group",
              isCourseOverviewActive
                ? "border-indigo-300 bg-indigo-50/80 text-indigo-950 font-semibold ring-1 ring-indigo-500/20 shadow-2xs"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs",
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs",
                  isCourseOverviewActive
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-indigo-50 border-indigo-200 text-indigo-700 group-hover:bg-indigo-100",
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">Course Overview & Objectives</p>
                <p className="text-[11px] text-slate-400">Orientation & Syllabus</p>
              </div>
            </div>
            {isCourseOverviewActive ? (
              <CircleDot className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            )}
          </button>
        )}

        {course.modules.map((mod, mIdx) => {
          const modProg = moduleProgressMap.get(mod.id);
          const isExpanded = expandedModules[mod.id] ?? false;
          const isUnlocked = modProg?.unlocked ?? (mIdx === 0);
          const completedLessons = modProg?.completedLessons ?? 0;
          const totalLessons = modProg?.totalLessons ?? mod.lessons.length;
          const isModuleComplete = totalLessons > 0 && completedLessons === totalLessons;

          // Find module quiz flat item if exists
          const moduleQuizItem = flatItems.find(
            (i) => i.moduleId === mod.id && i.quizKind === "MODULE_ASSESSMENT",
          );

          return (
            <div
              key={mod.id}
              className={cn(
                "rounded-xl border transition-all overflow-hidden",
                isUnlocked
                  ? "border-slate-200 bg-white shadow-2xs"
                  : "border-slate-200/60 bg-slate-50/50 opacity-70",
              )}
            >
              {/* Module Header Bar */}
              <button
                type="button"
                onClick={() => isUnlocked && onToggleModule(mod.id)}
                disabled={!isUnlocked}
                className={cn(
                  "w-full flex items-center justify-between p-3 text-left transition hover:bg-slate-50/80",
                  !isUnlocked && "cursor-not-allowed",
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold font-mono border",
                      isUnlocked
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                        : "bg-slate-100 border-slate-200 text-slate-400",
                    )}
                  >
                    {mIdx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Module {mIdx + 1}: {cleanModuleTitle(mod.title)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {completedLessons}/{totalLessons} lessons completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {!isUnlocked ? (
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                  ) : isModuleComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Module Expanded Content */}
              {isExpanded && isUnlocked ? (
                <div className="p-2 pt-0 space-y-1.5 border-t border-slate-100 bg-slate-50/40">
                  {/* Module Overview Item (only if module has description, objectives, or attachments) */}
                  {(() => {
                    const moduleOverviewItem = flatItems.find(
                      (i) => i.moduleId === mod.id && i.type === "MODULE_OVERVIEW",
                    );
                    if (!moduleOverviewItem) return null;
                    const isModOverviewActive = activeKey === moduleOverviewItem.key;
                    return (
                      <button
                        type="button"
                        onClick={() => onSelectItem(moduleOverviewItem)}
                        className={cn(
                          "w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left transition text-xs font-medium",
                          isModOverviewActive
                            ? "bg-indigo-50 text-indigo-950 font-semibold ring-1 ring-indigo-500/20 shadow-2xs"
                            : "text-slate-700 hover:bg-white hover:shadow-2xs",
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Sparkles
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              isModOverviewActive ? "text-indigo-600" : "text-indigo-500",
                            )}
                          />
                          <span className="truncate">Module Overview & Objectives</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isModOverviewActive ? (
                            <CircleDot className="h-3.5 w-3.5 text-indigo-600" />
                          ) : (
                            <div className="h-2 w-2 rounded-full border border-slate-300" />
                          )}
                        </div>
                      </button>
                    );
                  })()}

                  {mod.lessons.map((lesson, lIdx) => {
                    const lessonKey = `lesson-${lesson.id}`;
                    const lessonItem = itemsByKey.get(lessonKey);
                    const isLessonActive = activeKey === lessonKey;
                    const isLessonUnlocked = lessonItem?.unlocked ?? false;
                    const isLessonCompleted = lessonItem?.completed ?? false;

                    // Child sub-lessons
                    const subLessons = lesson.subLessons ?? [];

                    // Lesson Checkpoint Quiz flat item
                    const lessonQuizItem = flatItems.find(
                      (i) => i.lessonId === lesson.id && i.quizKind === "LESSON_ASSESSMENT",
                    );

                    return (
                      <div key={lesson.id} className="space-y-1">
                        {/* Lesson Row */}
                        <button
                          type="button"
                          onClick={() => lessonItem && isLessonUnlocked && onSelectItem(lessonItem)}
                          disabled={!isLessonUnlocked}
                          className={cn(
                            "w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left transition text-xs font-medium",
                            isLessonActive
                              ? "bg-indigo-50 text-indigo-950 font-semibold ring-1 ring-indigo-500/20 shadow-2xs"
                              : isLessonUnlocked
                              ? "text-slate-700 hover:bg-white hover:shadow-2xs"
                              : "text-slate-400 cursor-not-allowed",
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {renderContentIcon(lesson.contentType)}
                            <span className="truncate">
                              Lesson {mIdx + 1}.{lIdx + 1}: {cleanLessonTitle(lesson.title)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {lesson.durationMin ? (
                              <span className="text-[10px] text-slate-400">
                                {lesson.durationMin}m
                              </span>
                            ) : null}
                            {!isLessonUnlocked ? (
                              <Lock className="h-3 w-3 text-slate-400" />
                            ) : isLessonCompleted ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : isLessonActive ? (
                              <CircleDot className="h-3.5 w-3.5 text-indigo-600" />
                            ) : (
                              <div className="h-2 w-2 rounded-full border border-slate-300" />
                            )}
                          </div>
                        </button>

                        {/* Sub-lessons list (Indented) */}
                        {subLessons.length > 0 && (
                          <div className="pl-5 space-y-1 border-l border-indigo-100 ml-3.5">
                            {subLessons.map((sub, sIdx) => {
                              const subKey = `sub-${sub.id}`;
                              const subItem = itemsByKey.get(subKey);
                              const isSubActive = activeKey === subKey;
                              const isSubUnlocked = subItem?.unlocked ?? false;
                              const isSubCompleted = subItem?.completed ?? false;

                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => subItem && isSubUnlocked && onSelectItem(subItem)}
                                  disabled={!isSubUnlocked}
                                  className={cn(
                                    "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left transition text-[11px]",
                                    isSubActive
                                      ? "bg-indigo-50 text-indigo-900 font-semibold ring-1 ring-indigo-400/20"
                                      : isSubUnlocked
                                      ? "text-slate-600 hover:bg-white"
                                      : "text-slate-400 cursor-not-allowed",
                                  )}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                                    <span className="truncate">
                                      {cleanSubTitle(sub.title)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {!isSubUnlocked ? (
                                      <Lock className="h-2.5 w-2.5 text-slate-400" />
                                    ) : isSubCompleted ? (
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    ) : isSubActive ? (
                                      <CircleDot className="h-3 w-3 text-indigo-600" />
                                    ) : null}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Lesson Checkpoint Quiz Item (Directly below sub-lessons) */}
                        {lessonQuizItem && (
                          <div className="pl-4 ml-3 border-l border-indigo-100 pt-0.5">
                            <button
                              type="button"
                              onClick={() => lessonQuizItem.unlocked && onSelectItem(lessonQuizItem)}
                              disabled={!lessonQuizItem.unlocked}
                              className={cn(
                                "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition text-[11px] font-medium border",
                                activeKey === lessonQuizItem.key
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs font-semibold"
                                  : lessonQuizItem.unlocked
                                  ? lessonQuizItem.completed
                                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100/70"
                                    : "bg-white border-indigo-200 text-indigo-950 hover:bg-indigo-50/60"
                                  : "bg-slate-50 border-slate-200/80 text-slate-400 cursor-not-allowed",
                              )}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <BookOpenCheck className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">Lesson Assessment</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {!lessonQuizItem.unlocked ? (
                                  <Lock className="h-3 w-3" />
                                ) : lessonQuizItem.completed ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <span className="text-[10px] font-bold">Quiz</span>
                                )}
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Module Assessment Item (At the end of all lessons in module) */}
                  {moduleQuizItem && (
                    <div className="pt-2 border-t border-slate-200/70">
                      <button
                        type="button"
                        onClick={() => moduleQuizItem.unlocked && onSelectItem(moduleQuizItem)}
                        disabled={!moduleQuizItem.unlocked}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition text-xs font-semibold border",
                          activeKey === moduleQuizItem.key
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                            : moduleQuizItem.unlocked
                            ? moduleQuizItem.completed
                              ? "bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100"
                              : "bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-200 text-indigo-950 hover:from-indigo-100"
                            : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed",
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Award className="h-4 w-4 shrink-0" />
                          <span className="truncate">Module Assessment</span>
                        </div>


                        <div className="flex items-center gap-1 shrink-0">
                          {!moduleQuizItem.unlocked ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : moduleQuizItem.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              Take Exam
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}

        {/* Final Course Certification Assessment Item */}
        {flatItems.find((i) => i.quizKind === "FINAL_ASSESSMENT") ? (
          (() => {
            const finalItem = flatItems.find((i) => i.quizKind === "FINAL_ASSESSMENT")!;
            const isActive = activeKey === finalItem.key;

            return (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => finalItem.unlocked && onSelectItem(finalItem)}
                  disabled={!finalItem.unlocked}
                  className={cn(
                    "w-full flex items-center justify-between gap-2.5 p-3 rounded-xl text-left transition border shadow-2xs",
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : finalItem.unlocked
                      ? finalItem.completed
                        ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                        : "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent"
                      : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-75",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Sparkles className="h-4 w-4 shrink-0 text-amber-300" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">Final Course Assessment</p>
                      <p className="text-[10px] opacity-80 mt-0.5">Required for Certification</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!finalItem.unlocked ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : finalItem.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <span className="text-[10px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded">
                        Final
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })()
        ) : null}

        {/* Certificate of Completion Item (Directly below Final Assessment) */}
        {(() => {
          const certItem = flatItems.find((i) => i.type === "CERTIFICATE");
          if (!certItem) return null;
          const isActive = activeKey === certItem.key;
          const isUnlocked = certItem.unlocked;

          return (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onSelectItem(certItem)}
                className={cn(
                  "w-full flex items-center justify-between gap-2.5 p-3 rounded-xl text-left transition border shadow-2xs group cursor-pointer",
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : isUnlocked
                    ? "bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border-amber-300/80 text-amber-950 hover:border-amber-400 hover:shadow-xs"
                    : "bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-slate-100/70",
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition",
                      isActive
                        ? "bg-amber-400 text-slate-950 border-amber-300 font-bold"
                        : isUnlocked
                        ? "bg-amber-100 border-amber-300 text-amber-700"
                        : "bg-slate-100 border-slate-200 text-slate-400",
                    )}
                  >
                    <Award className="h-4 w-4 shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">Certificate of Completion</p>
                    <p className="text-[10px] opacity-75 mt-0.5 truncate">
                      {isUnlocked ? "Verified & Ready to View" : "Complete course to unlock"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!isUnlocked ? (
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
              </button>
            </div>
          );
        })()}
      </div>
    </aside>
  );
}

