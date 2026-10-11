import {
  addAppDaysAtTimeOf,
  appDateKey,
  appDayOfWeek,
  formatAppDateTime,
  nextAppDay,
  startsInSeconds,
} from './app-time.util';

// The app time zone defaults to EAT (UTC+3), whatever zone the test machine is in.
describe('app time (EAT)', () => {
  it('reads the calendar day in EAT, not UTC', () => {
    // 22:00 UTC Sunday is 01:00 EAT Monday.
    const lateSundayUtc = new Date('2026-10-11T22:00:00Z');
    expect(appDayOfWeek(lateSundayUtc)).toBe(1);
    expect(appDateKey(lateSundayUtc)).toBe('2026-10-12');
    // 20:00 UTC Sunday is 23:00 EAT, still Sunday.
    expect(appDayOfWeek(new Date('2026-10-11T20:00:00Z'))).toBe(0);
  });

  it('adds calendar days keeping the EAT start time', () => {
    const elevenEat = new Date('2026-10-12T08:00:00Z');
    expect(addAppDaysAtTimeOf(elevenEat, 10, elevenEat).toISOString()).toBe(
      '2026-10-22T08:00:00.000Z',
    );
    // Time of day comes from the second argument: 01:00 EAT.
    const oneAmEat = new Date('2026-10-11T22:00:00Z');
    expect(addAppDaysAtTimeOf(elevenEat, 1, oneAmEat).toISOString()).toBe(
      '2026-10-12T22:00:00.000Z',
    );
    expect(nextAppDay(oneAmEat).toISOString()).toBe('2026-10-12T22:00:00.000Z');
  });

  it('formats with the EAT label', () => {
    expect(formatAppDateTime('2026-10-23T08:00:00Z')).toBe('Fri, Oct 23, 2026, 11:00 AM EAT');
  });

  it('gives seconds until an upcoming session only', () => {
    const now = new Date('2026-10-20T08:00:00Z');
    const at = '2026-10-24T10:35:00Z';
    expect(startsInSeconds({ status: 'SCHEDULED', scheduledAt: at }, now)).toBe(
      4 * 86400 + 2 * 3600 + 35 * 60,
    );
    expect(startsInSeconds({ status: 'LIVE', scheduledAt: at }, now)).toBeNull();
    expect(
      startsInSeconds({ status: 'SCHEDULED', scheduledAt: '2026-10-19T08:00:00Z' }, now),
    ).toBeNull();
  });
});
