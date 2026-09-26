/** GET /progress/courses/:courseId (spec §6.1). */
export interface ProgressAssessment {
  id: string;
  titleEn: string;
  titleAm: string;
  passingScore: number;
  passed: boolean;
}

export interface SubLessonProgress {
  lessonId: string;
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
  };
}
