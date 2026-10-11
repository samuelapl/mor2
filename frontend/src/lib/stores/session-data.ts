'use client';

import { ApiError } from '@/lib/api/client';
import { fetchCourseDetail, fetchCourses } from '@/lib/api/courses';
import { fetchCourseEnrollments, fetchMyEnrollments } from '@/lib/api/enrollments';
import { courseFromDetail, userFromApi } from '@/lib/api/transform';
import { fetchUsers } from '@/lib/api/users';
import type { User } from '@/types';

import { useAuthStore } from './auth-store';
import { useCourseStore } from './course-store';
import { useEnrollmentStore } from './enrollment-store';
import { fullName } from './store-utils';
import { useUserStore } from './user-store';

/**
 * Loads courses, enrollments, users and names for `user` (defaults to the signed-in user).
 * What gets loaded depends on the role; it fills the course, enrollment and user stores.
 */
export async function reloadAll(user?: User | null): Promise<void> {
  const current = user ?? useAuthStore.getState().currentUser;
  try {
    const list = await fetchCourses({ limit: 100 });
    const details = await Promise.all(list.data.map((course) => fetchCourseDetail(course.id)));

    const names: Record<string, string> = {};
    const mapped = details.map((detail) => {
      for (const owner of detail.owners ?? []) {
        if (owner.user) names[owner.userId] = fullName(owner.user);
      }
      for (const trainer of detail.trainers ?? []) {
        if (trainer.user) names[trainer.userId] = fullName(trainer.user);
      }
      return courseFromDetail(detail);
    });

    let next = mapped;
    if (current?.role === 'learner') {
      try {
        const mine = await fetchMyEnrollments();
        useEnrollmentStore.setState({ myEnrollments: mine.data });
        const enrolledCourseIds = new Set(
          mine.data
            .filter((enrollment) => enrollment.status === 'ACTIVE' || enrollment.status === 'COMPLETED')
            .map((enrollment) => enrollment.courseId),
        );
        next = next.map((course) => ({
          ...course,
          enrolledLearnerIds: enrolledCourseIds.has(course.id) ? [current.id] : [],
        }));
      } catch {
        // learner cannot list course enrollments → keep empty
      }
    } else if (
      current?.role === 'course_owner' ||
      current?.role === 'training_admin' ||
      current?.role === 'system_admin' ||
      current?.role === 'trainer'
    ) {
      const withEnrollments = await Promise.all(
        next.map(async (course) => {
          try {
            const res = await fetchCourseEnrollments(course.id);
            for (const enrollment of res.data) {
              if (enrollment.user) {
                names[enrollment.userId] = fullName(enrollment.user);
              }
            }
            return {
              ...course,
              enrolledLearnerIds: res.data.filter((enrollment) => enrollment.status === 'ACTIVE').map((enrollment) => enrollment.userId),
            };
          } catch {
            return course;
          }
        }),
      );
      next = withEnrollments;
    }

    if (current?.role === 'system_admin' || current?.role === 'training_admin') {
      try {
        const res = await fetchUsers({ limit: 100 });
        const mappedUsers = res.data.map(userFromApi);
        for (const user of mappedUsers) names[user.id] = user.name;
        useUserStore.setState({ users: mappedUsers });
      } catch {
        // not permitted → keep the user list empty
      }
    }

    if (current) names[current.id] = current.name;
    useUserStore.setState({ userNames: names });
    useCourseStore.setState({ courses: next });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      // the client already attempted a token refresh; keep the last state
    }
  }
}

/** Seeds the signed-in user's own name before the first full load. */
export function seedUserName(user: User): void {
  useUserStore.setState({ userNames: { [user.id]: user.name } });
}

/** Drops all user-scoped data (on sign-out / expired session). */
export function resetAll(): void {
  useUserStore.getState().reset();
  useCourseStore.getState().reset();
  useEnrollmentStore.getState().reset();
}

/** Marks a course as enrolled for `learnerId` locally, before the full reload finishes. */
export function markCourseEnrolled(courseId: string, learnerId: string): void {
  useCourseStore.getState().markEnrolled(courseId, learnerId);
}
