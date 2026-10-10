import { CourseStatus } from '@prisma/client';
import { CurriculumService } from './curriculum.service';

describe('CurriculumService.replaceAll durations', () => {
  let tx: any;
  let service: CurriculumService;

  beforeEach(() => {
    let moduleSeq = 0;
    let lessonSeq = 0;
    tx = {
      curriculumModule: {
        deleteMany: jest.fn(),
        create: jest.fn(async ({ data }: any) => ({ id: `m${++moduleSeq}`, ...data })),
        update: jest.fn(),
      },
      lesson: { create: jest.fn(async ({ data }: any) => ({ id: `l${++lessonSeq}`, ...data })) },
      attachment: { deleteMany: jest.fn(), create: jest.fn() },
      course: { update: jest.fn() },
    };
    const prisma: any = {
      course: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', status: CourseStatus.DRAFT, deletedAt: null }) },
      curriculumModule: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: (fn: (t: any) => Promise<unknown>) => fn(tx),
    };
    service = new CurriculumService(prisma, {} as any);
  });

  const lesson = (durationMinutes: number, subs: number[] = []) => ({
    title: 'Lesson',
    contentType: 'DOCUMENT',
    durationMinutes,
    subLessons: subs.map((d) => ({ title: 'Sub', contentType: 'DOCUMENT', durationMinutes: d })),
  });

  it('sums lessons and sub-lessons into module minutes and course hours', async () => {
    await service.replaceAll('c1', {
      modules: [
        // 15 + (10 + 5) + 20 = 50 — overrides the 60 the client sent
        { title: 'M1', durationMinutes: 60, lessons: [lesson(15, [10, 5]), lesson(20)] },
        // 45 + 50 = 95
        { title: 'M2', lessons: [lesson(45), lesson(50)] },
      ],
    } as any);

    expect(tx.curriculumModule.update).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { durationMinutes: 50 } });
    expect(tx.curriculumModule.update).toHaveBeenCalledWith({ where: { id: 'm2' }, data: { durationMinutes: 95 } });
    // 145 minutes, stored unrounded so the UI can recover the exact minutes
    expect(tx.course.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { estimatedHours: 145 / 60 } });
  });

  it('keeps the sent module duration when its lessons have no time, and clears hours for an empty course', async () => {
    await service.replaceAll('c1', { modules: [{ title: 'M1', durationMinutes: 30, lessons: [lesson(0)] }] } as any);
    expect(tx.curriculumModule.update).not.toHaveBeenCalled();
    expect(tx.course.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { estimatedHours: 0.5 } });

    tx.course.update.mockClear();
    await service.replaceAll('c1', { modules: [{ title: 'M1', lessons: [lesson(0)] }] } as any);
    expect(tx.course.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { estimatedHours: null } });
  });
});
