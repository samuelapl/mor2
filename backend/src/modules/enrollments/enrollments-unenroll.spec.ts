import { EnrollmentsService } from './enrollments.service';

describe('EnrollmentsService.unenroll', () => {
  const count = (n: number) => jest.fn().mockReturnValue({ count: n });
  let prisma: any;
  let audit: any;
  let service: EnrollmentsService;

  beforeEach(() => {
    prisma = {
      enrollment: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'e1', userId: 'u1', courseId: 'c1', status: 'ACTIVE' }),
        delete: jest.fn().mockReturnValue({ id: 'e1' }),
      },
      lessonCompletion: { deleteMany: count(2) },
      moduleCompletion: { deleteMany: count(1) },
      assessmentAttempt: { deleteMany: count(3) },
      certificate: { deleteMany: count(0) },
      attendanceLog: { deleteMany: count(20) },
      attendance: { deleteMany: count(2) },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    audit = { record: jest.fn() };
    service = new EnrollmentsService(prisma, {} as any, {} as any, audit);
  });

  it("clears the learner's live session attendance in the course, so re-enrolling starts unattended", async () => {
    const result = await service.unenroll('e1', 'admin');

    expect(prisma.attendance.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', session: { courseId: 'c1' } },
    });
    expect(prisma.attendanceLog.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', session: { courseId: 'c1' } },
    });
    expect(result.removed).toMatchObject({
      sessionAttendance: 2,
      sessionActivityLogs: 20,
      assessmentAttempts: 3,
    });
  });
});
