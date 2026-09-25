import type { ReactNode } from 'react';
import { BookOpen, Clock, FileText, Layers, ListChecks } from 'lucide-react';
import type { Course } from '@/types';
import { Card } from '@/components/ui/Card';
import {
  Badge,
  CourseStatusBadge,
  courseLevelLabel,
  courseLevelVariant,
} from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RichContent } from '@/components/ui/RichContent';

interface CourseCardProps {
  course: Course;
  extraBadge?: ReactNode;
  progress?: number;
  children?: ReactNode;
  onClick?: () => void;
  showStatus?: boolean;
}

export function CourseCard({
  course,
  extraBadge,
  progress,
  children,
  onClick,
  showStatus = true,
}: CourseCardProps) {
  const lessonCount = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const durationMin = course.modules.reduce(
    (sum, module) => sum + module.lessons.reduce((a, lesson) => a + lesson.durationMin, 0),
    0,
  );
  const attachmentCount = course.attachments?.length ?? 0;

  return (
    <Card
      interactive
      onClick={onClick}
      className="group/card flex h-full flex-col transition-all duration-200"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />
      {course.cover ? (
        <div className="-mx-5 -mt-5 mb-3 overflow-hidden rounded-t-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={course.cover}
            alt={`${course.title} cover`}
            className="h-32 w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          />
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500/80">
            <RichContent inline html={course.code} />
          </p>
          <h3 className="mt-1 font-display text-base font-bold tracking-tight text-slate-900">
            <RichContent inline html={course.title} />
          </h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {showStatus && (
            <CourseStatusBadge status={course.published ? 'published' : course.status} />
          )}
          <Badge variant={courseLevelVariant(course.level)}>{courseLevelLabel(course.level)}</Badge>
          {extraBadge}
        </div>
      </div>
      <div className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
        <RichContent inline html={course.description} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-slate-600">
          <BookOpen className="h-3.5 w-3.5 text-indigo-500/70" />
          {course.category}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-slate-600">
          <Layers className="h-3.5 w-3.5 text-indigo-500/70" />
          {course.modules.length} modules
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-slate-600">
          <ListChecks className="h-3.5 w-3.5 text-indigo-500/70" />
          {lessonCount} lessons
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-slate-600">
          <Clock className="h-3.5 w-3.5 text-indigo-500/70" />
          {durationMin} min
        </span>
        {attachmentCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-slate-600">
            <FileText className="h-3.5 w-3.5 text-indigo-500/70" />
            {attachmentCount} {attachmentCount === 1 ? 'file' : 'files'}
          </span>
        ) : null}
      </div>
      {typeof progress === 'number' ? (
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      ) : null}
      {children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}
    </Card>
  );
}
