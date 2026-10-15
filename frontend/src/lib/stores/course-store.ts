'use client';

import { useCallback } from 'react';
import { create } from 'zustand';

import {
  fetchCourseDetail,
  createCourse as apiCreateCourse,
  publishCourse as apiPublishCourse,
  returnCourseToDraft as apiReturnCourseToDraft,
  unpublishCourse as apiUnpublishCourse,
  requestApproval,
  reviewCourse,
  updateCourse as apiUpdateCourse,
  assignTrainer as apiAssignTrainer,
  unassignTrainer,
  deleteCourse as apiDeleteCourse,
  archiveCourse as apiArchiveCourse,
} from '@/lib/api/courses';
import { uploadAttachment, uploadCover } from '@/lib/api/files';
import { replaceSessionPlans } from '@/lib/api/session-plans';
import { courseFromDetail, courseToCreateBody, courseToUpdateBody } from '@/lib/api/transform';
import type { ApiModule } from '@/lib/api/types';
import type { ActionResult, Attachment, Course, CourseDeliveryMode, CourseLevel, Quiz } from '@/types';

import { useAuthStore } from './auth-store';
import { syncCurriculumAndAssessments, type SessionPlanInput, type WizardModuleInput } from './course-sync';
import { reloadAll } from './session-data';
import { errorMessage, hasPermission } from './store-utils';

export type CreateCourseInput = {
  code: string;
  title: string;
  category: string;
  department?: string;
  targetAudience?: string;
  deliveryMethod?: string;
  deliveryMode?: CourseDeliveryMode;
  language?: string;
  prerequisites?: string;
  objectives?: string;
  description: string;
  level?: CourseLevel;
  cover?: File | null;
  modules?: WizardModuleInput[];
  attachments?: Attachment[];
  quiz?: Quiz;
  hasOnlineSessions?: boolean;
  /** Omit to leave planned sessions untouched; [] removes them. */
  sessionPlans?: SessionPlanInput[];
};

export type UpdateCourseFullInput = {
  title: string;
  category: string;
  department?: string;
  targetAudience?: string;
  deliveryMethod?: string;
  deliveryMode?: CourseDeliveryMode;
  language?: string;
  prerequisites?: string;
  objectives?: string;
  description: string;
  level?: CourseLevel;
  cover?: File | null;
  modules?: WizardModuleInput[];
  attachments?: Attachment[];
  quiz?: Quiz;
  hasOnlineSessions?: boolean;
  /** Omit to leave planned sessions untouched; [] removes them. */
  sessionPlans?: SessionPlanInput[];
};

interface CourseState {
  courses: Course[];
}

interface CourseActions {
  /** Looks up a course without subscribing — select `courses` to re-render on changes. */
  courseById: (courseId: string) => Course | undefined;
  /** Re-fetches one course (e.g. after its sessions changed) and replaces it in the store. */
  refreshCourse: (courseId: string) => Promise<void>;
  createCourse: (input: CreateCourseInput) => Promise<ActionResult & { courseId?: string; savedModules?: ApiModule[] }>;
  updateCourse: (courseId: string, input: { title: string; category: string; description: string }) => Promise<ActionResult>;
  updateCourseFull: (courseId: string, input: UpdateCourseFullInput) => Promise<ActionResult & { savedModules?: ApiModule[] }>;
  saveCourseCover: (courseId: string, file: File) => Promise<ActionResult>;
  assignTrainerToCourse: (courseId: string, trainerId: string) => Promise<ActionResult>;
  unassignTrainerFromCourse: (courseId: string, trainerId: string) => Promise<ActionResult>;
  submitForApproval: (courseId: string) => Promise<ActionResult>;
  approveCourse: (courseId: string) => Promise<ActionResult>;
  rejectCourse: (courseId: string, reason: string) => Promise<ActionResult>;
  requestChangesCourse: (courseId: string, reason: string) => Promise<ActionResult>;
  /** Approver withdraws an approval: approved (unpublished) course → draft. */
  returnCourseToDraft: (courseId: string, reason: string) => Promise<ActionResult>;
  publishCourse: (courseId: string) => Promise<ActionResult>;
  unpublishCourse: (courseId: string) => Promise<ActionResult>;
  archiveCourse: (courseId: string) => Promise<ActionResult>;
  deleteCourse: (courseId: string) => Promise<ActionResult & { affectedLearners?: number }>;
  /** Marks a course as enrolled for `learnerId` locally, before the full reload finishes. */
  markEnrolled: (courseId: string, learnerId: string) => void;
  /** Drops the user-scoped data on sign-out. */
  reset: () => void;
}

export type CourseStore = CourseState & CourseActions;

export const useCourseStore = create<CourseStore>()((set, get) => ({
  courses: [],

  courseById: (courseId) =>
    get().courses.find(
      (course) =>
        course.id === courseId ||
        course.code?.toLowerCase() === courseId?.toLowerCase(),
    ),

  refreshCourse: async (courseId) => {
    try {
      const fresh = courseFromDetail(await fetchCourseDetail(courseId));
      set((state) => {
        const index = state.courses.findIndex(
          (c) =>
            c.id === fresh.id ||
            c.id === courseId ||
            c.code?.toLowerCase() === courseId?.toLowerCase(),
        );
        if (index === -1) {
          return { courses: [...state.courses, fresh] };
        }
        const updated = [...state.courses];
        updated[index] = {
          ...fresh,
          enrolledLearnerIds: updated[index]!.enrolledLearnerIds,
        };
        return { courses: updated };
      });
    } catch {
      // Best effort: the next full reload picks it up.
    }
  },

  createCourse: async (input) => {
    const owner = useAuthStore.getState().currentUser;
    if (!owner || !hasPermission(owner, 'course.create')) {
      return { ok: false, message: 'You are not allowed to create courses.' };
    }
    let created;
    try {
      created = await apiCreateCourse(
        courseToCreateBody({
          code: input.code,
          title: input.title,
          category: input.category,
          department: input.department,
          targetAudience: input.targetAudience,
          deliveryMethod: input.deliveryMethod,
          deliveryMode: input.deliveryMode,
          hasOnlineSessions: input.hasOnlineSessions,
          language: input.language,
          prerequisites: input.prerequisites,
          objectives: input.objectives,
          description: input.description,
          ownerId: owner.id,
          level: input.level,
        }),
      );

      // Cover image → upload to MinIO; uploadCover persists thumbnailUrl
      // on the course server-side, no follow-up PATCH needed.
      if (input.cover && created.id) {
        try {
          await uploadCover(created.id, input.cover);
        } catch {
          // cover upload is non-fatal
        }
      }

      // Curriculum: create a module per entered module (falls back to a
      // default "Module 1" when the owner left the curriculum empty).
      const modulesToCreate: WizardModuleInput[] =
        input.modules && input.modules.length > 0
          ? input.modules
          : [
              {
                title: 'Module 1: Introduction',
                description: 'Course module',
                objectives: 'Introduction to course concepts',
                durationMinutes: 35,
                lessons: [
                  {
                    title: 'Welcome and course overview',
                    content: '',
                    durationMin: 15,
                    subLessons: [],
                  },
                  {
                    title: 'Key concepts and definitions',
                    content: '',
                    durationMin: 20,
                    subLessons: [],
                  },
                ],
              },
            ];

      const { savedModules } = await syncCurriculumAndAssessments(created.id, modulesToCreate, input.quiz);
      if (input.sessionPlans) await replaceSessionPlans(created.id, { plans: input.sessionPlans });

      // Course-level materials.
      for (const attachment of input.attachments ?? []) {
        if (!attachment.file) continue;
        try {
          await uploadAttachment(attachment.file, { courseId: created.id });
        } catch {
          // best-effort; attachment upload failures don't abort creation
        }
      }

      await reloadAll(owner);
      return { ok: true, courseId: created.id, savedModules };
    } catch (err) {
      return {
        ok: false,
        courseId: created?.id,
        message: errorMessage(err, 'Failed to create course.'),
      };
    }
  },

  saveCourseCover: async (courseId, file) => {
    try {
      await uploadCover(courseId, file);
      await reloadAll(useAuthStore.getState().currentUser);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to upload cover.'),
      };
    }
  },

  assignTrainerToCourse: async (courseId, trainerId) => {
    try {
      await apiAssignTrainer(courseId, trainerId);
      await reloadAll(useAuthStore.getState().currentUser);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to assign trainer.'),
      };
    }
  },

  unassignTrainerFromCourse: async (courseId, trainerId) => {
    try {
      await unassignTrainer(courseId, trainerId);
      await reloadAll(useAuthStore.getState().currentUser);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to remove trainer.'),
      };
    }
  },

  updateCourse: async (courseId, input) => {
    const owner = useAuthStore.getState().currentUser;
    const course = get().courses.find((item) => item.id === courseId);
    if (!course) return { ok: false, message: 'Course not found.' };
    if (
      !owner ||
      !(hasPermission(owner, 'course.update.own') || hasPermission(owner, 'course.update.all') || hasPermission(owner, 'course.create'))
    ) {
      return { ok: false, message: 'You are not allowed to edit this course.' };
    }
    if (course.status !== 'draft' && course.status !== 'rejected') {
      return {
        ok: false,
        message: 'Only draft or rejected courses can be edited.',
      };
    }
    try {
      await apiUpdateCourse(
        courseId,
        courseToUpdateBody({
          title: input.title,
          description: input.description,
        }),
      );
      await reloadAll(owner);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to update course.'),
      };
    }
  },

  updateCourseFull: async (courseId, input) => {
    const owner = useAuthStore.getState().currentUser;
    const course = get().courses.find((item) => item.id === courseId);
    if (!course) return { ok: false, message: 'Course not found.' };
    if (
      !owner ||
      !(hasPermission(owner, 'course.update.own') || hasPermission(owner, 'course.update.all') || hasPermission(owner, 'course.create'))
    ) {
      return { ok: false, message: 'You are not allowed to edit this course.' };
    }
    if (course.status !== 'draft' && course.status !== 'rejected') {
      return {
        ok: false,
        message: 'Only draft or rejected courses can be edited.',
      };
    }
    try {
      await apiUpdateCourse(
        courseId,
        courseToUpdateBody({
          title: input.title,
          category: input.category,
          department: input.department,
          targetAudience: input.targetAudience,
          deliveryMethod: input.deliveryMethod,
          deliveryMode: input.deliveryMode,
          hasOnlineSessions: input.hasOnlineSessions,
          language: input.language,
          prerequisites: input.prerequisites,
          objectives: input.objectives,
          description: input.description,
          level: input.level,
        }),
      );

      if (input.cover) {
        try {
          // uploadCover persists thumbnailUrl on the course server-side;
          // no follow-up PATCH needed.
          await uploadCover(courseId, input.cover);
        } catch {
          // cover upload is non-fatal
        }
      }

      const modulesToReplace: WizardModuleInput[] =
        input.modules && input.modules.length > 0
          ? input.modules
          : [
              {
                title: 'Module 1: Introduction',
                description: 'Course module',
                objectives: 'Introduction to course concepts',
                durationMinutes: 35,
                lessons: [
                  {
                    title: 'Welcome and course overview',
                    content: '',
                    durationMin: 15,
                    subLessons: [],
                  },
                  {
                    title: 'Key concepts and definitions',
                    content: '',
                    durationMin: 20,
                    subLessons: [],
                  },
                ],
              },
            ];

      const { savedModules } = await syncCurriculumAndAssessments(courseId, modulesToReplace, input.quiz);
      // After the curriculum: the server checks the combined weights stay within 100%.
      if (input.sessionPlans) await replaceSessionPlans(courseId, { plans: input.sessionPlans });

      // Newly attached course materials (existing rows are left untouched).
      for (const attachment of input.attachments ?? []) {
        if (!attachment.file) continue;
        try {
          await uploadAttachment(attachment.file, { courseId });
        } catch {
          // best-effort
        }
      }

      await reloadAll(owner);
      return { ok: true, savedModules };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to update course.'),
      };
    }
  },

  submitForApproval: async (courseId: string): Promise<ActionResult> => {
    const owner = useAuthStore.getState().currentUser;
    try {
      await requestApproval(courseId);
      await reloadAll(owner);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to submit course.'),
      };
    }
  },

  approveCourse: async (courseId: string): Promise<ActionResult> => {
    const approver = useAuthStore.getState().currentUser;
    try {
      await reviewCourse(courseId, { status: 'APPROVED' });
      await reloadAll(approver);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to approve course.'),
      };
    }
  },

  rejectCourse: async (courseId: string, reason: string): Promise<ActionResult> => {
    const approver = useAuthStore.getState().currentUser;
    const trimmed = reason.trim();
    if (!trimmed) {
      return { ok: false, message: 'A rejection reason is required.' };
    }
    try {
      await reviewCourse(courseId, { status: 'REJECTED', comments: trimmed });
      await reloadAll(approver);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to reject course.'),
      };
    }
  },

  requestChangesCourse: async (courseId: string, reason: string): Promise<ActionResult> => {
    const approver = useAuthStore.getState().currentUser;
    const trimmed = reason.trim();
    if (!trimmed) {
      return { ok: false, message: 'A reason is required when requesting changes.' };
    }
    try {
      await reviewCourse(courseId, { status: 'NEEDS_REVISION', comments: trimmed });
      await reloadAll(approver);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to request changes on course.'),
      };
    }
  },

  returnCourseToDraft: async (courseId: string, reason: string): Promise<ActionResult> => {
    const approver = useAuthStore.getState().currentUser;
    const trimmed = reason.trim();
    if (!trimmed) {
      return { ok: false, message: 'A reason is required when returning a course to draft.' };
    }
    try {
      await apiReturnCourseToDraft(courseId, trimmed);
      await reloadAll(approver);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to return course to draft.'),
      };
    }
  },

  publishCourse: async (courseId: string): Promise<ActionResult> => {
    const admin = useAuthStore.getState().currentUser;
    try {
      await apiPublishCourse(courseId);
      await reloadAll(admin);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to publish course.'),
      };
    }
  },

  unpublishCourse: async (courseId: string): Promise<ActionResult> => {
    const admin = useAuthStore.getState().currentUser;
    try {
      await apiUnpublishCourse(courseId);
      await reloadAll(admin);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to unpublish course.'),
      };
    }
  },

  archiveCourse: async (courseId: string): Promise<ActionResult> => {
    const actor = useAuthStore.getState().currentUser;
    try {
      await apiArchiveCourse(courseId);
      await reloadAll(actor);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to archive course.'),
      };
    }
  },

  deleteCourse: async (courseId: string): Promise<ActionResult & { affectedLearners?: number }> => {
    const owner = useAuthStore.getState().currentUser;
    try {
      const res = await apiDeleteCourse(courseId);
      await reloadAll(owner);
      return { ok: true, affectedLearners: res?.affectedLearners };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to delete course.'),
      };
    }
  },

  markEnrolled: (courseId, learnerId) =>
    set((state) => ({
      courses: state.courses.map((course) =>
        course.id === courseId && !course.enrolledLearnerIds.includes(learnerId)
          ? { ...course, enrolledLearnerIds: [...course.enrolledLearnerIds, learnerId] }
          : course,
      ),
    })),

  reset: () => set({ courses: [] }),
}));

/** Memoized `courseById` that re-renders the caller when `courses` changes. */
export function useCourseById(): (courseId: string) => Course | undefined {
  const courses = useCourseStore((s) => s.courses);
  return useCallback(
    (courseId: string) =>
      courses.find(
        (course) =>
          course.id === courseId ||
          course.code?.toLowerCase() === courseId?.toLowerCase(),
      ),
    [courses],
  );
}
