import { preferencesStorage, readJson, writeJson } from '@/core/storage/kv-storage';
import type { CourseFeedbackInput, CourseFeedbackRecord } from '../types/feedback.types';

const FEEDBACK_LIST_KEY = 'mor_course_feedback_list';

export function hasSubmittedFeedback(courseId: string, userId?: string): boolean {
  if (!courseId || !userId) return false;
  const quickKey = `mor_feedback_${courseId}_${userId}`;
  return preferencesStorage.getString(quickKey) === 'true';
}

export function hasSkippedFeedback(courseId: string, userId?: string): boolean {
  if (!courseId || !userId) return false;
  const skipKey = `mor_feedback_skipped_${courseId}_${userId}`;
  return preferencesStorage.getString(skipKey) === 'true';
}

export function markFeedbackSkipped(courseId: string, userId?: string): void {
  if (!courseId || !userId) return;
  const skipKey = `mor_feedback_skipped_${courseId}_${userId}`;
  preferencesStorage.set(skipKey, 'true');
}

export async function submitCourseFeedback(
  input: CourseFeedbackInput,
): Promise<CourseFeedbackRecord> {
  const ratings = Object.values(input.ratings);
  const overallRating =
    ratings.reduce((acc, r) => acc + r, 0) / (ratings.length || 1);

  const record: CourseFeedbackRecord = {
    ...input,
    id: `fb-${Date.now()}`,
    overallRating: Number(overallRating.toFixed(1)),
    submittedAt: new Date().toISOString(),
    status: 'PENDING_REVIEW',
  };

  const current = readJson<CourseFeedbackRecord[]>(preferencesStorage, FEEDBACK_LIST_KEY) ?? [];
  writeJson(preferencesStorage, FEEDBACK_LIST_KEY, [record, ...current]);

  preferencesStorage.set(`mor_feedback_${input.courseId}_${input.userId}`, 'true');

  return record;
}
