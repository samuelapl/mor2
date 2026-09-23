"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Course } from "@/types";
import type { ApiCourseProgress } from "@/lib/api/types";
import { fetchCourseDetail } from "@/lib/api/courses";
import { fetchCourseProgress, markLessonComplete } from "@/lib/api/progress";
import { courseFromDetail } from "@/lib/api/transform";
import { QuizTakerModal } from "@/components/features/quiz/QuizTakerModal";
import { ClassroomHeader } from "./ClassroomHeader";
import { ClassroomSidebar } from "./ClassroomSidebar";
import { ClassroomFooter } from "./ClassroomFooter";
import { ClassroomStage } from "./stage/ClassroomStage";
import { useClassroomNavigation } from "./hooks/useClassroomNavigation";
import { useClassroomHeartbeat } from "./hooks/useClassroomHeartbeat";

interface ClassroomShellProps {
  courseId: string;
}

export function ClassroomShell({ courseId }: ClassroomShellProps) {
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<ApiCourseProgress | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeQuizModalId, setActiveQuizModalId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // Fetch course and progress in parallel
  const loadData = useCallback(async () => {
    if (!courseId) return;
    try {
      const [detail, prog] = await Promise.all([
        fetchCourseDetail(courseId),
        fetchCourseProgress(courseId).catch(() => null),
      ]);
      setCourse(courseFromDetail(detail));
      setProgress(prog);
    } catch {
      setCourse(null);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Navigation management
  const {
    flatItems,
    activeContent,
    previousItem,
    nextItem,
    navigateTo,
    expandedModules,
    toggleModule,
  } = useClassroomNavigation({ course, progress });

  // Time tracking & heartbeats
  const activeItemId =
    activeContent?.subLesson?.id ?? activeContent?.lesson?.id ?? null;


  // Calculate study time for current active target
  const currentTargetProgress =
    activeContent?.subLessonProgress ?? activeContent?.lessonProgress;
  const initialSeconds = currentTargetProgress?.timeSpentSeconds ?? 0;
  const requiredSeconds = currentTargetProgress?.requiredSeconds ?? 0;

  const { liveSeconds, flushHeartbeat } = useClassroomHeartbeat({
    activeItemId,
    initialSeconds,
    requiredSeconds,
    onRequirementSatisfied: () => {
      void loadData();
    },
  });

  const spentSeconds =
    activeItemId && liveSeconds[activeItemId] !== undefined
      ? liveSeconds[activeItemId]
      : initialSeconds;

  const isOverview =
    activeContent?.item.type === "COURSE_OVERVIEW" ||
    activeContent?.item.type === "MODULE_OVERVIEW" ||
    activeContent?.item.type === "CERTIFICATE";

  const timeSatisfied =
    isOverview ||
    currentTargetProgress?.timeSatisfied ||
    requiredSeconds <= 0 ||
    spentSeconds >= requiredSeconds;

  // Complete current lesson / sub-lesson and advance
  const handleCompleteAndNext = async () => {
    if (!activeItemId || isOverview) {
      if (nextItem) navigateTo(nextItem);
      return;
    }

    setCompleting(true);
    try {
      await flushHeartbeat(activeItemId);
      await markLessonComplete(activeItemId, { completed: true, lastPosition: 0 });
    } catch (err) {
      // In case lesson completion has an assessment requirement gate, proceed with loadData & navigation
      console.warn("Notice: proceeding to next topic:", err);
    } finally {
      await loadData();
      if (nextItem) {
        navigateTo(nextItem);
      }
      setCompleting(false);
    }
  };

  // Handler to open quiz taker modal
  const handleTakeQuiz = (assessmentId: string) => {
    setActiveQuizModalId(assessmentId);
  };

  const handleQuizPassed = async () => {
    await loadData();
    if (nextItem) {
      navigateTo(nextItem);
    }
  };

  if (loading && !course) {
    return (
      <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <p className="text-xs font-semibold">Loading interactive classroom…</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-base font-bold text-slate-800">Course not found</p>
        <p className="text-xs text-slate-500">
          The requested course could not be loaded or you are not enrolled.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden">
      {/* 1. Focus Header */}
      <ClassroomHeader
        course={course}
        progress={progress}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* 2. Middle Row: Collapsible Curriculum Sidebar + Stage */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <ClassroomSidebar
          course={course}
          progress={progress}
          flatItems={flatItems}
          activeContent={activeContent}
          expandedModules={expandedModules}
          onToggleModule={toggleModule}
          onSelectItem={(item) => {
            if (activeQuizModalId) {
              setActiveQuizModalId(null);
            }
            navigateTo(item);
          }}
          isOpen={sidebarOpen}
        />

        {/* Stage Content Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 min-w-0 bg-slate-50/60 relative">
          {activeQuizModalId ? (
            <QuizTakerModal
              open={Boolean(activeQuizModalId)}
              onClose={() => setActiveQuizModalId(null)}
              courseId={course.id}
              courseTitle={course.title}
              assessmentId={activeQuizModalId}
              embedded
              onPassed={() => {
                void handleQuizPassed();
              }}
            />
          ) : (
            <ClassroomStage
              activeContent={activeContent}
              course={course}
              progress={progress}
              courseId={course.id}
              courseTitle={course.title}
              onTakeQuiz={handleTakeQuiz}
              onItemComplete={loadData}
              onNavigateNext={() => {
                if (nextItem) navigateTo(nextItem);
              }}
            />
          )}
        </main>
      </div>

      {/* 3. Sticky Navigation Footer */}
      <ClassroomFooter
        previousItem={previousItem}
        nextItem={nextItem}
        onNavigate={navigateTo}
        onCompleteAndNext={handleCompleteAndNext}
        currentItem={activeContent?.item}
        requiredSeconds={requiredSeconds}
        spentSeconds={spentSeconds}
        timeSatisfied={timeSatisfied}
        completing={completing}
      />
    </div>
  );
}

