"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { Course } from "@/types";
import type { ApiCourseProgress } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LanguageToggle } from "@/components/shared/LanguageToggle";

interface ClassroomHeaderProps {
  course: Course;
  progress: ApiCourseProgress | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function ClassroomHeader({
  course,
  progress,
  sidebarOpen,
  onToggleSidebar,
}: ClassroomHeaderProps) {
  const { tBilingual } = useTranslation();
  const overallPercent = Math.round(progress?.stats.overallPercent ?? 0);
  const isCompleted = progress?.courseCompletion.certificateEligible ?? false;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 sm:px-6 backdrop-blur shadow-2xs">
      {/* Left: Back button & Course Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/learner/my-courses"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition shrink-0"
          title="Return to My Courses"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{tBilingual("My Courses", "የእኔ ኮርሶች")}</span>
        </Link>

        <div className="h-4 w-px bg-slate-200 shrink-0" />

        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition shrink-0"
          title={sidebarOpen ? "Collapse curriculum sidebar" : "Expand curriculum sidebar"}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex items-center gap-2">
          <span className="hidden md:inline-flex font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
            {course.code}
          </span>
          <h1 className="text-sm font-bold text-slate-900 truncate" title={course.title}>
            {course.title}
          </h1>
          <Badge variant="outline" className="hidden lg:inline-flex text-[10px] py-0">
            {course.level}
          </Badge>
        </div>
      </div>

      {/* Right: Progress bar & Completion Pill & LanguageToggle */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex flex-col items-end gap-1 min-w-[140px]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>{tBilingual("Progress:", "እድገት:")}</span>
            <span className="font-mono font-bold text-indigo-600">{overallPercent}%</span>
          </div>
          <div className="w-full">
            <ProgressBar value={overallPercent} />
          </div>
        </div>

        {isCompleted ? (
          <Badge variant="green" dot className="text-xs">
            {tBilingual("Course Passed", "ኮርሱ ተጠናቋል")}
          </Badge>
        ) : (
          <Badge variant="blue" dot className="text-xs">
            {tBilingual("In Progress", "በመካሄድ ላይ")}
          </Badge>
        )}

        <LanguageToggle />
      </div>
    </header>
  );
}
