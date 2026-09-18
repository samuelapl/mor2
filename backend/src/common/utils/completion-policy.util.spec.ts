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

  it('requires half of the duration in seconds, rounded up', () => {
    expect(requiredSeconds(10)).toBe(300); // 10min * 60 * 0.5 = 300s
    expect(requiredSeconds(1)).toBe(30);
  });
});

describe('isTimeSatisfied', () => {
  it('is satisfied once exactly at the 50% boundary', () => {
    expect(isTimeSatisfied(300, 10)).toBe(true);
  });

  it('is not satisfied one second below the boundary', () => {
    expect(isTimeSatisfied(299, 10)).toBe(false);
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
