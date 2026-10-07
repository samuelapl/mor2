'use client';

import { useEffect, useState } from 'react';
import { useLms } from '@/lib/lms-store';
import { usePermissions } from '@/lib/usePermissions';
import { fetchTrainers } from '@/lib/api/users';
import { userFromApi } from '@/lib/api/transform';
import { toast } from '@/lib/toast';
import type { ActionResult, Course, User } from '@/types';
import type { CourseActionKey } from '../types';

function notify(result: ActionResult, successMessage: string): boolean {
  if (result.ok) toast.success(successMessage);
  else toast.error(result.message);
  return result.ok;
}

/**
 * Every workflow action on a course (submit → approve/reject → publish/unpublish, plus
 * archive/delete and trainer assignment), gated by permission AND course status.
 * Moved from the former CourseDetailModal without behaviour changes.
 */
export function useCourseActions(course: Course | undefined, opts: { onDeleted?: () => void } = {}) {
  const {
    assignTrainerToCourse,
    unassignTrainerFromCourse,
    submitForApproval,
    approveCourse,
    rejectCourse,
    returnCourseToDraft,
    publishCourse,
    unpublishCourse,
    archiveCourse,
    deleteCourse,
  } = useLms();
  const { can: hasPermission, hasRole } = usePermissions();

  const [busy, setBusy] = useState(false);
  const [trainerOptions, setTrainerOptions] = useState<User[]>([]);

  const status = course?.status;
  const editable = status === 'draft' || status === 'rejected';
  const isPrivilegedAdmin = hasRole('training_admin') || hasRole('system_admin');
  /** A trainer is only required when the course has planned online sessions (self-paced courses publish without one). */
  const requiresTrainer = (course?.sessionPlans?.length ?? 0) > 0;

  const can: Record<CourseActionKey, boolean> = {
    edit: Boolean(course) && (hasPermission('course.update.own') || hasPermission('course.update.all')) && editable,
    submit: Boolean(course) && hasPermission('course.submit_approval') && editable,
    approve: hasPermission('course.approve_reject') && status === 'under_review',
    reject: hasPermission('course.approve_reject') && status === 'under_review',
    publish: hasPermission('course.publish') && status === 'approved' && !course?.published,
    unpublish: hasPermission('course.unpublish') && Boolean(course?.published),
    archive:
      Boolean(course) &&
      hasPermission('course.archive') &&
      status !== 'archived' &&
      status !== 'under_review' &&
      (isPrivilegedAdmin || status === 'draft'),
    delete: Boolean(course) && hasPermission('course.delete') && status !== 'published' && (isPrivilegedAdmin || status === 'draft'),
    assignTrainer: hasPermission('course.assign_trainer'),
    // Only before publication: a published course must be unpublished first.
    returnToDraft: hasPermission('course.approve_reject') && status === 'approved' && !course?.published,
  };

  const needsTrainerOptions = requiresTrainer && (can.assignTrainer || can.publish);
  useEffect(() => {
    if (!needsTrainerOptions) {
      setTrainerOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchTrainers();
        if (!cancelled) setTrainerOptions(res.data.map(userFromApi).filter((u) => u.status === 'active'));
      } catch {
        // trainer picker is best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsTrainerOptions]);

  /** Wraps an action so the busy flag is always reset, even if the store throws. */
  const withBusy = async <T>(fn: () => Promise<T>): Promise<T> => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  };

  const id = course?.id ?? '';

  return {
    can,
    busy,
    trainerOptions,
    hasTrainer: Boolean(course?.trainerId),
    requiresTrainer,

    submit: () => withBusy(async () => notify(await submitForApproval(id), 'Course submitted for approval.')),

    approve: () => withBusy(async () => notify(await approveCourse(id), 'Course approved.')),

    /** Returns null on success, or the error to show next to the reason field. */
    reject: (reason: string) =>
      withBusy(async (): Promise<string | null> => {
        const trimmed = reason.trim();
        if (!trimmed) return 'A reason is required.';
        const result = await rejectCourse(id, trimmed);
        if (!result.ok) return result.message;
        toast.success('Course rejected and moved back to draft. The owner has been notified.');
        return null;
      }),

    /** Returns null on success, or the error to show next to the reason field. */
    returnToDraft: (reason: string) =>
      withBusy(async (): Promise<string | null> => {
        const trimmed = reason.trim();
        if (!trimmed) return 'A reason is required.';
        const result = await returnCourseToDraft(id, trimmed);
        if (!result.ok) return result.message;
        toast.success('Approval withdrawn and course moved back to draft. The owner has been notified.');
        return null;
      }),

    publish: () => withBusy(async () => notify(await publishCourse(id), 'Course published. Learners can now enroll.')),

    assignAndPublish: (trainerId: string) =>
      withBusy(async () => {
        const assigned = await assignTrainerToCourse(id, trainerId);
        if (!assigned.ok) return notify(assigned, '');
        return notify(await publishCourse(id), 'Trainer assigned and course published.');
      }),

    unpublish: () => withBusy(async () => notify(await unpublishCourse(id), 'Course unpublished. It no longer appears in the learner catalog.')),

    archive: () => withBusy(async () => notify(await archiveCourse(id), 'Course archived.')),

    remove: () =>
      withBusy(async () => {
        const res = await deleteCourse(id);
        const count = res?.affectedLearners ?? 0;
        const msg =
          count > 0
            ? `Course deleted. Enrollment status for ${count} learner(s) was deleted automatically.`
            : 'Course deleted successfully.';
        const ok = notify(res, msg);
        if (ok) opts.onDeleted?.();
        return ok;
      }),

    assignTrainer: (trainerId: string) => withBusy(async () => notify(await assignTrainerToCourse(id, trainerId), 'Trainer assigned.')),

    removeTrainer: (trainerId: string) => withBusy(async () => notify(await unassignTrainerFromCourse(id, trainerId), 'Trainer removed.')),
  };
}

export type CourseActions = ReturnType<typeof useCourseActions>;
