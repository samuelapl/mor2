"use client";

import { useState } from "react";
import { BookOpen, ClipboardPen, Layers, Lock, UserRound } from "lucide-react";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { Badge, courseLevelLabel, courseLevelVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RichContent } from "@/components/ui/RichContent";
import { LearnCourseModal } from "@/components/features/courses/LearnCourseModal";
import { useLms } from "@/lib/lms-store";

interface CatalogCourseModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
}

/**
 * Pre-enrollment course preview for the learner catalog. Shows the course
 * overview with the curriculum blurred behind an Enroll CTA; once the
 * learner is enrolled it hands off to the real LearnCourseModal, which
 * drives the actual sequential module/lesson unlock experience.
 */
export function CatalogCourseModal({ open, onClose, courseId }: CatalogCourseModalProps) {
  const { courseById, currentUser, userName, enrollSelf } = useLms();
  const course = courseById(courseId);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!course) return null;

  const me = currentUser?.id;
  const enrolled = me ? course.enrolledLearnerIds.includes(me) : false;

  if (enrolled) {
    return (
      <LearnCourseModal
        open={open}
        onClose={onClose}
        courseId={courseId}
        courseTitle={course.title}
      />
    );
  }

  const doEnroll = async () => {
    setEnrolling(true);
    setError(null);
    const result = await enrollSelf(courseId);
    setEnrolling(false);
    if (!result.ok) setError(result.message);
  };

  const lessonCount = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <WorkspaceDetailOverlay
      open={open}
      onClose={onClose}
      title={course.title}
      subtitle={`${course.code} · ${course.category}`}
      badge={<Badge variant={courseLevelVariant(course.level)}>{courseLevelLabel(course.level)}</Badge>}
      actions={
        <Button onClick={() => void doEnroll()} disabled={enrolling} className="shadow-xs">
          <BookOpen className="h-4 w-4" />
          {enrolling ? "Enrolling…" : "Enroll Now"}
        </Button>
      }
    >
      <div className="w-full space-y-6">
        {course.cover ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={course.cover}
              alt={`${course.title} cover`}
              className="h-48 w-full object-cover"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{course.category}</Badge>
          <Badge variant={courseLevelVariant(course.level)}>
            {courseLevelLabel(course.level)}
          </Badge>
          {course.trainerId ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-xs text-slate-600">
              <UserRound className="h-3.5 w-3.5 text-indigo-500/70" />
              Trainer: {userName(course.trainerId)}
            </span>
          ) : null}
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Course Overview
          </h4>
          <p className="text-sm leading-relaxed text-slate-600">{course.description}</p>
        </div>

        {/* Course Objectives */}
        {course.objectives ? (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-1.5">
              Course Learning Objectives
            </h4>
            <p className="text-xs text-indigo-950/90 whitespace-pre-line leading-relaxed">
              {course.objectives}
            </p>
          </div>
        ) : null}

        {/* Course Metadata Grid */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-800">Department: </span>
            <RichContent inline html={course.department} placeholder="Ministry of Revenues" />
          </div>
          <div>
            <span className="font-semibold text-slate-800">Target Audience: </span>
            <RichContent inline html={course.targetAudience} placeholder="All Staff" />
          </div>
          <div>
            <span className="font-semibold text-slate-800">Delivery: </span>
            {(course.deliveryMethod || "self_paced").replace("_", " ")}
          </div>
          <div>
            <span className="font-semibold text-slate-800">Language: </span>
            {course.language || "English"}
          </div>
          {course.prerequisites ? (
            <div className="sm:col-span-2 md:col-span-4 border-t border-slate-200/60 pt-2">
              <span className="font-semibold text-slate-800">Prerequisites: </span>
              <RichContent inline html={course.prerequisites} />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-slate-600">
            <Layers className="h-3.5 w-3.5 text-indigo-500/70" />
            {course.modules.length} modules
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-slate-600">
            <ClipboardPen className="h-3.5 w-3.5 text-indigo-500/70" />
            {lessonCount} lessons
          </span>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200/70 bg-red-50/80 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Locked Curriculum Preview */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Curriculum Preview (Enroll to unlock full lessons & materials)
          </h4>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80">
            <div aria-hidden className="select-none space-y-3 p-4 blur-xs pointer-events-none opacity-60">
              {course.modules.map((module, index) => (
                <div
                  key={module.id}
                  className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                    <p className="text-sm font-semibold text-slate-800">
                      {index + 1}. {module.title}
                    </p>
                    <span className="text-[11px] text-slate-500">
                      {module.lessons.length} lessons
                    </span>
                  </div>
                  {module.objectives ? (
                    <div className="px-4 py-1.5 text-xs text-indigo-900 bg-indigo-50/40 border-b border-slate-100">
                      <span className="font-semibold">Module Objectives:</span> {module.objectives}
                    </div>
                  ) : null}
                  <ul className="divide-y divide-slate-100">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <li key={lesson.id} className="px-4 py-2 text-xs text-slate-600">
                        {index + 1}.{lessonIndex + 1} · {lesson.title} ({lesson.durationMin}m)
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/10 backdrop-blur-[2px] px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">
                  Course Content Locked
                </p>
                <p className="text-xs text-slate-600 mt-0.5 max-w-sm">
                  Enroll in this course to gain immediate access to lessons, video materials, documents, and quizzes.
                </p>
              </div>
              <Button onClick={() => void doEnroll()} disabled={enrolling} className="gap-2 shadow-md">
                <BookOpen className="h-4 w-4" />
                {enrolling ? "Enrolling…" : "Enroll Now"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceDetailOverlay>
  );
}
