import { isTimeSatisfied, requiredSeconds, sumLessonTime } from './completion-policy.util';

describe('requiredSeconds', () => {
  it('returns 0 when duration is null/undefined/0', () => {
    expect(requiredSeconds(null)).toBe(0);
    expect(requiredSeconds(undefined)).toBe(0);
    expect(requiredSeconds(0)).toBe(0);
  });

  it('returns 0 for a negative duration', () => {
    expect(requiredSeconds(-5)).toBe(0);
  });

  it('calculates required duration in seconds based on ratio', () => {
    expect(requiredSeconds(10, 0.5)).toBe(300);
    expect(requiredSeconds(1, 0.5)).toBe(30);
  });
});

describe('isTimeSatisfied', () => {
  it('is satisfied once exactly at the required boundary', () => {
    expect(isTimeSatisfied(10, 10)).toBe(true);
  });

  it('is not satisfied one second below the boundary', () => {
    expect(isTimeSatisfied(9, 10)).toBe(false);
  });

  it('is always satisfied when there is no duration configured', () => {
    expect(isTimeSatisfied(0, null)).toBe(true);
    expect(isTimeSatisfied(0, undefined)).toBe(true);
  });
});

describe('sumLessonTime', () => {
  it('sums timeSpentSeconds across rows', () => {
    expect(sumLessonTime([{ timeSpentSeconds: 30 }, { timeSpentSeconds: 45 }])).toBe(75);
  });

  it('treats missing values as 0', () => {
    expect(sumLessonTime([{ timeSpentSeconds: undefined as unknown as number }])).toBe(0);
  });

  it('returns 0 for an empty list', () => {
    expect(sumLessonTime([])).toBe(0);
  });
});
