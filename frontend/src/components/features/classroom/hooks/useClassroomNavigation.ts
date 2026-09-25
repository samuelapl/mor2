import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Course, Lesson, Module } from '@/types';
import type {
  ApiAttachedAssessment,
  ApiCourseProgress,
  ApiProgressLesson,
  ApiProgressModule,
  ApiProgressSubLesson,
} from '@/lib/api/types';
import type { ClassroomActiveContent, ClassroomFlatItem, ClassroomSelection } from '../types';
import { stripHtmlTags } from '@/components/ui/RichContent';
import { getItemAttachments } from '@/components/features/courses/wizard-components';

interface UseClassroomNavigationProps {
  course: Course | null;
  progress: ApiCourseProgress | null;
}

export function useClassroomNavigation({ course, progress }: UseClassroomNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Collapsed/expanded modules map
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Build helper lookup maps for module and lesson progress
  const moduleProgressMap = useMemo(() => {
    const map = new Map<string, ApiProgressModule>();
    if (!progress) return map;
    for (const mod of progress.modules) {
      map.set(mod.moduleId, mod);
    }
    return map;
  }, [progress]);

  const lessonProgressMap = useMemo(() => {
    const map = new Map<string, ApiProgressLesson>();
    if (!progress) return map;
    for (const mod of progress.modules) {
      for (const l of mod.lessons) {
        map.set(l.lessonId, l);
      }
    }
    return map;
  }, [progress]);

  // Build the flattened sequence of all playable / viewable items in the curriculum
  const flatItems = useMemo<ClassroomFlatItem[]>(() => {
    if (!course) return [];
    const items: ClassroomFlatItem[] = [];

    // Course Overview & Objectives (if course has description, objectives, prerequisites, or attachments)
    const hasCourseOverview = Boolean(
      (course.description && stripHtmlTags(course.description).trim()) ||
      (course.objectives && stripHtmlTags(course.objectives).trim()) ||
      (course.prerequisites && stripHtmlTags(course.prerequisites).trim()) ||
      getItemAttachments(course).length > 0,
    );

    if (hasCourseOverview) {
      items.push({
        key: 'course-overview',
        type: 'COURSE_OVERVIEW',
        title: 'Course Overview & Objectives',
        moduleId: 'course',
        moduleIndex: -1,
        unlocked: true,
        completed: true,
      });
    }

    course.modules.forEach((mod, moduleIndex) => {
      const modProg = moduleProgressMap.get(mod.id);
      const modUnlocked = modProg?.unlocked ?? moduleIndex === 0;

      // Module Overview & Objectives (if module has description, objectives, or attachments)
      const hasModuleOverview = Boolean(
        (mod.description && stripHtmlTags(mod.description).trim()) ||
        (mod.objectives && stripHtmlTags(mod.objectives).trim()) ||
        getItemAttachments(mod).length > 0,
      );

      if (hasModuleOverview) {
        items.push({
          key: `module-overview-${mod.id}`,
          type: 'MODULE_OVERVIEW',
          title: `Module ${moduleIndex + 1} Overview & Objectives`,
          moduleId: mod.id,
          moduleIndex,
          unlocked: modUnlocked,
          completed: true,
        });
      }

      mod.lessons.forEach((lesson, lessonIndex) => {
        const lessonProg = lessonProgressMap.get(lesson.id);
        const lessonUnlocked =
          modUnlocked && (lessonProg?.unlocked ?? (moduleIndex === 0 && lessonIndex === 0));
        const lessonCompleted = lessonProg?.completed ?? false;

        // 1. Parent Lesson Item
        items.push({
          key: `lesson-${lesson.id}`,
          type: 'LESSON',
          title: lesson.title,
          moduleId: mod.id,
          moduleIndex,
          lessonId: lesson.id,
          lessonIndex,
          unlocked: lessonUnlocked,
          completed: lessonCompleted,
          durationMin: lesson.durationMin,
          contentType: lesson.contentType || 'DOCUMENT',
        });

        // 2. Sub-Lesson Items (if any)
        if (lesson.subLessons && lesson.subLessons.length > 0) {
          lesson.subLessons.forEach((sub, subIndex) => {
            const subProg = lessonProg?.subLessons?.find((s) => s.lessonId === sub.id);
            const subUnlocked = lessonUnlocked && (subProg?.unlocked ?? subIndex === 0);
            const subCompleted = subProg?.completed ?? false;

            items.push({
              key: `sub-${sub.id}`,
              type: 'SUB_LESSON',
              title: sub.title,
              moduleId: mod.id,
              moduleIndex,
              lessonId: lesson.id,
              lessonIndex,
              subLessonId: sub.id,
              subIndex,
              unlocked: subUnlocked,
              completed: subCompleted,
              durationMin: sub.durationMin,
              contentType: sub.contentType || 'DOCUMENT',
            });
          });
        }

        // 3. Lesson Checkpoint Quiz (if lesson has assessment)
        const lessonAssessment = lessonProg?.assessment;
        if (lessonAssessment) {
          const hasSubLessons = lesson.subLessons && lesson.subLessons.length > 0;
          const subLessonsAllDone = hasSubLessons
            ? (lessonProg?.subLessons?.every((s) => s.completed) ?? false)
            : true;
          const quizUnlocked = lessonUnlocked && subLessonsAllDone;
          const quizCompleted = lessonAssessment.passed;

          items.push({
            key: `quiz-${lessonAssessment.id}`,
            type: 'QUIZ',
            title: 'Lesson Assessment',
            moduleId: mod.id,
            moduleIndex,
            lessonId: lesson.id,
            lessonIndex,
            quizId: lessonAssessment.id,
            quizKind: 'LESSON_ASSESSMENT',
            unlocked: quizUnlocked,
            completed: quizCompleted,
            assessment: lessonAssessment,
          });
        }
      });

      // 4. Module Checkpoint Assessment (if module has assessment)
      const modAssessment = modProg?.assessment;
      if (modAssessment) {
        const totalLessons = modProg?.totalLessons ?? mod.lessons.length;
        const completedLessons = modProg?.completedLessons ?? 0;
        const allLessonsComplete = totalLessons > 0 && completedLessons === totalLessons;
        const quizUnlocked = modUnlocked && allLessonsComplete;
        const quizCompleted = modAssessment.passed;

        items.push({
          key: `quiz-${modAssessment.id}`,
          type: 'QUIZ',
          title: 'Module Assessment',
          moduleId: mod.id,
          moduleIndex,
          quizId: modAssessment.id,
          quizKind: 'MODULE_ASSESSMENT',
          unlocked: quizUnlocked,
          completed: quizCompleted,
          assessment: modAssessment,
        });
      }
    });

    // 5. Final Certification Assessment (if course has final assessment)
    const finalAssessment = progress?.courseCompletion.finalAssessment;
    if (finalAssessment) {
      const contentCompleted = progress?.courseCompletion.contentCompleted ?? false;
      const finalPassed = progress?.courseCompletion.finalAssessmentPassed ?? false;

      items.push({
        key: `quiz-${finalAssessment.id}`,
        type: 'QUIZ',
        title: 'Course Final Certification Assessment',
        moduleId: 'final',
        moduleIndex: 9999,
        quizId: finalAssessment.id,
        quizKind: 'FINAL_ASSESSMENT',
        unlocked: contentCompleted,
        completed: finalPassed,
        assessment: finalAssessment,
      });
    }

    // 6. Course Certificate of Completion (always placed below final assessment)
    const finalPassed = progress?.courseCompletion.finalAssessmentPassed ?? false;
    const contentCompleted = progress?.courseCompletion.contentCompleted ?? false;
    const isCompleted =
      progress?.courseCompletion.certificateEligible ??
      (contentCompleted && (!finalAssessment || finalPassed));

    items.push({
      key: 'course-certificate',
      type: 'CERTIFICATE',
      title: 'Certificate of Completion',
      moduleId: 'final',
      moduleIndex: 10000,
      unlocked: isCompleted,
      completed: isCompleted,
    });

    return items;
  }, [course, moduleProgressMap, lessonProgressMap, progress]);

  // Determine active item from URL or fallback to first unlocked incomplete item
  const selectedKey = useMemo(() => {
    if (flatItems.length === 0) return null;

    const quizParam = searchParams.get('quiz');
    const subParam = searchParams.get('sub');
    const lessonParam = searchParams.get('lesson');
    const viewParam = searchParams.get('view');
    const moduleParam = searchParams.get('module');

    if (viewParam === 'overview') {
      const found = flatItems.find((i) => i.type === 'COURSE_OVERVIEW');
      if (found) return found.key;
    }
    if (viewParam === 'module' && moduleParam) {
      const found = flatItems.find(
        (i) => i.moduleId === moduleParam && i.type === 'MODULE_OVERVIEW',
      );
      if (found) return found.key;
    }
    if (viewParam === 'certificate') {
      const found = flatItems.find((i) => i.type === 'CERTIFICATE');
      if (found) return found.key;
    }
    if (quizParam) {
      const found = flatItems.find((i) => i.quizId === quizParam);
      if (found) return found.key;
    }
    if (subParam) {
      const found = flatItems.find((i) => i.subLessonId === subParam);
      if (found) return found.key;
    }
    if (lessonParam) {
      // Find the lesson, or if it has sub-lessons and none specified, check for the lesson item itself
      const found = flatItems.find((i) => i.lessonId === lessonParam && i.type === 'LESSON');
      if (found) return found.key;
    }

    // If learner is starting fresh (0 completed lessons), start on course overview or first module overview
    const totalCompletedLessons = Array.from(lessonProgressMap.values()).filter(
      (l) => l.completed,
    ).length;
    if (totalCompletedLessons === 0) {
      const courseOverview = flatItems.find((i) => i.type === 'COURSE_OVERVIEW');
      if (courseOverview) return courseOverview.key;
      const firstModuleOverview = flatItems.find((i) => i.type === 'MODULE_OVERVIEW');
      if (firstModuleOverview) return firstModuleOverview.key;
    }

    // Fallback: first incomplete unlocked item (excluding overviews and certificate)
    const firstIncomplete = flatItems.find(
      (i) =>
        i.unlocked &&
        !i.completed &&
        i.type !== 'COURSE_OVERVIEW' &&
        i.type !== 'MODULE_OVERVIEW' &&
        i.type !== 'CERTIFICATE',
    );
    if (firstIncomplete) return firstIncomplete.key;

    // Fallback to first unlocked item
    const firstUnlocked = flatItems.find((i) => i.unlocked);
    return firstUnlocked?.key ?? flatItems[0]?.key ?? null;
  }, [flatItems, searchParams, lessonProgressMap]);

  // Active content object
  const activeContent = useMemo<ClassroomActiveContent | null>(() => {
    if (!course || !selectedKey) return null;
    const item = flatItems.find((i) => i.key === selectedKey);
    if (!item) return null;

    const isCourseLevel = item.type === 'COURSE_OVERVIEW' || item.type === 'CERTIFICATE';
    const mod = isCourseLevel
      ? undefined
      : course.modules.find((m) => m.id === item.moduleId) || course.modules[0];
    const modProg = mod ? moduleProgressMap.get(mod.id) : undefined;
    const lesson = item.lessonId ? mod?.lessons.find((l) => l.id === item.lessonId) : undefined;
    const lessonProg = lesson ? lessonProgressMap.get(lesson.id) : undefined;
    const subLesson = item.subLessonId
      ? lesson?.subLessons?.find((s) => s.id === item.subLessonId)
      : undefined;
    const subLessonProg = subLesson
      ? lessonProg?.subLessons?.find((s) => s.lessonId === subLesson.id)
      : undefined;

    return {
      item,
      course,
      module: mod,
      lesson,
      subLesson,
      moduleProgress: modProg,
      lessonProgress: lessonProg,
      subLessonProgress: subLessonProg,
      assessment: item.assessment,
    };
  }, [course, selectedKey, flatItems, moduleProgressMap, lessonProgressMap]);

  // Auto-expand module containing the active item
  useEffect(() => {
    if (
      activeContent?.item.moduleId &&
      activeContent.item.moduleId !== 'course' &&
      activeContent.item.moduleId !== 'final'
    ) {
      const modId = activeContent.item.moduleId;
      setExpandedModules((prev) => (prev[modId] ? prev : { ...prev, [modId]: true }));
    }
  }, [activeContent?.item.moduleId]);

  // Navigate to a specific flat item
  const navigateTo = useCallback(
    (item: ClassroomFlatItem) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('lesson');
      params.delete('sub');
      params.delete('quiz');
      params.delete('view');
      params.delete('module');

      if (item.type === 'COURSE_OVERVIEW') {
        params.set('view', 'overview');
      } else if (item.type === 'MODULE_OVERVIEW') {
        params.set('view', 'module');
        params.set('module', item.moduleId);
      } else if (item.type === 'CERTIFICATE') {
        params.set('view', 'certificate');
      } else if (item.type === 'QUIZ' && item.quizId) {
        params.set('quiz', item.quizId);
      } else if (item.type === 'SUB_LESSON' && item.subLessonId) {
        if (item.lessonId) params.set('lesson', item.lessonId);
        params.set('sub', item.subLessonId);
      } else if (item.lessonId) {
        params.set('lesson', item.lessonId);
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // Previous and Next items
  const currentIndex = useMemo(() => {
    if (!selectedKey) return -1;
    return flatItems.findIndex((i) => i.key === selectedKey);
  }, [flatItems, selectedKey]);

  const previousItem = useMemo(() => {
    if (currentIndex <= 0) return null;
    return flatItems[currentIndex - 1] ?? null;
  }, [flatItems, currentIndex]);

  const nextItem = useMemo(() => {
    if (currentIndex < 0 || currentIndex >= flatItems.length - 1) return null;
    return flatItems[currentIndex + 1] ?? null;
  }, [flatItems, currentIndex]);

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  }, []);

  return {
    flatItems,
    activeContent,
    currentIndex,
    previousItem,
    nextItem,
    navigateTo,
    expandedModules,
    toggleModule,
    moduleProgressMap,
    lessonProgressMap,
  };
}
