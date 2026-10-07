import { api } from './client';
import type {
  ApiCourseDetail,
  ApiCourseListItem,
  ApiModule,
  ApiPaginated,
  CreateCourseBody,
  CreateModuleBody,
  ReplaceCurriculumBody,
  ReviewCourseBody,
  UpdateCourseBody,
} from './types';

/* -------------------------------------------------------------------------- */
/*  Courses                                                                     */
/* -------------------------------------------------------------------------- */

export async function fetchCourses(
  params: { page?: number; limit?: number; search?: string; status?: string } = {},
): Promise<ApiPaginated<ApiCourseListItem>> {
  return api<ApiPaginated<ApiCourseListItem>>('courses', {
    query: params as Record<string, string | number | undefined>,
  });
}

export async function fetchCourseDetail(id: string): Promise<ApiCourseDetail> {
  return api<ApiCourseDetail>(`courses/${id}`);
}

export async function createCourse(body: CreateCourseBody): Promise<ApiCourseListItem> {
  return api<ApiCourseListItem>('courses', { method: 'POST', body });
}

export async function updateCourse(id: string, body: UpdateCourseBody): Promise<ApiCourseListItem> {
  return api<ApiCourseListItem>(`courses/${id}`, { method: 'PATCH', body });
}

export async function requestApproval(id: string): Promise<ApiCourseListItem> {
  return api<ApiCourseListItem>(`courses/${id}/request-approval`, { method: 'POST' });
}

/** Replaces the full curriculum (modules + lessons) of a draft / rejected course. */
export async function replaceCurriculum(
  courseId: string,
  modules: CreateModuleBody[],
): Promise<ApiCourseDetail> {
  const body: ReplaceCurriculumBody = { modules };
  return api<ApiCourseDetail>(`courses/${courseId}/curriculum`, { method: 'PUT', body });
}

export async function reviewCourse(id: string, body: ReviewCourseBody): Promise<ApiCourseListItem> {
  return api<ApiCourseListItem>(`courses/${id}/review`, { method: 'POST', body });
}

export async function publishCourse(id: string): Promise<ApiCourseListItem> {
  return api<ApiCourseListItem>(`courses/${id}/publish`, { method: 'POST' });
}

/* -------------------------------------------------------------------------- */
/*  Curriculum (modules / lessons)                                             */
/* -------------------------------------------------------------------------- */

export async function fetchCourseModules(courseId: string): Promise<ApiModule[]> {
  return api<ApiModule[]>(`courses/${courseId}/modules`);
}

export async function createModule(
  courseId: string,
  body: {
    title?: string;
    titleEn?: string;
    titleAm?: string;
    description?: string;
    descriptionEn?: string;
    descriptionAm?: string;
    lessons?: {
      title?: string;
      titleEn?: string;
      titleAm?: string;
      contentType?: string;
      durationMinutes?: number;
    }[];
  },
): Promise<ApiModule> {
  return api<ApiModule>(`courses/${courseId}/modules`, { method: 'POST', body });
}

export async function updateModule(
  moduleId: string,
  body: { title?: string; titleEn?: string; titleAm?: string; description?: string; descriptionEn?: string },
): Promise<ApiModule> {
  return api<ApiModule>(`modules/${moduleId}`, { method: 'PATCH', body });
}

export async function reorderModules(courseId: string, moduleIds: string[]): Promise<void> {
  await api<unknown>(`courses/${courseId}/modules/reorder`, {
    method: 'PATCH',
    body: { moduleIds },
  });
}

export async function reorderLessons(moduleId: string, lessonIds: string[]): Promise<void> {
  await api<unknown>(`modules/${moduleId}/lessons/reorder`, {
    method: 'PATCH',
    body: { lessonIds },
  });
}

export async function createLesson(
  moduleId: string,
  body: {
    title?: string;
    titleEn?: string;
    titleAm?: string;
    content?: string;
    contentEn?: string;
    contentAm?: string;
    contentType?: string;
    durationMinutes?: number;
  },
): Promise<ApiModule> {
  return api<ApiModule>(`modules/${moduleId}/lessons`, { method: 'POST', body });
}

export async function assignTrainer(courseId: string, userId: string): Promise<ApiCourseDetail> {
  return api<ApiCourseDetail>(`courses/${courseId}/trainers`, {
    method: 'POST',
    body: { userId },
  });
}

export async function unassignTrainer(courseId: string, userId: string): Promise<void> {
  await api<unknown>(`courses/${courseId}/trainers/${userId}`, { method: 'DELETE' });
}

/** Withdraws the approval of an approved, unpublished course and moves it back to draft. */
export async function returnCourseToDraft(id: string, reason: string): Promise<ApiCourseListItem> {
  return api<ApiCourseListItem>(`courses/${id}/return-to-draft`, { method: 'POST', body: { reason } });
}

export async function unpublishCourse(id: string): Promise<ApiCourseListItem> {
  return api<ApiCourseListItem>(`courses/${id}/unpublish`, { method: 'POST' });
}

export async function archiveCourse(id: string): Promise<ApiCourseListItem> {
  return api<ApiCourseListItem>(`courses/${id}/archive`, { method: 'POST' });
}

export async function fetchCourseEnrollmentCount(id: string): Promise<number> {
  const res = await api<{ count: number }>(`courses/${id}/enrollment-count`);
  return res.count;
}

export async function deleteCourse(id: string): Promise<{ affectedLearners?: number }> {
  return api<{ affectedLearners?: number }>(`courses/${id}`, { method: 'DELETE' });
}
