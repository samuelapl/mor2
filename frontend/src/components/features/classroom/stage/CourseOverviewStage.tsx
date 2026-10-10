'use client';

import {
  BookOpen,
  Target,
  ArrowRight,
  GraduationCap,
  Layers,
  Clock,
  Award,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import type { Course } from '@/types';
import { formatDuration, getCourseDurationMinutes } from '@/lib/duration';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { ApiCourseProgress } from '@/lib/api/types';
import { RichContent, stripHtmlTags } from '@/components/ui/RichContent';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface CourseOverviewStageProps {
  course: Course;
  progress?: ApiCourseProgress | null;
  onStartCourse: () => void;
}

export function CourseOverviewStage({ course, progress, onStartCourse }: CourseOverviewStageProps) {
  const { isAmharic } = useTranslation();
  const hasDescription = Boolean(course.description && stripHtmlTags(course.description).trim());
  const hasObjectives = Boolean(course.objectives && stripHtmlTags(course.objectives).trim());
  const hasPrerequisites = Boolean(
    course.prerequisites && stripHtmlTags(course.prerequisites).trim(),
  );
  const hasTargetAudience = Boolean(
    course.targetAudience && stripHtmlTags(course.targetAudience).trim(),
  );


  const totalLessons = course.modules.reduce(
    (acc, m) =>
      acc +
      m.lessons.length +
      m.lessons.reduce((subAcc, l) => subAcc + (l.subLessons?.length ?? 0), 0),
    0,
  );

  const totalDurationMin = getCourseDurationMinutes(course);

  const overallPercent = Math.round(progress?.stats?.overallPercent ?? 0);
  const finalPassingScore = progress?.courseCompletion?.finalAssessment?.passingScore;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Hero Banner */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="indigo" className="text-xs font-semibold">
            Course Orientation & Syllabus
          </Badge>
          <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
            {course.code}
          </span>
          {course.level ? (
            <Badge variant="slate" className="capitalize text-xs">
              {course.level} Level
            </Badge>
          ) : null}
          {course.category ? (
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
              {course.category}
            </span>
          ) : null}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            {course.title}
          </h1>
          {course.department ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ministry of Revenues ·{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">{course.department}</span>
            </p>
          ) : null}
        </div>

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Curriculum</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {course.modules.length} Modules · {totalLessons} Topics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Estimated Time</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {formatDuration(totalDurationMin, isAmharic)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Assessment</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {finalPassingScore ? `${finalPassingScore}% Passing` : 'Graded Checks'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Your Progress</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{overallPercent}% Complete</p>
            </div>
          </div>
        </div>

      </div>

      {/* Course Description */}
      {hasDescription ? (
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Course Description & Overview
            </h2>
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-none">
            <RichContent html={course.description!} />
          </div>
        </div>
      ) : null}

      {/* Course Learning Objectives & Outcomes */}
      {hasObjectives ? (
        <div className="rounded-2xl border border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
            <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
              Course Learning Objectives & Target Outcomes
            </h2>
          </div>
          <p className="text-xs text-indigo-800/90 dark:text-indigo-300">
            Upon successful completion of this training, learners will be able to demonstrate the
            following core competencies:
          </p>
          <div className="text-sm text-indigo-950 dark:text-slate-200 leading-relaxed bg-white/80 dark:bg-slate-900/80 rounded-xl border border-indigo-100 dark:border-indigo-900/50 p-4 shadow-2xs">
            <RichContent html={course.objectives!} />
          </div>
        </div>
      ) : null}

      {/* Prerequisites & Target Audience Grid */}
      {hasPrerequisites || hasTargetAudience ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hasPrerequisites ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                Prerequisites & Requirements
              </h3>
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <RichContent html={course.prerequisites!} />
              </div>
            </div>
          ) : null}

          {hasTargetAudience ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Target Audience
              </h3>
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <RichContent html={course.targetAudience!} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Bottom Start Action */}
      <div className="pt-2 flex justify-end">
        <Button
          type="button"
          variant="primary"
          onClick={onStartCourse}
          className="flex items-center gap-2 font-semibold shadow-xs"
        >
          <span>{overallPercent > 0 ? 'Continue to Lessons' : 'Begin First Module'}</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
