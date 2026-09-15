"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ClipboardPen,
  FileText,
  Globe2,
  Lock,
  Trash2,
  UserPlus,
  UserRound,
  Video,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge, CourseStatusBadge, courseLevelLabel, courseLevelVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RichContent } from "@/components/ui/RichContent";
import { useLms } from "@/lib/lms-store";
import { fetchAssessment, fetchCourseAssessments } from "@/lib/api/quiz";
import type { ApiAssessment } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface CourseDetailModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  reviewActions?: {
    onApprove: () => void;
    onReject: () => void;
  };
}

export function CourseDetailModal({
  open,
  onClose,
  courseId,
  reviewActions,
}: CourseDetailModalProps) {
  const {
    courseById,
    userName,
    currentUser,
    users,
    assignTrainerToCourse,
    unassignTrainerFromCourse,
    publishCourse,
    unpublishCourse,
  } = useLms();
  const course = courseById(courseId);
  const [assessments, setAssessments] = useState<ApiAssessment[]>([]);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [flashError, setFlashError] = useState(false);

  const canManageTrainers = currentUser?.role === "system_admin" || currentUser?.role === "training_admin";
  const canUnpublish = currentUser?.role === "training_admin" || currentUser?.role === "system_admin";
  const trainerOptions = users.filter((u) => u.role === "trainer" && u.status === "active");
  const canPublish =
    canManageTrainers && course?.status === "approved" && !course.published;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAssessments([]);
    setFlash(null);
    setFlashError(false);
    setAssessmentLoading(true);
    (async () => {
      try {
        const list = await fetchCourseAssessments(courseId);
        if (cancelled || list.length === 0) return;
        const details = await Promise.all(list.map((item) => fetchAssessment(item.id)));
        if (!cancelled) setAssessments(details);
      } catch {
        // assessment preview is best-effort
      } finally {
        if (!cancelled) setAssessmentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, courseId]);

  if (!course) return null;

  const notify = (ok: boolean, message: string) => {
    setFlashError(!ok);
    setFlash(message);
  };

  const addTrainer = async (trainerId: string) => {
    if (!trainerId) return;
    const result = await assignTrainerToCourse(course.id, trainerId);
    notify(result.ok, result.ok ? "Trainer assigned." : result.message);
  };

  const removeTrainer = async (trainerId: string) => {
    const result = await unassignTrainerFromCourse(course.id, trainerId);
    notify(result.ok, result.ok ? "Trainer removed." : result.message);
  };

  const doPublish = async () => {
    if (!course.trainerId) {
      notify(false, "Assign a trainer before publishing the course.");
      return;
    }
    const result = await publishCourse(course.id);
    notify(result.ok, result.ok ? "Course published. Learners can now enroll." : result.message);
  };

  const doUnpublish = async () => {
    const result = await unpublishCourse(course.id);
    notify(
      result.ok,
      result.ok
        ? "Course unpublished. It no longer appears in the learner catalog."
        : result.message,
    );
  };

  const lessonCount = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const attachmentCount = course.attachments?.length ?? 0;

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
          <div className="-mx-6 -mt-5 mb-4 overflow-hidden rounded-b-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={course.cover}
              alt={`${course.title} cover`}
              className="h-40 w-full object-cover"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <CourseStatusBadge
            status={course.published ? "published" : course.status}
          />
          <Badge variant="outline">{course.category}</Badge>
          <Badge variant={courseLevelVariant(course.level)}>
            {courseLevelLabel(course.level)}
          </Badge>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-xs text-slate-600">
            <UserRound className="h-3.5 w-3.5 text-indigo-500/70" />
            Owner: {userName(course.ownerId)}
          </span>
          {(course.trainerIds?.length ?? 0) > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-xs text-slate-600">
              <UserRound className="h-3.5 w-3.5 text-indigo-500/70" />
              Trainers: {(course.trainerIds ?? []).map(userName).join(", ")}
            </span>
          ) : course.trainerId ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-xs text-slate-600">
              <UserRound className="h-3.5 w-3.5 text-indigo-500/70" />
              Trainer: {userName(course.trainerId)}
            </span>
          ) : null}
        </div>

        {flash ? (
          <div
            className={cn(
              "rounded-xl border px-4 py-2.5 text-sm",
              flashError
                ? "border-red-200/70 bg-red-50/80 text-red-700"
                : "border-emerald-200/70 bg-emerald-50/80 text-emerald-700",
            )}
          >
            {flash}
          </div>
        ) : null}

        <p className="text-sm leading-relaxed text-slate-600">
          {course.description}
        </p>

        {course.rejectionReason ? (
          <div className="rounded-xl border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">Admin feedback</p>
            <p className="mt-0.5">{course.rejectionReason}</p>
            {course.rejectedBy || course.rejectedAt ? (
              <p className="mt-1 text-[11px] text-red-500/80">
                {course.rejectedBy ? `Rejected by ${course.rejectedBy}` : null}
                {course.rejectedAt ? ` · ${course.rejectedAt}` : null}
              </p>
            ) : null}
          </div>
        ) : null}

        {!course.rejectionReason && course.lastRejectionReason ? (
          <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">Previous admin feedback</p>
            <p className="mt-0.5">{course.lastRejectionReason}</p>
          </div>
        ) : null}

        {canManageTrainers ? (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Trainer management · {lessonCount} lessons
              </h3>
              {canPublish ? (
                <Button
                  size="sm"
                  onClick={() => void doPublish()}
                  title={
                    course.trainerId
                      ? "Publish this course to all learners"
                      : "Assign a trainer before publishing"
                  }
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  Publish course
                </Button>
              ) : null}
              {canUnpublish && course.published ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void doUnpublish()}
                  title="Hide this course from the learner catalog"
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  Unpublish course
                </Button>
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              {course.trainerIds && course.trainerIds.length > 0 ? (
                course.trainerIds.map((trainerId) => (
                  <div
                    key={trainerId}
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-sm text-slate-700"
                  >
                    <span>{userName(trainerId)}</span>
                    <button
                      type="button"
                      onClick={() => void removeTrainer(trainerId)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove trainer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">
                  No trainer assigned yet. Publication requires at least one trainer.
                </p>
              )}
              <div className="flex items-center gap-2">
                <select
                  value=""
                  onChange={(event) => void addTrainer(event.target.value)}
                  className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="">{trainerOptions.length ? "Assign a trainer…" : "No trainers available"}</option>
                  {trainerOptions.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={trainerOptions.length === 0}
                  title="Assign trainer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Assign
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Modules & Lessons
          </h3>
          <div className="space-y-3">
            {course.modules.map((module, index) => {
              const lockedModule = module.unlocked === false;
              return (
                <div
                  key={module.id}
                  className={cn(
                    "overflow-hidden rounded-xl border bg-white shadow-sm",
                    lockedModule
                      ? "border-slate-200/60 bg-slate-50/40"
                      : "border-slate-200/80",
                  )}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        lockedModule ? "text-slate-500" : "text-slate-800",
                      )}
                    >
                      {lockedModule ? <Lock className="mr-1.5 inline h-3.5 w-3.5" /> : null}
                      {module.title}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200/70">
                      <ClipboardPen className="h-3.5 w-3.5 text-indigo-500/70" />
                      {module.lessons.length} lessons
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {module.lessons.map((lesson, lessonIndex) => {
                      const lockedLesson = lesson.unlocked === false;
                      const openLessonId = openLesson === lesson.id;
                      return (
                        <li key={lesson.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenLesson(openLessonId ? null : lesson.id)
                            }
                            className={cn(
                              "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors",
                              lockedLesson
                                ? "cursor-not-allowed text-slate-400"
                                : "text-slate-600 hover:bg-indigo-50/30",
                            )}
                          >
                            <span>
                              {index + 1}.{lessonIndex + 1} · {lesson.title}
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
                              {lockedLesson ? (
                                <Lock className="h-3.5 w-3.5" />
                              ) : (
                                <CalendarDays className="h-3.5 w-3.5" />
                              )}
                              {lockedLesson ? "Locked" : `${lesson.durationMin} min`}
                              {!lockedLesson && lesson.content ? (
                                <ChevronDown
                                  className={cn(
                                    "ml-1 h-3.5 w-3.5 transition-transform",
                                    openLessonId ? "rotate-180" : "",
                                  )}
                                />
                              ) : null}
                            </span>
                          </button>
                          {openLessonId ? (
                            <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3">
                              <RichContent html={lesson.content} />
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {attachmentCount > 0 ? (
          <div>
            <h3 className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Attachments</span>
              <Badge variant="outline">{attachmentCount}</Badge>
            </h3>
            <ul className="space-y-2">
              {course.attachments?.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-sm"
                >
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-600"
                  >
                    {attachment.type === "video" ? (
                      <Video className="h-4 w-4 text-indigo-500/70" />
                    ) : (
                      <FileText className="h-4 w-4 text-indigo-500/70" />
                    )}
                    {attachment.name}
                  </a>
                  <Badge variant="outline">{attachment.type}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {assessmentLoading ? (
          <p className="text-xs text-slate-400">Loading assessments…</p>
        ) : assessments.length > 0 ? (
          <div className="space-y-4">
            <h3 className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>{assessments.length > 1 ? "Assessments" : "Final Assessment"}</span>
              <Badge variant="green" dot>
                {assessments.length} quiz{assessments.length > 1 ? "zes" : ""} ready
              </Badge>
            </h3>
            {assessments.map((assessment) => (
              <div key={assessment.id}>
                <div className="rounded-xl bg-gradient-to-r from-indigo-50/80 to-violet-50/80 px-4 py-3 ring-1 ring-inset ring-indigo-200/50">
                  <p className="text-sm font-semibold text-slate-800">{assessment.titleEn}</p>
                  <p className="text-[11px] text-slate-500">
                    {assessment.questions.length} questions
                    · pass mark {assessment.passingScore}% · {assessment.maxAttempts} attempts
                    {assessment.timeLimitMinutes ? ` · ${assessment.timeLimitMinutes} min` : ""}
                  </p>
                </div>
                {assessment.questions.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {assessment.questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm"
                      >
                        <p className="text-sm font-medium text-slate-800">
                          {index + 1}. {question.question}
                        </p>
                        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                          {question.options.map((option, optionIndex) => (
                            <li
                              key={optionIndex}
                              className={cn(
                                "rounded-lg px-2.5 py-1 text-xs",
                                question.correctAnswer !== undefined &&
                                  question.correctAnswer === optionIndex
                                  ? "bg-emerald-50 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200/60"
                                  : "text-slate-500",
                              )}
                            >
                              {option}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No assessment has been attached yet.</p>
        )}

        {reviewActions ? (
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="danger" onClick={reviewActions.onReject}>
              Reject course
            </Button>
            <Button variant="success" onClick={reviewActions.onApprove}>
              Approve course
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}