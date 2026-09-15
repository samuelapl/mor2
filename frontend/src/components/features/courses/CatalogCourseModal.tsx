"use client";

import { useState } from "react";
import { BookOpen, ClipboardPen, Layers, Lock, UserRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge, courseLevelLabel, courseLevelVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
    // On success `course.enrolledLearnerIds` updates and this component
    // re-renders into the `enrolled` branch above.
  };

  const lessonCount = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="screen"
      title={course.title}
      subtitle={`${course.code} · ${course.category}`}
    >
      <div className="space-y-5">
        {course.cover ? (
          <div className="-mx-6 -mt-5 mb-1 overflow-hidden rounded-b-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={course.cover}
              alt={`${course.title} cover`}
              className="h-40 w-full object-cover"
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

        <p className="text-sm leading-relaxed text-slate-600">{course.description}</p>

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

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80">
          <div aria-hidden className="select-none space-y-3 p-4 blur-sm">
            {course.modules.map((module, index) => (
              <div
                key={module.id}
                className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                  <p className="text-sm font-semibold text-slate-800">
                    {index + 1}. {module.title}
                  </p>
                  <span className="text-[11px] text-slate-500">
                    {module.lessons.length} lessons
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <li key={lesson.id} className="px-4 py-2.5 text-sm text-slate-600">
                      {index + 1}.{lessonIndex + 1} · {lesson.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {course.modules.length === 0 ? (
              <p className="text-xs text-slate-400">This course has no content yet.</p>
            ) : null}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/85 text-white">
              <Lock className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Enroll to unlock the curriculum
            </p>
            <Button onClick={() => void doEnroll()} disabled={enrolling}>
              <BookOpen className="h-3.5 w-3.5" />
              {enrolling ? "Enrolling…" : "Enroll now"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
