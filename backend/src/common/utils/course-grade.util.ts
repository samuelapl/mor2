/**
 * Course grading rules, shared by progress reporting and certificate issuing so the two
 * can never disagree:
 *
 * - Each assessment passes on its own pass mark (the global policy mark fills in when an
 *   assessment has none).
 * - Course grade = Σ best score × weight ÷ 100. A never-attempted assessment scores 0.
 *   When no weights are configured at all (legacy courses) the 100% is split evenly.
 * - The certificate needs every assessment passed AND course grade ≥ the global mark.
 * - Session quizzes are formative: no pass mark, no weight. Their score is feedback only and
 *   never counts towards the grade or the certificate. For live sessions only attendance
 *   counts (see session-attendance.util.ts).
 */

export interface GradableAssessment {
  id: string;
  /** AssessmentType; SESSION_ASSESSMENT is formative and left out of the grade. */
  type?: string;
  weight: number | null;
  passingScore: number;
  /** Submitted attempts, any order. */
  attempts: Array<{ score: number; passed: boolean }>;
}

export function isFormative(a: { type?: string }): boolean {
  return a.type === 'SESSION_ASSESSMENT';
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
  const gradable = assessments.filter((a) => !isFormative(a));
  const configuredWeight = gradable.reduce((sum, a) => sum + (a.weight || 0), 0);
  const equalWeight =
    configuredWeight === 0 && gradable.length > 0 ? Math.round(100 / gradable.length) : 0;

  const graded = assessments.map((a): AssessmentGrade => {
    const bestScore = a.attempts.reduce((best, att) => Math.max(best, att.score), 0);
    const attempted = a.attempts.length > 0;
    if (isFormative(a)) {
      // Score shown as feedback only; "passed" just means the learner took it.
      return {
        id: a.id,
        passingScore: 0,
        passed: attempted,
        attempted,
        bestScore,
        weight: 0,
        earnedPoints: 0,
      };
    }
    const passingScore = a.passingScore > 0 ? a.passingScore : globalPassMark;
    const weight = configuredWeight === 0 ? equalWeight : a.weight || 0;
    return {
      id: a.id,
      passingScore,
      passed: isAssessmentPassed(a, globalPassMark),
      attempted,
      bestScore,
      weight,
      earnedPoints: Math.round(bestScore * (weight / 100) * 10) / 10,
    };
  });

  const totalCourseGrade = Math.min(
    100,
    Math.round(graded.reduce((sum, g) => sum + g.earnedPoints, 0)),
  );
  const allAssessmentsPassed = graded.every((g, i) => g.passed || isFormative(assessments[i]!));
  const gradeSatisfied = gradable.length === 0 || totalCourseGrade >= globalPassMark;
  return {
    assessments: graded,
    totalCourseGrade,
    allAssessmentsPassed,
    gradeSatisfied,
    requiredGrade: globalPassMark,
    certificateReady: allAssessmentsPassed && gradeSatisfied,
  };
}
