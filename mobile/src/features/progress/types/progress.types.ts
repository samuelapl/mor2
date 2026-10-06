/** GET /progress/courses/:courseId (spec §6.1). */
export interface ProgressAssessment {
  id: string;
  title?: string;
  titleEn: string;
  titleAm: string;
  passingScore: number;
  passed: boolean;
}

export interface SubLessonProgress {
  lessonId: string;
  title?: string;
  titleEn: string;
  titleAm: string;
  order: number;
  unlocked: boolean;
  completed: boolean;
  durationMinutes: number | null;
  timeSpentSeconds: number;
  requiredSeconds: number;
  timeSatisfied: boolean;
  assessment: null;
}

export interface LessonProgress extends Omit<SubLessonProgress, 'assessment'> {
  lastPosition: number;
  assessment: ProgressAssessment | null;
  subLessons: SubLessonProgress[];
}

export interface ModuleProgress {
  moduleId: string;
  title?: string;
  titleEn: string;
  titleAm: string;
  order: number;
  unlocked: boolean;
  totalLessons: number;
  completedLessons: number;
  unlockedLessons: number;
  moduleCompleted: boolean;
  progressPercent: number;
  durationMinutes: number | null;
  timeSpentSeconds: number;
  requiredSeconds: number;
  timeSatisfied: boolean;
  assessment: ProgressAssessment | null;
  lessons: LessonProgress[];
}

export interface CourseProgress {
  courseId: string;
  progressionMode?: 'LOCKED' | 'OPEN';
  stats: {
    totalModules: number;
    totalLessons: number;
    completedLessons: number;
    unlockedLessons: number;
    overallPercent: number;
  };
  modules: ModuleProgress[];
  courseCompletion: {
    contentCompleted: boolean;
    finalAssessmentRequired: boolean;
    finalAssessmentPassed: boolean;
    certificateEligible: boolean;
    finalAssessment: ProgressAssessment | null;
    allAssessmentsPassed?: boolean;
    /** Weighted course grade (0–100), session quizzes included. */
    totalCourseGrade?: number;
    passingScorePercent?: number;
    gradeSatisfied?: boolean;
    /** Session quizzes still waiting for their session; the certificate waits for them. */
    sessionsPending?: number;
    assessmentBreakdown?: AssessmentBreakdownItem[];
  };
  /** The course's online sessions (planned ones too, before they're scheduled). */
  liveSessions?: LearnerSession[];
}

export interface AssessmentBreakdownItem {
  id: string;
  titleEn: string;
  titleAm: string;
  passingScore: number;
  passed: boolean;
  weight?: number;
  bestScore?: number;
  earnedPoints?: number;
  /** False when never submitted; it counts as 0 in the course grade. */
  attempted?: boolean;
  /** SESSION_ASSESSMENT quizzes run live in a session and are graded when it ends. */
  type?: string;
  retakeAvailable?: boolean;
}

export interface LearnerSession {
  /** Session plan id, or the session id for unplanned sessions. */
  id: string;
  sessionId: string | null;
  titleEn: string;
  scheduledAt: string | null;
  durationMinutes: number | null;
  platform: string | null;
  trainerName: string | null;
  status: 'TO_BE_SCHEDULED' | 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  attended: boolean;
  planned: boolean;
}
