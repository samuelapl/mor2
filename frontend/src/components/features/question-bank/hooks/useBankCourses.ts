import { useEffect, useMemo, useState } from 'react';
import { useLms } from '@/lib/lms-store';
import type { CourseFilterMode } from '../types';

export type QuestionBankRole = 'trainer' | 'course_owner';

/** Which course the bank is showing: all vs. "my" courses, search, and the selected course. */
export function useBankCourses(role: QuestionBankRole) {
  const { courses, currentUser } = useLms();

  // All actors with question bank access can access all institutional courses by default
  const [courseFilterMode, setCourseFilterMode] = useState<CourseFilterMode>('ALL');

  const myCourses = useMemo(() => {
    if (role === 'course_owner') {
      return courses.filter(
        (c) =>
          c.ownerId === currentUser?.id ||
          ((c as any).ownerIds && (c as any).ownerIds.includes(currentUser?.id)) ||
          ((c as any).owners &&
            (c as any).owners.some(
              (o: any) => o.userId === currentUser?.id || o.user?.id === currentUser?.id,
            )),
      );
    }
    // Trainer role: assigned courses
    return courses.filter(
      (c) =>
        c.trainerId === currentUser?.id ||
        ((c as any).trainerIds && (c as any).trainerIds.includes(currentUser?.id)) ||
        ((c as any).trainers &&
          (c as any).trainers.some(
            (t: any) => t.userId === currentUser?.id || t.user?.id === currentUser?.id,
          )),
    );
  }, [courses, currentUser, role]);

  const relevantCourses = useMemo(() => {
    if (courseFilterMode === 'MY' && myCourses.length > 0) {
      return myCourses;
    }
    // "ALL" mode: returns all courses without restriction
    return courses;
  }, [courses, myCourses, courseFilterMode]);

  const [courseSearch, setCourseSearch] = useState('');

  const filteredRelevantCourses = useMemo(() => {
    if (!courseSearch.trim()) return relevantCourses;
    const term = courseSearch.toLowerCase();
    return relevantCourses.filter(
      (c) =>
        (c.code || '').toLowerCase().includes(term) ||
        (c.title || '').toLowerCase().includes(term) ||
        (c.titleEn || '').toLowerCase().includes(term) ||
        (c.titleAm || '').toLowerCase().includes(term),
    );
  }, [relevantCourses, courseSearch]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  useEffect(() => {
    if (filteredRelevantCourses.length > 0) {
      if (!selectedCourseId || !filteredRelevantCourses.some((c) => c.id === selectedCourseId)) {
        setSelectedCourseId(filteredRelevantCourses[0].id);
      }
    }
  }, [filteredRelevantCourses, selectedCourseId]);

  const currentCourse = useMemo(
    () => relevantCourses.find((c) => c.id === selectedCourseId) ?? relevantCourses[0],
    [relevantCourses, selectedCourseId],
  );

  return {
    courses,
    myCourses,
    courseFilterMode,
    setCourseFilterMode,
    courseSearch,
    setCourseSearch,
    filteredRelevantCourses,
    selectedCourseId,
    setSelectedCourseId,
    currentCourse,
  };
}
