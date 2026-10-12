import { computeCourseGrade, GradableAssessment } from './course-grade.util';

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

describe('computeCourseGrade with formative session quizzes', () => {
  const session = (scores: number[], weight = 0, passingScore = 0): GradableAssessment => ({
    id: 's',
    type: 'SESSION_ASSESSMENT',
    weight,
    passingScore,
    attempts: scores.map((score) => ({ score, passed: false })),
  });

  it('leaves a failed session quiz out of the grade and the certificate', () => {
    const grade = computeCourseGrade([a('final', 100, 50, [80]), session([10])], 70);
    expect(grade.totalCourseGrade).toBe(80);
    expect(grade.allAssessmentsPassed).toBe(true);
    expect(grade.certificateReady).toBe(true);
  });

  it('is certificate-ready without any session quiz result (missed or not held yet)', () => {
    const grade = computeCourseGrade([a('final', 100, 50, [80]), session([])], 70);
    expect(grade.certificateReady).toBe(true);
  });

  it('ignores a leftover weight or pass mark on a session quiz', () => {
    const grade = computeCourseGrade([a('final', 70, 50, [100]), session([0], 30, 50)], 70);
    expect(grade.assessments[1]).toMatchObject({ weight: 0, passingScore: 0, earnedPoints: 0 });
    expect(grade.totalCourseGrade).toBe(70);
    expect(grade.certificateReady).toBe(true);
  });

  it('reports the best session score as feedback', () => {
    const grade = computeCourseGrade([a('final', 100, 50, [80]), session([40, 70])], 70);
    expect(grade.assessments[1]).toMatchObject({ bestScore: 70, attempted: true, passed: true });
  });

  it('leaves session quizzes out of the even split for legacy courses', () => {
    const grade = computeCourseGrade(
      [a('x', 0, 50, [100]), a('y', 0, 50, [100]), session([0])],
      50,
    );
    expect(grade.assessments.map((g) => g.weight)).toEqual([50, 50, 0]);
    expect(grade.totalCourseGrade).toBe(100);
  });

  it('treats a course with only session quizzes as satisfied', () => {
    const grade = computeCourseGrade([session([0])], 70);
    expect(grade.gradeSatisfied).toBe(true);
    expect(grade.certificateReady).toBe(true);
  });
});
