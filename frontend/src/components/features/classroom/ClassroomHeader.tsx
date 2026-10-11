'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { Course } from '@/types';
import type { ApiCourseProgress } from '@/lib/api/types';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

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
  const { lang, t } = useTranslation('classroom');
  const overallPercent = Math.round(progress?.stats.overallPercent ?? 0);
  const isCompleted = progress?.courseCompletion.certificateEligible ?? false;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/90 bg-card/95 px-3 sm:px-6 backdrop-blur shadow-2xs transition-colors duration-200">
      {/* Left: Back button & Course Identity */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Link
          href="/learner/my-courses"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary hover:text-primary transition shrink-0"
          title="Return to My Courses"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('classroomHeader.myCourses')}</span>
        </Link>

        <div className="hidden sm:block h-4 w-px bg-border shrink-0" />

        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/80 bg-card text-secondary-foreground hover:bg-muted hover:text-primary transition shrink-0"
          title={sidebarOpen ? 'Collapse curriculum sidebar' : 'Expand curriculum sidebar'}
          aria-label={t('classroomHeader.courseContents')}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex items-center gap-2">
          <span className="hidden md:inline-flex font-mono text-[11px] font-bold text-primary bg-primary-soft px-2 py-0.5 rounded border border-primary/30 shrink-0">
            {course.code}
          </span>
          <h1 className="text-sm font-bold text-foreground truncate" title={course.title}>
            {course.title}
          </h1>
          <Badge variant="outline" className="hidden lg:inline-flex text-[10px] py-0">
            {course.level}
          </Badge>
        </div>
      </div>

      {/* Right: Progress bar & Completion Pill & LanguageToggle */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Phones: just the number; the bar and status pill need more room. */}
        <span className="sm:hidden font-mono text-xs font-bold text-primary">
          {overallPercent}%
        </span>
        <div className="hidden sm:flex flex-col items-end gap-1 min-w-[140px] mr-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-secondary-foreground">
            <span>{t('classroomHeader.progress')}</span>
            <span className="font-mono font-bold text-primary">{overallPercent}%</span>
          </div>
          <div className="w-full">
            <ProgressBar value={overallPercent} />
          </div>
        </div>

        {isCompleted ? (
          <Badge variant="green" dot className="hidden sm:inline-flex text-xs mr-2">
            {t('classroomHeader.coursePassed')}
          </Badge>
        ) : (
          <Badge variant="blue" dot className="hidden sm:inline-flex text-xs mr-2">
            {t('classroomFooter.inProgress')}
          </Badge>
        )}

        <LanguageToggle compact className="sm:hidden" />
        <LanguageToggle className="hidden sm:inline-block" />
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
