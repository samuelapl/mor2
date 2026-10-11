/**
 * Course grading rules, shared by progress reporting and certificate issuing so the two
 * can never disagree:
 *
 * - Each assessment passes on its own pass mark (the global policy mark fills in when an
 *   assessment has none).
 * - Course grade = Σ best score × weight ÷ 100. A never-attempted assessment scores 0.
 *   When no weights are configured at all (legacy courses) the 100% is split evenly.
 * - The certificate needs every assessment passed AND course grade ≥ the global mark.
 *   Session quizzes are the exception: they only count towards the grade. A missed one
 *   scores 0 and blocks the certificate only through the grade.
 * - A session quiz must be *closed* for the learner before the certificate: they have a
 *   result from a held round of it. Missed sessions are rescheduled, so a learner without
 *   one still has a round to attend; newer rounds never reopen a quiz already taken.
 */

export interface GradableAssessment {
  id: string;
  /** AssessmentType; SESSION_ASSESSMENT is graded but not individually required. */
  type?: string;
  weight: number | null;
  passingScore: number;
  /** Submitted attempts, any order. */
  attempts: Array<{ score: number; passed: boolean }>;
  /** Session quizzes: false while the learner has no result from a held round (see isSessionQuizClosed). */
  closed?: boolean;
}

/**
 * A session quiz is closed for a learner once a held round graded them (`attempts` are the
 * learner's submitted attempts). Grading only writes a result for learners in that round.
 */
export function isSessionQuizClosed(a: { attempts: unknown[] }): boolean {
  return a.attempts.length > 0;
}

export interface AssessmentGrade {
  id: string;
  passingScore: number;
  passed: boolean;
  attempted: boolean;
  bestScore: number;
  weight: number;
  earnedPoints: number;
}

export interface CourseGrade {
  assessments: AssessmentGrade[];
  totalCourseGrade: number;
  allAssessmentsPassed: boolean;
  gradeSatisfied: boolean;
  requiredGrade: number;
  /** Session quizzes whose session has not been completed yet; the certificate waits for them. */
  sessionsPending: number;
  /** Every certificate condition that depends on assessments. */
  certificateReady: boolean;
}

/** An assessment is passed once any submitted attempt reaches its pass mark (or the global one). */
export function isAssessmentPassed(
  assessment: Pick<GradableAssessment, 'passingScore' | 'attempts'>,
  globalPassMark: number,
): boolean {
  const passingScore = assessment.passingScore > 0 ? assessment.passingScore : globalPassMark;
  return assessment.attempts.some((att) => att.passed || att.score >= passingScore);
}

export function computeCourseGrade(
  assessments: GradableAssessment[],
  globalPassMark: number,
): CourseGrade {
  const configuredWeight = assessments.reduce((sum, a) => sum + (a.weight || 0), 0);
  const equalWeight =
    configuredWeight === 0 && assessments.length > 0 ? Math.round(100 / assessments.length) : 0;

  const graded = assessments.map((a): AssessmentGrade => {
    const passingScore = a.passingScore > 0 ? a.passingScore : globalPassMark;
    const bestScore = a.attempts.reduce((best, att) => Math.max(best, att.score), 0);
    const weight = configuredWeight === 0 ? equalWeight : a.weight || 0;
    return {
      id: a.id,
      passingScore,
      passed: isAssessmentPassed(a, globalPassMark),
      attempted: a.attempts.length > 0,
      bestScore,
      weight,
      earnedPoints: Math.round(bestScore * (weight / 100) * 10) / 10,
    };
  });

  const totalCourseGrade = Math.min(
    100,
    Math.round(graded.reduce((sum, g) => sum + g.earnedPoints, 0)),
  );
  const none = assessments.length === 0;
  const allAssessmentsPassed = graded.every(
    (g, i) => g.passed || assessments[i]!.type === 'SESSION_ASSESSMENT',
  );
  const gradeSatisfied = none || totalCourseGrade >= globalPassMark;
  const sessionsPending = assessments.filter(
    (a) => a.type === 'SESSION_ASSESSMENT' && a.closed === false,
  ).length;
  return {
    assessments: graded,
    totalCourseGrade,
    allAssessmentsPassed,
    gradeSatisfied,
    requiredGrade: globalPassMark,
    sessionsPending,
    certificateReady: allAssessmentsPassed && gradeSatisfied && sessionsPending === 0,
  };
}
