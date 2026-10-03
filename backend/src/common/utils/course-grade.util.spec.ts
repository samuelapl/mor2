import { computeCourseGrade, GradableAssessment, isSessionQuizClosed } from './course-grade.util';

const a = (
  id: string,
  weight: number,
  passingScore: number,
  scores: number[],
): GradableAssessment => ({
  id,
  weight,
  passingScore,
  attempts: scores.map((score) => ({ score, passed: score >= passingScore })),
});

describe('computeCourseGrade', () => {
  it('passes every quiz yet blocks the certificate when the weighted grade is below the global mark', () => {
    // Plan scenario: quiz pass marks 50%, policy 70%, scores 55 / 60 / 65 at 20 / 20 / 60.
    const grade = computeCourseGrade(
      [a('lesson', 20, 50, [55]), a('module', 20, 50, [60]), a('final', 60, 50, [65])],
      70,
    );
    expect(grade.allAssessmentsPassed).toBe(true);
    expect(grade.totalCourseGrade).toBe(62);
    expect(grade.gradeSatisfied).toBe(false);
  });

  it('uses the best attempt, so a retake can lift the grade over the line', () => {
    const grade = computeCourseGrade(
      [a('lesson', 20, 50, [55]), a('module', 20, 50, [60]), a('final', 60, 50, [65, 90])],
      70,
    );
    expect(grade.totalCourseGrade).toBe(77);
    expect(grade.gradeSatisfied).toBe(true);
  });

  it('judges each assessment by its own pass mark, not the global one', () => {
    const grade = computeCourseGrade([a('final', 100, 80, [75])], 50);
    expect(grade.assessments[0]!.passed).toBe(false);
    expect(grade.allAssessmentsPassed).toBe(false);
  });

  it('falls back to the global mark for an assessment without its own', () => {
    const grade = computeCourseGrade([a('final', 100, 0, [65])], 60);
    expect(grade.assessments[0]!.passingScore).toBe(60);
    expect(grade.assessments[0]!.passed).toBe(true);
  });

  it('scores a never-attempted assessment as 0', () => {
    const grade = computeCourseGrade([a('final', 60, 50, [100]), a('module', 40, 50, [])], 70);
    expect(grade.assessments[1]!.attempted).toBe(false);
    expect(grade.totalCourseGrade).toBe(60);
    expect(grade.allAssessmentsPassed).toBe(false);
  });

  it('splits weight evenly for legacy courses with no weights set', () => {
    const grade = computeCourseGrade([a('x', 0, 50, [100]), a('y', 0, 50, [100])], 50);
    expect(grade.assessments.map((g) => g.weight)).toEqual([50, 50]);
    expect(grade.totalCourseGrade).toBe(100);
  });

  it('treats a course without assessments as satisfied', () => {
    const grade = computeCourseGrade([], 70);
    expect(grade.allAssessmentsPassed).toBe(true);
    expect(grade.gradeSatisfied).toBe(true);
  });
});

describe('computeCourseGrade with session quizzes', () => {
  it('does not require a session quiz to be passed, but counts it in the grade', () => {
    const grade = computeCourseGrade(
      [
        { ...a('final', 90, 50, [100]) },
        { id: 'session', type: 'SESSION_ASSESSMENT', weight: 10, passingScore: 50, attempts: [] }, // missed
      ],
      70,
    );
    expect(grade.allAssessmentsPassed).toBe(true);
    expect(grade.totalCourseGrade).toBe(90);
    expect(grade.gradeSatisfied).toBe(true);
  });

  it('blocks the certificate only through the grade when a missed session quiz drags it down', () => {
    const grade = computeCourseGrade(
      [
        a('final', 70, 50, [80]),
        { id: 's', type: 'SESSION_ASSESSMENT', weight: 30, passingScore: 50, attempts: [] },
      ],
      70,
    );
    expect(grade.allAssessmentsPassed).toBe(true);
    expect(grade.totalCourseGrade).toBe(56);
    expect(grade.gradeSatisfied).toBe(false);
  });
});

describe('computeCourseGrade waits for session quizzes', () => {
  const session = (closed: boolean, scores: number[] = []) => ({
    id: 's',
    type: 'SESSION_ASSESSMENT',
    weight: 10,
    passingScore: 50,
    closed,
    attempts: scores.map((score) => ({ score, passed: score >= 50 })),
  });

  it('is not certificate-ready while a session has not been held, even if the grade already clears', () => {
    const grade = computeCourseGrade([a('final', 90, 50, [100]), session(false)], 70);
    expect(grade.gradeSatisfied).toBe(true);
    expect(grade.sessionsPending).toBe(1);
    expect(grade.certificateReady).toBe(false);
  });

  it('becomes ready once the session is completed', () => {
    const grade = computeCourseGrade([a('final', 90, 50, [100]), session(true, [0])], 70);
    expect(grade.sessionsPending).toBe(0);
    expect(grade.certificateReady).toBe(true);
  });
});

describe('isSessionQuizClosed', () => {
  it('treats only a completed, non-deleted session as closed', () => {
    const live = (status: string, deletedAt: Date | null = null) => ({
      sessionPlan: { liveSession: { status, deletedAt } },
    });
    expect(isSessionQuizClosed(live('COMPLETED'))).toBe(true);
    expect(isSessionQuizClosed(live('SCHEDULED'))).toBe(false);
    expect(isSessionQuizClosed(live('CANCELLED'))).toBe(false); // cancelled keeps blocking until rescheduled
    expect(isSessionQuizClosed(live('COMPLETED', new Date()))).toBe(false);
    expect(isSessionQuizClosed({ sessionPlan: { liveSession: null } })).toBe(false); // not scheduled yet
  });
});
