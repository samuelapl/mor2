import { AttendanceStatus, CheckInMethod } from '@prisma/client';
import { AttendanceService } from './attendance.service';

describe('AttendanceService', () => {
  let prisma: any;
  let service: AttendanceService;

  beforeEach(() => {
    prisma = {
      liveSession: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 's1', courseId: 'c1', status: 'LIVE', durationMinutes: 60 }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      enrollment: { findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }) },
      attendance: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn((args) => Promise.resolve(args.create)),
        update: jest.fn((args) => Promise.resolve({ id: 'att1', ...args.data })),
      },
      attendanceLog: { create: jest.fn() },
      systemSetting: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    service = new AttendanceService(prisma, {} as any, { emit: jest.fn() } as any);
  });

  describe('checkin', () => {
    it('does not mark a learner present just for entering the virtual room', async () => {
      const record = await service.checkin('s1', 'u1', CheckInMethod.VIRTUAL);
      expect(record.status).toBe(AttendanceStatus.ABSENT);
      expect(record.checkInMethod).toBe(CheckInMethod.VIRTUAL);
    });

    it('keeps the status earned so far when a learner re-enters the virtual room', async () => {
      prisma.attendance.findUnique.mockResolvedValue({
        status: AttendanceStatus.ABSENT,
        checkInMethod: null,
        joinedAt: new Date('2026-10-12T09:00:00Z'),
      });
      await service.checkin('s1', 'u1', CheckInMethod.VIRTUAL);
      const { update } = prisma.attendance.upsert.mock.calls[0][0];
      expect(update).not.toHaveProperty('status');
    });

    it('still marks present on a QR check-in at the venue', async () => {
      const record = await service.checkin('s1', 'u1', CheckInMethod.QR);
      expect(record.status).toBe(AttendanceStatus.PRESENT);
    });

    it('finds session by 6-digit PIN code when checking in', async () => {
      prisma.liveSession.findUnique.mockResolvedValue(null);
      prisma.liveSession.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'long-session-id-123456',
          courseId: 'c1',
          status: 'SCHEDULED',
          durationMinutes: 60,
        });
      const record = await service.checkin('123456', 'u1', CheckInMethod.QR);
      expect(record.status).toBe(AttendanceStatus.PRESENT);
      expect(prisma.liveSession.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { endsWith: '123456', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  describe('recordHeartbeat', () => {
    it('stays absent below the threshold and becomes present once it is reached', async () => {
      // 60-minute session, 60% threshold: 35 min is short, 36 min is enough.
      prisma.attendance.findUnique.mockResolvedValue({
        status: AttendanceStatus.ABSENT,
        activeSeconds: 35 * 60 - 15,
      });
      expect((await service.recordHeartbeat('s1', 'u1', 15)).status).toBe(AttendanceStatus.ABSENT);

      prisma.attendance.findUnique.mockResolvedValue({
        status: AttendanceStatus.ABSENT,
        activeSeconds: 36 * 60 - 15,
      });
      prisma.attendance.upsert.mockImplementation((args: any) => Promise.resolve(args.update));
      expect((await service.recordHeartbeat('s1', 'u1', 15)).status).toBe(AttendanceStatus.PRESENT);
    });
  });

  describe('handleParticipantLeft (LiveKit webhook)', () => {
    it('logs the leave without adding time the heartbeats already counted', async () => {
      prisma.attendance.findUnique.mockResolvedValue({
        id: 'att1',
        status: AttendanceStatus.ABSENT,
        activeSeconds: 600,
        percentage: 17,
      });
      await service.handleParticipantLeft('s1', 'u1', 1800);
      const { data } = prisma.attendance.update.mock.calls[0][0];
      expect(data).toEqual({ leftAt: expect.any(Date) });
      expect(prisma.attendanceLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ eventType: 'LEAVE', durationSeconds: 1800 }),
      });
    });
  });
});
