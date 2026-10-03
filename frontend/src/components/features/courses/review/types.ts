import type { ApiAssessment } from '@/lib/api/types';

/** Items a reviewer can select. Same shape as the creator's `CreatorActiveNode`. */
export type ReviewNodeType =
  'OVERVIEW' | 'MODULE' | 'LESSON' | 'SUB_LESSON' | 'MODULE_ASSESSMENT' | 'LESSON_ASSESSMENT' | 'FINAL_ASSESSMENT' | 'SESSION_PLAN' | 'APPROVAL_HISTORY';

export interface ReviewNode {
  type: ReviewNodeType;
  moduleId?: string;
  lessonId?: string;
  subLessonId?: string;
  sessionPlanId?: string;
}

export type CourseActionKey = 'edit' | 'submit' | 'approve' | 'reject' | 'publish' | 'unpublish' | 'archive' | 'delete' | 'assignTrainer' | 'returnToDraft';

/** Every assessment on the course, with answers, grouped by where it is attached. */
export interface AssessmentsByScope {
  all: ApiAssessment[];
  final: ApiAssessment[];
  byModule: Record<string, ApiAssessment>;
  byLesson: Record<string, ApiAssessment>;
}
