"use client";

import type { Course } from "@/types";
import type { ApiCourseProgress } from "@/lib/api/types";
import type { ClassroomActiveContent } from "../types";
import { DocumentStage } from "./DocumentStage";
import { MediaStage } from "./MediaStage";
import { AssignmentStage } from "./AssignmentStage";
import { QuizStage } from "./QuizStage";
import { CourseOverviewStage } from "./CourseOverviewStage";
import { ModuleOverviewStage } from "./ModuleOverviewStage";
import { CertificateStage } from "./CertificateStage";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface ClassroomStageProps {
  activeContent: ClassroomActiveContent | null;
  course: Course;
  progress?: ApiCourseProgress | null;
  courseId: string;
  courseTitle: string;
  onTakeQuiz: (assessmentId: string) => void;
  onItemComplete?: () => void;
  onNavigateNext?: () => void;
}

export function ClassroomStage({
  activeContent,
  course,
  progress,
  courseId,
  courseTitle,
  onTakeQuiz,
  onItemComplete,
  onNavigateNext,
}: ClassroomStageProps) {
  const { tBilingual } = useTranslation();

  if (!activeContent) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-slate-400">
        <p className="text-sm">
          {tBilingual(
            "Select a lesson, topic, or quiz from the curriculum sidebar.",
            "ከስርዓተ-ትምህርቱ ማውጫ ትምህርት፣ ርዕስ ወይም ፈተና ይምረጡ።"
          )}
        </p>
      </div>
    );
  }

  const { item, module, lesson, subLesson, lessonProgress, subLessonProgress, assessment } =
    activeContent;

  // 1. If active item is a Quiz (Lesson, Module, or Final)
  // 1. If active item is Course Overview & Objectives
  if (item.type === "COURSE_OVERVIEW") {
    return (
      <CourseOverviewStage
        course={course}
        progress={progress}
        onStartCourse={() => onNavigateNext?.()}
      />
    );
  }

  // 2. If active item is Module Overview & Objectives
  if (item.type === "MODULE_OVERVIEW" && module) {
    return (
      <ModuleOverviewStage
        module={module}
        moduleIndex={item.moduleIndex}
        moduleProgress={activeContent.moduleProgress}
        onStartLessons={() => onNavigateNext?.()}
      />
    );
  }

  // 3. If active item is a Quiz (Lesson, Module, or Final)
  if (item.type === "QUIZ") {
    return (
      <QuizStage
        assessment={assessment || item.assessment || null}
        quizKind={item.quizKind}
        courseTitle={courseTitle}
        unlocked={item.unlocked}
        onStartQuiz={() => onTakeQuiz(assessment?.id || item.quizId || "")}
      />
    );
  }

  // 4. If active item is Certificate of Completion
  if (item.type === "CERTIFICATE") {
    return (
      <CertificateStage
        course={course}
        progress={progress}
        courseId={courseId}
        unlocked={item.unlocked}
      />
    );
  }

  // Active target is either the sub-lesson (if selected) or the parent lesson
  const currentTarget = subLesson ?? lesson;
  const currentContentType = (currentTarget?.contentType || "DOCUMENT").toUpperCase();

  const badgeLabel = subLesson
    ? `Topic ${item.moduleIndex + 1}.${(item.lessonIndex ?? 0) + 1}.${(item.subIndex ?? 0) + 1}`
    : `Lesson ${item.moduleIndex + 1}.${(item.lessonIndex ?? 0) + 1}`;

  // 2. If active item is an Assignment
  if (currentContentType === "ASSIGNMENT" && currentTarget) {
    return (
      <AssignmentStage
        courseId={courseId}
        lesson={currentTarget}
        badgeLabel={badgeLabel}
        durationMin={currentTarget.durationMin}
        onSubmitted={onItemComplete}
      />
    );
  }

  // 3. If active item is a Video or Audio stream
  if (
    (currentContentType === "VIDEO" || currentContentType === "AUDIO") &&
    currentTarget
  ) {
    return (
      <MediaStage
        title={currentTarget.title}
        badgeLabel={badgeLabel}
        durationMin={currentTarget.durationMin}
        contentType={currentContentType}
        resourceUrl={currentTarget.resourceUrl}
        content={currentTarget.content}
        lesson={currentTarget}
      />
    );
  }

  // 4. Default: Full-page Reading Notes & Documents
  return (
    <DocumentStage
      title={currentTarget?.title || item.title}
      badgeLabel={badgeLabel}
      durationMin={currentTarget?.durationMin}
      content={currentTarget?.content}
      lesson={currentTarget}
      lessonProgress={lessonProgress}
      subLessonProgress={subLessonProgress}
      assessment={subLesson ? null : assessment}
      onTakeQuiz={onTakeQuiz}
    />
  );
}

