import { computeProgressPercent, countsTowardProgress } from './course-progress.util';

describe('computeProgressPercent', () => {
  it('stays below 100% when every lesson is done but an assessment is not passed', () => {
    expect(
      computeProgressPercent({
        totalLessons: 10,
        completedLessons: 10,
        totalAssessments: 1,
        passedAssessments: 0,
      }),
    ).toBe(91);
  });

  it('reaches 100% once every lesson is done and every assessment is passed', () => {
    expect(
      computeProgressPercent({
        totalLessons: 10,
        completedLessons: 10,
        totalAssessments: 3,
        passedAssessments: 3,
      }),
    ).toBe(100);
  });

  it('never rounds up to 100% while an item is left', () => {
    expect(
      computeProgressPercent({
        totalLessons: 199,
        completedLessons: 199,
        totalAssessments: 1,
        passedAssessments: 0,
      }),
    ).toBe(99);
  });

  it('counts lessons alone for a course without assessments', () => {
    expect(
      computeProgressPercent({
        totalLessons: 4,
        completedLessons: 1,
        totalAssessments: 0,
        passedAssessments: 0,
      }),
    ).toBe(25);
  });

  it('reports 0% for an empty course', () => {
    expect(
      computeProgressPercent({
        totalLessons: 0,
        completedLessons: 0,
        totalAssessments: 0,
        passedAssessments: 0,
      }),
    ).toBe(0);
  });
});

describe('countsTowardProgress', () => {
  it('counts lesson, module and final assessments but not live session quizzes', () => {
    expect(countsTowardProgress('LESSON_ASSESSMENT')).toBe(true);
    expect(countsTowardProgress('MODULE_ASSESSMENT')).toBe(true);
    expect(countsTowardProgress('FINAL_ASSESSMENT')).toBe(true);
    expect(countsTowardProgress('SESSION_ASSESSMENT')).toBe(false);
  });
});
