import { CourseDeliveryMode, NotificationType, SessionStatus, SessionType } from '@prisma/client';
import { SessionRemindersService } from './session-reminders.service';
import { enrollmentCoversSession } from './session-mode';

const fakeQueue = {
  on: jest.fn(),
  addBulk: jest.fn(),
  close: jest.fn(async () => undefined),
  client: Promise.resolve({ status: 'ready' }) as Promise<{ status: string }>,
};

jest.mock('bullmq', () => ({
  Queue: jest.fn(() => fakeQueue),
  Worker: jest.fn(() => ({ on: jest.fn(), close: jest.fn(async () => undefined) })),
}));

const HOUR = 3600 * 1000;
const NOW = new Date('2026-10-10T08:00:00.000Z').getTime();

describe('SessionRemindersService', () => {
  let prisma: any;
  let notifications: { send: jest.Mock; sendToMany: jest.Mock };
  let service: SessionRemindersService;

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['setTimeout', 'clearTimeout'] });
    fakeQueue.addBulk.mockReset().mockResolvedValue([]);
    fakeQueue.client = Promise.resolve({ status: 'ready' });
    prisma = {
      liveSession: { findMany: jest.fn(), findUnique: jest.fn() },
      enrollment: { findMany: jest.fn(async () => []) },
    };
    notifications = { send: jest.fn(), sendToMany: jest.fn() };
    service = new SessionRemindersService(
      prisma,
      notifications as any,
      {
        get: () => undefined,
      } as any,
    );
    service.onModuleInit();
  });

  afterEach(() => jest.useRealTimers());

  describe('schedule', () => {
    it('adds 24 h and 1 h delayed jobs keyed by session and start time', async () => {
      const start = new Date(NOW + 48 * HOUR);
      prisma.liveSession.findMany.mockResolvedValue([{ id: 's1', scheduledAt: start }]);

      await service.schedule('s1');

      const jobs = fakeQueue.addBulk.mock.calls[0][0];
      expect(jobs).toEqual([
        {
          name: 'remind',
          data: { sessionId: 's1', scheduledAt: start.toISOString(), lead: '24h' },
          opts: { delay: 24 * HOUR, jobId: `session-s1-${start.getTime()}-24h` },
        },
        {
          name: 'remind',
          data: { sessionId: 's1', scheduledAt: start.toISOString(), lead: '1h' },
          opts: { delay: 47 * HOUR, jobId: `session-s1-${start.getTime()}-1h` },
        },
      ]);
    });

    it('skips reminders whose time has already passed', async () => {
      prisma.liveSession.findMany.mockResolvedValue([
        { id: 's1', scheduledAt: new Date(NOW + 5 * HOUR) },
      ]);

      await service.schedule('s1');

      const jobs = fakeQueue.addBulk.mock.calls[0][0];
      expect(jobs.map((j: any) => j.data.lead)).toEqual(['1h']);
    });

    it('does nothing (and does not throw) when Redis is down', async () => {
      fakeQueue.client = Promise.resolve({ status: 'reconnecting' });
      await expect(service.schedule('s1')).resolves.toBeUndefined();
      expect(prisma.liveSession.findMany).not.toHaveBeenCalled();
    });
  });

  describe('process', () => {
    const start = new Date(NOW + HOUR);
    const session = (patch: object = {}) => ({
      id: 's1',
      courseId: 'c1',
      trainerId: 't1',
      titleEn: 'Customs basics',
      titleAm: 'የጉምሩክ መሰረታዊ',
      status: SessionStatus.SCHEDULED,
      sessionType: SessionType.VIRTUAL,
      venueId: null,
      scheduledAt: start,
      deletedAt: null,
      course: { title: 'Customs 101' },
      ...patch,
    });
    const job = { data: { sessionId: 's1', scheduledAt: start.toISOString(), lead: '1h' } } as any;

    it('notifies enrolled online learners and the trainer', async () => {
      prisma.liveSession.findUnique.mockResolvedValue(session());
      prisma.enrollment.findMany.mockResolvedValue([
        {
          userId: 'online',
          deliveryMode: CourseDeliveryMode.ONLINE_ONLY,
          venueId: null,
          sessionId: null,
        },
        {
          userId: 'inperson',
          deliveryMode: CourseDeliveryMode.IN_PERSON_ONLY,
          venueId: 'v1',
          sessionId: null,
        },
      ]);

      await service.process(job);

      expect(notifications.sendToMany).toHaveBeenCalledWith(
        ['online'],
        NotificationType.SESSION_REMINDER,
        expect.objectContaining({ en: 'Session in 1 hour: Customs basics' }),
        expect.anything(),
        { sessionId: 's1', courseId: 'c1', lead: '1h' },
      );
      expect(notifications.send).toHaveBeenCalledWith(
        't1',
        NotificationType.SESSION_REMINDER,
        expect.anything(),
        expect.anything(),
        { sessionId: 's1', courseId: 'c1', lead: '1h', forTrainer: true },
      );
    });

    it.each([
      ['rescheduled', { scheduledAt: new Date(NOW + 3 * HOUR) }],
      ['cancelled', { status: SessionStatus.CANCELLED }],
      ['deleted', { deletedAt: new Date() }],
      ['already started', { scheduledAt: new Date(NOW - 60_000) }],
    ])('sends nothing when the session was %s', async (_, patch) => {
      const s = session(patch);
      prisma.liveSession.findUnique.mockResolvedValue(s);
      // A stale job still carries the original start time.
      await service.process({ data: { ...job.data, scheduledAt: start.toISOString() } } as any);
      expect(notifications.sendToMany).not.toHaveBeenCalled();
      expect(notifications.send).not.toHaveBeenCalled();
    });
  });
});

describe('enrollmentCoversSession', () => {
  const virtual = { id: 's1', sessionType: SessionType.VIRTUAL, venueId: null };
  const inPerson = { id: 's2', sessionType: SessionType.IN_PERSON, venueId: 'v1' };

  it('matches online enrollments to virtual sessions only', () => {
    const e = { deliveryMode: CourseDeliveryMode.ONLINE_ONLY, venueId: null, sessionId: null };
    expect(enrollmentCoversSession(e, virtual)).toBe(true);
    expect(enrollmentCoversSession(e, inPerson)).toBe(false);
  });

  it('matches a booked in-person enrollment to its own session only', () => {
    const e = { deliveryMode: CourseDeliveryMode.IN_PERSON_ONLY, venueId: 'v1', sessionId: 's9' };
    expect(enrollmentCoversSession(e, inPerson)).toBe(false);
    expect(enrollmentCoversSession(e, { ...inPerson, id: 's9' })).toBe(true);
  });

  it('matches an unbooked in-person enrollment to sessions at its venue', () => {
    const e = { deliveryMode: CourseDeliveryMode.IN_PERSON_ONLY, venueId: 'v1', sessionId: null };
    expect(enrollmentCoversSession(e, inPerson)).toBe(true);
    expect(enrollmentCoversSession(e, { ...inPerson, venueId: 'v2' })).toBe(false);
    expect(enrollmentCoversSession(e, virtual)).toBe(false);
  });
});
