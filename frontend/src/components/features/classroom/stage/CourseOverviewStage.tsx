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
      <div className="rounded-2xl border border-border/90 bg-card p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="indigo" className="text-xs font-semibold">
            Course Orientation & Syllabus
          </Badge>
          <span className="font-mono text-xs font-bold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border">
            {course.code}
          </span>
          {course.level ? (
            <Badge variant="slate" className="capitalize text-xs">
              {course.level} Level
            </Badge>
          ) : null}
          {course.category ? (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
              {course.category}
            </span>
          ) : null}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
            {course.title}
          </h1>
          {course.department ? (
            <p className="text-xs text-muted-foreground mt-1">
              Ministry of Revenues ·{' '}
              <span className="font-medium text-secondary-foreground">{course.department}</span>
            </p>
          ) : null}
        </div>

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted border border-border/60">
            <Layers className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-subtle-foreground uppercase">Curriculum</p>
              <p className="text-xs font-bold text-foreground">
                {course.modules.length} Modules · {totalLessons} Topics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted border border-border/60">
            <Clock className="h-4 w-4 text-warning shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-subtle-foreground uppercase">Estimated Time</p>
              <p className="text-xs font-bold text-foreground">
                {formatDuration(totalDurationMin, isAmharic)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted border border-border/60">
            <Award className="h-4 w-4 text-success shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-subtle-foreground uppercase">Assessment</p>
              <p className="text-xs font-bold text-foreground">
                {finalPassingScore ? `${finalPassingScore}% Passing` : 'Graded Checks'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted border border-border/60">
            <CheckCircle2 className="h-4 w-4 text-info shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-subtle-foreground uppercase">Your Progress</p>
              <p className="text-xs font-bold text-foreground">{overallPercent}% Complete</p>
            </div>
          </div>
        </div>

      </div>

      {/* Course Description */}
      {hasDescription ? (
        <div className="rounded-2xl border border-border/90 bg-card p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Course Description & Overview
            </h2>
          </div>
          <div className="text-sm text-secondary-foreground leading-relaxed max-w-none">
            <RichContent html={course.description!} />
          </div>
        </div>
      ) : null}

      {/* Course Learning Objectives & Outcomes */}
      {hasObjectives ? (
        <div className="rounded-2xl border border-primary/25 bg-primary-soft/50 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
              Course Learning Objectives & Target Outcomes
            </h2>
          </div>
          <p className="text-xs text-primary/90">
            Upon successful completion of this training, learners will be able to demonstrate the
            following core competencies:
          </p>
          <div className="text-sm text-primary leading-relaxed bg-card/80 rounded-xl border border-primary/30 p-4 shadow-2xs">
            <RichContent html={course.objectives!} />
          </div>
        </div>
      ) : null}

      {/* Prerequisites & Target Audience Grid */}
      {hasPrerequisites || hasTargetAudience ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hasPrerequisites ? (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-warning" />
                Prerequisites & Requirements
              </h3>
              <div className="text-xs text-secondary-foreground leading-relaxed">
                <RichContent html={course.prerequisites!} />
              </div>
            </div>
          ) : null}

          {hasTargetAudience ? (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary-foreground flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                Target Audience
              </h3>
              <div className="text-xs text-secondary-foreground leading-relaxed">
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
