'use client';

import { useCallback } from 'react';
import { create } from 'zustand';

import { bulkEnroll, selfEnroll } from '@/lib/api/enrollments';
import type { ApiEnrollment } from '@/lib/api/types';
import type { ActionResult, CourseDeliveryMode } from '@/types';

import { useAuthStore } from './auth-store';
import { markCourseEnrolled, reloadAll } from './session-data';
import { errorMessage, hasPermission } from './store-utils';

export interface EnrollSelfOptions {
  deliveryMode?: CourseDeliveryMode;
  venueId?: string;
  sessionId?: string;
}

interface EnrollmentState {
  /** The signed-in learner's own enrollments (empty for other roles). */
  myEnrollments: ApiEnrollment[];
}

interface EnrollmentActions {
  /** Looks up an enrollment without subscribing — select `myEnrollments` to re-render on changes. */
  getEnrollmentForCourse: (courseId: string) => ApiEnrollment | undefined;
  enrollLearners: (courseId: string, learnerIds: string[]) => Promise<ActionResult>;
  enrollSelf: (courseId: string, options?: EnrollSelfOptions) => Promise<ActionResult>;
  /** Drops the user-scoped data on sign-out. */
  reset: () => void;
}

export type EnrollmentStore = EnrollmentState & EnrollmentActions;

export const useEnrollmentStore = create<EnrollmentStore>()((set, get) => ({
  myEnrollments: [],

  getEnrollmentForCourse: (courseId) => get().myEnrollments.find((e) => e.courseId === courseId),

  enrollLearners: async (courseId, learnerIds) => {
    const admin = useAuthStore.getState().currentUser;
    if (!admin || !hasPermission(admin, 'student.manage')) {
      return {
        ok: false,
        message: 'Only training administrators can enroll learners.',
      };
    }
    try {
      await bulkEnroll(courseId, learnerIds);
      await reloadAll(admin);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to enroll learners.'),
      };
    }
  },

  enrollSelf: async (courseId, options) => {
    const learner = useAuthStore.getState().currentUser;
    if (!learner || !hasPermission(learner, 'enrollment.self')) {
      return { ok: false, message: 'Only learners can self-enroll.' };
    }
    try {
      const enr = await selfEnroll({
        courseId,
        deliveryMode: options?.deliveryMode,
        venueId: options?.venueId,
        sessionId: options?.sessionId,
      });
      set((state) => ({ myEnrollments: [...state.myEnrollments.filter((e) => e.courseId !== courseId), enr] }));
    } catch (err) {
      const message = errorMessage(err, 'Enrollment failed. The course may no longer be available.');
      // The backend may say "already enrolled" even though our local
      // enrollment list is stale/out of sync — that's still the outcome
      // the learner wants, so settle into the enrolled state instead of
      // surfacing it as a failure.
      if (!/already enrolled/i.test(message)) {
        return { ok: false, message };
      }
    }
    // Reflect the enrolled state immediately rather than waiting on a
    // full reload round trip to update the button.
    markCourseEnrolled(courseId, learner.id);
    await reloadAll(learner);
    return { ok: true };
  },

  reset: () => set({ myEnrollments: [] }),
}));

/** Memoized `getEnrollmentForCourse` that re-renders the caller when `myEnrollments` changes. */
export function useEnrollmentForCourse(): (courseId: string) => ApiEnrollment | undefined {
  const myEnrollments = useEnrollmentStore((s) => s.myEnrollments);
  return useCallback((courseId: string) => myEnrollments.find((e) => e.courseId === courseId), [myEnrollments]);
}
