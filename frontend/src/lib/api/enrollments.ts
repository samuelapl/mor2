import { api } from './client';
import type { ApiEnrollment, ApiPaginated, SelfEnrollInput } from './types';

export interface BulkEnrollResult {
  courseId: string;
  requested: number;
  enrolled: number;
  skipped: number;
}

export async function selfEnroll(input: string | SelfEnrollInput): Promise<ApiEnrollment> {
  const body = typeof input === 'string' ? { courseId: input } : input;
  return api<ApiEnrollment>('enrollments/self', {
    method: 'POST',
    body,
  });
}

export async function fetchMyEnrollments(): Promise<ApiPaginated<ApiEnrollment>> {
  return api<ApiPaginated<ApiEnrollment>>('enrollments/me', {
    query: { limit: 100 },
  });
}

export async function fetchCourseEnrollments(
  courseId: string,
): Promise<ApiPaginated<ApiEnrollment>> {
  return api<ApiPaginated<ApiEnrollment>>(`courses/${courseId}/enrollments`, {
    query: { limit: 100 },
  });
}

export async function bulkEnroll(courseId: string, userIds: string[]): Promise<BulkEnrollResult> {
  return api<BulkEnrollResult>(`courses/${courseId}/enrollments`, {
    method: 'POST',
    body: { userIds },
  });
}

export async function dropEnrollment(
  enrollmentId: string,
  reason?: string,
): Promise<ApiEnrollment> {
  return api<ApiEnrollment>(`enrollments/${enrollmentId}/drop`, {
    method: 'PATCH',
    body: reason ? { reason } : {},
  });
}
