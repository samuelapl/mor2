import { BadRequestException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { InPersonSessionsService } from './in-person-sessions.service';

describe('InPersonSessionsService — Round Scheduling & Grouping', () => {
  function makeService(overrides: Record<string, any> = {}) {
    const prisma: any = {
      venue: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'venue-1',
          name: 'Training Hall A',
          branch: 'Addis Ababa HQ',
          capacity: 35,
          isActive: true,
        }),
      },
      course: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'course-1',
          title: 'VAT102',
          code: 'VAT102',
          deletedAt: null,
          sessionPlans: [
            {
              id: 'plan-1',
              order: 0,
              titleEn: 'Classroom Session 1: VAT Declaration Lab',
              descriptionEn: 'Lab 1',
              objectivesEn: 'Obj 1',
              trainerId: 'trainer-1',
              liveSession: null,
              assessments: [],
            },
            {
              id: 'plan-2',
              order: 1,
              titleEn: 'Classroom Session 2: Field Audit Simulation',
              descriptionEn: 'Lab 2',
              objectivesEn: 'Obj 2',
              trainerId: 'trainer-1',
              liveSession: null,
              assessments: [],
            },
          ],
        }),
      },
      liveSession: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({
            id: `session-${data.plannedOrder}`,
            ...data,
            venue: {
              id: 'venue-1',
              name: 'Training Hall A',
              branch: 'Addis Ababa HQ',
              capacity: 35,
            },
            trainer: { id: 'trainer-1', firstName: 'Samuel', lastName: 'Tiruneh', email: 's@mor.et' },
            course: { id: 'course-1', title: 'VAT102', code: 'VAT102' },
          }),
        ),
      },
      enrollment: {
        count: jest.fn().mockResolvedValue(5),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn((cb: any) => cb(prisma)),
      ...overrides,
    };
    return { service: new InPersonSessionsService(prisma), prisma };
  }

  it('parses round numbers from rescheduleStatus tags', () => {
    const { service } = makeService();
    expect(service.parseRoundNumber(null)).toBe(1);
    expect(service.parseRoundNumber('NONE')).toBe(1);
    expect(service.parseRoundNumber('ROUND_1')).toBe(1);
    expect(service.parseRoundNumber('ROUND_2')).toBe(2);
    expect(service.parseRoundNumber('ROUND_5')).toBe(5);
  });

  it('schedules Round 1 with multiple planned classroom sessions and links sessionPlanId', async () => {
    const { service, prisma } = makeService();

    const result = await service.scheduleRound({
      courseId: 'course-1',
      venueId: 'venue-1',
      trainerId: 'trainer-1',
      sessions: [
        {
          sessionPlanId: 'plan-1',
          scheduledAt: '2026-10-15T09:00:00.000Z',
          durationMinutes: 90,
        },
        {
          sessionPlanId: 'plan-2',
          scheduledAt: '2026-10-16T09:00:00.000Z',
          durationMinutes: 90,
        },
      ],
    });

    expect(result.roundNumber).toBe(1);
    expect(result.count).toBe(2);
    expect(prisma.liveSession.create).toHaveBeenCalledTimes(2);
    expect(prisma.liveSession.create.mock.calls[0][0].data).toMatchObject({
      sessionPlanId: 'plan-1',
      originalPlanId: 'plan-1',
      rescheduleStatus: 'ROUND_1',
    });
    expect(prisma.liveSession.create.mock.calls[1][0].data).toMatchObject({
      sessionPlanId: 'plan-2',
      originalPlanId: 'plan-2',
      rescheduleStatus: 'ROUND_1',
    });
  });

  it('auto-increments to Round 2 when Round 1 already exists', async () => {
    const { service, prisma } = makeService();
    // First call in scheduleRound checks existing in-person sessions
    prisma.liveSession.findMany
      .mockResolvedValueOnce([{ rescheduleStatus: 'ROUND_1' }]) // existing check
      .mockResolvedValue([]); // conflict checks

    const result = await service.scheduleRound({
      courseId: 'course-1',
      venueId: 'venue-1',
      sessions: [
        {
          sessionPlanId: 'plan-1',
          scheduledAt: '2026-10-22T09:00:00.000Z',
          durationMinutes: 90,
        },
      ],
    });

    expect(result.roundNumber).toBe(2);
    expect(prisma.liveSession.create.mock.calls[0][0].data.rescheduleStatus).toBe('ROUND_2');
  });

  it('groups course sessions into numbered Rounds in listCourseRounds', async () => {
    const { service, prisma } = makeService();
    prisma.liveSession.findMany.mockResolvedValue([
      {
        id: 's1',
        titleEn: 'Round 1 · Session 1',
        titleAm: 'Round 1 · Session 1',
        descriptionEn: null,
        objectivesEn: null,
        scheduledAt: new Date('2026-10-15T09:00:00.000Z'),
        durationMinutes: 90,
        status: SessionStatus.SCHEDULED,
        sessionPlanId: 'plan-1',
        originalPlanId: 'plan-1',
        plannedOrder: 0,
        rescheduleStatus: 'ROUND_1',
        venueId: 'venue-1',
        venue: { id: 'venue-1', name: 'Hall A', branch: 'HQ', capacity: 30 },
        trainer: { id: 't1', firstName: 'Samuel', lastName: 'Tiruneh' },
        _count: { enrollments: 10 },
      },
      {
        id: 's2',
        titleEn: 'Round 1 · Session 2',
        titleAm: 'Round 1 · Session 2',
        descriptionEn: null,
        objectivesEn: null,
        scheduledAt: new Date('2026-10-16T09:00:00.000Z'),
        durationMinutes: 90,
        status: SessionStatus.SCHEDULED,
        sessionPlanId: 'plan-2',
        originalPlanId: 'plan-2',
        plannedOrder: 1,
        rescheduleStatus: 'ROUND_1',
        venueId: 'venue-1',
        venue: { id: 'venue-1', name: 'Hall A', branch: 'HQ', capacity: 30 },
        trainer: { id: 't1', firstName: 'Samuel', lastName: 'Tiruneh' },
        _count: { enrollments: 10 },
      },
    ]);

    const rounds = await service.listCourseRounds('course-1');
    expect(rounds).toHaveLength(1);
    expect(rounds[0].roundNumber).toBe(1);
    expect(rounds[0].roundLabel).toBe('Round 1');
    expect(rounds[0].sessions).toHaveLength(2);
    expect(rounds[0].seatsLeft).toBe(20);
  });

  it('rejects empty session slots when scheduling a round', async () => {
    const { service } = makeService();
    await expect(
      service.scheduleRound({
        courseId: 'course-1',
        venueId: 'venue-1',
        sessions: [],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

