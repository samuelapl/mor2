import { missingSessionAttendance, AttendanceSession } from './session-attendance.util';

const session = (overrides: Partial<AttendanceSession>): AttendanceSession => ({
  id: 's',
  titleEn: 'Session',
  status: 'COMPLETED',
  sessionPlanId: null,
  originalPlanId: null,
  attended: false,
  ...overrides,
});

const plans = [
  { id: 'p1', titleEn: 'Session 1' },
  { id: 'p2', titleEn: 'Session 2' },
];

describe('missingSessionAttendance with planned sessions', () => {
  it('accepts a missed session attended when it was scheduled again', () => {
    const sessions = [
      session({ id: 'r1-s1', originalPlanId: 'p1', attended: true }),
      session({ id: 'r1-s2', originalPlanId: 'p2', attended: false }),
      session({ id: 'r2-s2', originalPlanId: 'p2', attended: true }),
      // Newer rounds already scheduled do not block a learner who attended.
      session({ id: 'r2-s1', status: 'SCHEDULED', sessionPlanId: 'p1', originalPlanId: 'p1' }),
      session({ id: 'r3-s2', status: 'SCHEDULED', sessionPlanId: 'p2', originalPlanId: 'p2' }),
    ];
    expect(missingSessionAttendance(plans, sessions, true)).toEqual([]);
  });

  it('lists each plan not attended in any round', () => {
    const sessions = [
      session({ id: 'r1-s1', originalPlanId: 'p1', attended: false }),
      session({ id: 'r1-s2', originalPlanId: 'p2', attended: true }),
    ];
    expect(missingSessionAttendance(plans, sessions, true)).toEqual([
      { id: 'p1', title: 'Session 1' },
    ]);
  });

  it('does not count attendance of a session that has not been completed', () => {
    const sessions = [
      session({ id: 's1', status: 'LIVE', sessionPlanId: 'p1', attended: true }),
      session({ id: 's2', sessionPlanId: 'p2', attended: true }),
    ];
    expect(missingSessionAttendance(plans, sessions, true)).toEqual([
      { id: 'p1', title: 'Session 1' },
    ]);
  });

  it('requires a plan that was never scheduled', () => {
    expect(missingSessionAttendance(plans, [], true)).toHaveLength(2);
  });
});

describe('missingSessionAttendance without plans', () => {
  it('is satisfied for a self-paced course without sessions', () => {
    expect(missingSessionAttendance([], [], false)).toEqual([]);
  });

  it('requires every completed ad-hoc session to be attended', () => {
    const sessions = [
      session({ id: 'a', attended: true }),
      session({ id: 'b', titleEn: 'Extra', attended: false }),
      session({ id: 'c', status: 'SCHEDULED' }),
    ];
    expect(missingSessionAttendance([], sessions, true)).toEqual([{ id: 'b', title: 'Extra' }]);
  });

  it('waits until an online course has held a session', () => {
    expect(
      missingSessionAttendance([], [session({ id: 'a', status: 'SCHEDULED' })], true),
    ).toHaveLength(1);
    expect(missingSessionAttendance([], [], true)).toHaveLength(1);
  });
});
