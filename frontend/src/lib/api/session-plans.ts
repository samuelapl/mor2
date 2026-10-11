import { api } from './client';
import type { ApiSessionPlan, ReplaceSessionPlansBody } from './types';

/** Planned online sessions of a course, with their weighted quizzes. */
export async function fetchSessionPlans(courseId: string): Promise<ApiSessionPlan[]> {
  return api<ApiSessionPlan[]>(`courses/${courseId}/session-plans`);
}

/** Replaces every planned session of a draft / rejected course; `plans: []` removes them all. */
export async function replaceSessionPlans(courseId: string, body: ReplaceSessionPlansBody): Promise<ApiSessionPlan[]> {
  return api<ApiSessionPlan[]>(`courses/${courseId}/session-plans`, { method: 'PUT', body });
}

/** Assigns (or with `null` clears) the trainer who will host a planned session. */
export async function assignSessionPlanTrainer(courseId: string, planId: string, trainerId: string | null): Promise<ApiSessionPlan[]> {
  return api<ApiSessionPlan[]>(`courses/${courseId}/session-plans/${planId}/trainer`, { method: 'PATCH', body: { trainerId } });
}
