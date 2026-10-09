'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Eye, Loader2 } from 'lucide-react';
import type { Course } from '@/types';
import type { ApiCourseProgress } from '@/lib/api/types';
import { fetchCourseDetail } from '@/lib/api/courses';
import { fetchCourseProgress, markLessonComplete } from '@/lib/api/progress';
import { courseFromDetail } from '@/lib/api/transform';
import { Button } from '@/components/ui/Button';
import { QuizTakerModal } from '@/components/features/quiz/QuizTakerModal';
import { ClassroomHeader } from './ClassroomHeader';
import { ClassroomSidebar } from './ClassroomSidebar';
import { ClassroomFooter } from './ClassroomFooter';
import { ClassroomStage } from './stage/ClassroomStage';
import { useClassroomNavigation } from './hooks/useClassroomNavigation';
import { useClassroomHeartbeat } from './hooks/useClassroomHeartbeat';
import { MOBILE_QUERY, useMediaQuery } from '@/lib/useMediaQuery';

interface ClassroomShellProps {
  courseId?: string;
  previewCourse?: Course;
  isPreview?: boolean;
  onExitPreview?: () => void;
}

export function ClassroomShell({ courseId, previewCourse, isPreview, onExitPreview }: ClassroomShellProps) {
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<ApiCourseProgress | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Phones: the curriculum is a drawer over the lesson, so start with it closed.
  const isMobile = useMediaQuery(MOBILE_QUERY);
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);
  const [activeQuizModalId, setActiveQuizModalId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // Fetch course and progress in parallel
  const loadData = useCallback(async () => {
    if (isPreview && previewCourse) {
      setCourse(previewCourse);
      const mockModules = (previewCourse.modules || []).map((m: any, mIdx: number) => ({
        moduleId: m.id,
        titleEn: m.title || `Module ${mIdx + 1}`,
        titleAm: m.titleAm || m.title || `Module ${mIdx + 1}`,
        order: m.order ?? mIdx + 1,
        unlocked: true,
        totalLessons: m.lessons?.length || 0,
        completedLessons: 0,
        moduleCompleted: false,
        progressPercent: 0,
        timeSpentSeconds: 0,
        requiredSeconds: 0,
        timeSatisfied: true,
        lessons: (m.lessons || []).map((l: any, lIdx: number) => ({
          lessonId: l.id,
          titleEn: l.title || `Lesson ${lIdx + 1}`,
          titleAm: l.titleAm || l.title || `Lesson ${lIdx + 1}`,
          order: l.order ?? lIdx + 1,
          completed: false,
          unlocked: true,
          timeSpentSeconds: 0,
          requiredSeconds: 0,
          timeSatisfied: true,
          subLessons: (l.subLessons || []).map((sl: any, slIdx: number) => ({
            lessonId: sl.id,
            titleEn: sl.title || `Sub-topic ${slIdx + 1}`,
            titleAm: sl.titleAm || sl.title || `Sub-topic ${slIdx + 1}`,
            order: sl.order ?? slIdx + 1,
            completed: false,
            unlocked: true,
            timeSpentSeconds: 0,
            requiredSeconds: 0,
            timeSatisfied: true,
          })),
        })),
      }));

      setProgress({
        courseId: previewCourse.id || 'preview',
        progressionMode: 'OPEN',
        stats: {
          totalModules: previewCourse.modules?.length || 0,
          totalLessons: previewCourse.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0,
          completedLessons: 0,
          overallPercent: 0,
        },
        modules: mockModules,
        courseCompletion: {
          contentCompleted: false,
          finalAssessmentRequired: false,
          finalAssessmentPassed: false,
          certificateEligible: false,
          finalAssessment: null,
        },
        liveSessions: (previewCourse.sessionPlans || []).map((sp: any, idx: number) => ({
          id: sp.id || `session-${idx}`,
          sessionId: sp.id || `session-${idx}`,
          titleEn: sp.title || `Session ${idx + 1}`,
          scheduledAt: sp.scheduledAt || null,
          durationMinutes: sp.durationMinutes || 60,
          platform: sp.platform || 'LIVEKIT',
          trainerName: sp.trainerName || 'Assigned Course Trainer',
          status: 'SCHEDULED',
          attended: false,
          planned: true,
        })),
      } as any);
      setLoading(false);
      return;
    }
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
  }, [courseId, isPreview, previewCourse]);

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
  const activeItemId = activeContent?.subLesson?.id ?? activeContent?.lesson?.id ?? null;

  // Calculate study time for current active target
  const currentTargetProgress = activeContent?.subLessonProgress ?? activeContent?.lessonProgress;
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

  const trackedSeconds =
    activeItemId && liveSeconds[activeItemId] !== undefined
      ? liveSeconds[activeItemId]
      : initialSeconds;
  // Shown time stops at the required time (older records may have counted past it).
  const spentSeconds = requiredSeconds > 0 ? Math.min(trackedSeconds, requiredSeconds) : trackedSeconds;

  const isOverview =
    activeContent?.item.type === 'COURSE_OVERVIEW' ||
    activeContent?.item.type === 'MODULE_OVERVIEW' ||
    activeContent?.item.type === 'CERTIFICATE';

  const timeSatisfied =
    isOverview ||
    currentTargetProgress?.timeSatisfied ||
    requiredSeconds <= 0 ||
    spentSeconds >= requiredSeconds;

  // Complete current lesson / sub-lesson and advance
  const handleCompleteAndNext = async () => {
    if (isPreview) {
      if (nextItem) navigateTo(nextItem);
      return;
    }
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
      console.warn('Notice: proceeding to next topic:', err);
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
      <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-xs font-semibold">Loading interactive classroom…</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-base font-bold text-slate-800 dark:text-white">Course not found</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested course could not be loaded or you are not enrolled.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {isPreview && (
        <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold shadow-md z-50 shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 shrink-0 text-white" />
            <span>Learner Preview Mode — Experience your course as an enrolled student. No grades or progress are recorded.</span>
          </div>
          {onExitPreview && (
            <Button
              size="sm"
              variant="outline"
              onClick={onExitPreview}
              className="h-7 text-xs bg-white text-amber-950 hover:bg-amber-100 font-bold border-0 shadow-xs gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to Editor
            </Button>
          )}
        </div>
      )}

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
            if (isMobile) setSidebarOpen(false);
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Stage Content Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 min-w-0 bg-slate-50/60 dark:bg-slate-950/60 relative">
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

      {/* 3. Sticky Navigation Footer (hidden during active assessment to keep focus and prevent blurred button) */}
      {!activeQuizModalId && (
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
      )}
    </div>
  );
}
