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
    /** Weighted course grade (0–100); live-session quizzes are formative and not included. */
    totalCourseGrade?: number;
    passingScorePercent?: number;
    gradeSatisfied?: boolean;
    /** Live sessions still to attend before the certificate (the server's rule). */
    missingSessions?: MissingSession[];
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
  /**
   * SESSION_ASSESSMENT quizzes run live in a session and are formative: weight 0, no pass mark,
   * `bestScore` is feedback only and `passed` means "taken".
   */
  type?: string;
  retakeAvailable?: boolean;
}

/** A live session the learner has not attended yet. */
export interface MissingSession {
  id: string;
  title: string;
  /** Earliest upcoming round they can attend, or null while none is scheduled. */
  nextSessionAt: string | null;
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
  sessionType?: string | null;
  venueId?: string | null;
  venue?: {
    id: string;
    name: string;
    branch?: string | null;
    building?: string | null;
    room?: string | null;
    capacity?: number | null;
    address?: string | null;
    directions?: string | null;
  } | null;
  /** Seconds until an upcoming session starts, on the server clock when it was loaded. */
  startsInSeconds?: number | null;
  /** Earlier held rounds of this planned session the learner missed (oldest first). */
  missedRounds?: MissedRound[];
}

export interface MissedRound {
  sessionId: string;
  scheduledAt: string;
  durationMinutes: number | null;
}
