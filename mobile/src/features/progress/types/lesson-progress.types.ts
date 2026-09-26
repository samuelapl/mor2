/** GET /progress/lessons/:lessonId — null when never opened (spec §6.2). */
export interface LessonCompletion {
  id: string;
  userId: string;
  lessonId: string;
  completed: boolean;
  completedAt: string | null;
  lastPosition: number | null;
  lastAccessed: string | null;
  timeSpentSeconds: number;
}

/** PATCH /progress/lessons/:id/time response (spec §6.4). */
export interface LessonTimeResult {
  lessonId: string;
  timeSpentSeconds: number;
  requiredSeconds: number;
  satisfied: boolean;
}
