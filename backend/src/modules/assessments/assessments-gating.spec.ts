import { ForbiddenException } from '@nestjs/common';
import { AssessmentType } from '@prisma/client';
import { AssessmentsService } from './assessments.service';

describe('AssessmentsService progression & final assessment gating', () => {
  let service: AssessmentsService;
  let prismaMock: any;
  let progressServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      curriculumModule: {
        findMany: jest.fn(),
      },
      lessonCompletion: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      assessment: {
        findMany: jest.fn(),
      },
      lesson: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
      liveSession: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      attendance: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    progressServiceMock = {
      getUnlockState: jest.fn(),
    };

    const policyServiceMock = {
      getProgressionMode: jest.fn().mockResolvedValue('LOCKED'),
      getTimeRatio: jest.fn().mockResolvedValue(0.5),
    };

    service = new AssessmentsService(
      prismaMock,
      {} as any,
      {} as any,
      progressServiceMock,
      policyServiceMock as any,
    );
  });

  describe('assertFinalEligible', () => {
    it('throws ForbiddenException with PREREQUISITES_INCOMPLETE when lessons are incomplete', async () => {
      prismaMock.curriculumModule.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          title: 'Module 1',
          lessons: [
            { id: 'les-1', title: 'Lesson 1', subLessons: [] },
            { id: 'les-2', title: 'Lesson 2', subLessons: [] },
          ],
        },
      ]);

      // Only les-1 is completed
      prismaMock.lessonCompletion.findMany.mockResolvedValue([{ lessonId: 'les-1' }]);

      await expect((service as any).assertFinalEligible('course-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );

      try {
        await (service as any).assertFinalEligible('course-1', 'user-1');
      } catch (err: any) {
        expect(err.getResponse()).toMatchObject({
          reason: 'PREREQUISITES_INCOMPLETE',
          incompleteCount: 1,
          incompleteLessons: [{ id: 'les-2', title: 'Lesson 2' }],
        });
      }
    });

    it('throws ForbiddenException when module assessments are not passed', async () => {
      prismaMock.curriculumModule.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          title: 'Module 1',
          lessons: [{ id: 'les-1', title: 'Lesson 1', subLessons: [] }],
        },
      ]);

      prismaMock.lessonCompletion.findMany.mockResolvedValue([{ lessonId: 'les-1' }]);

      // Module assessment exists but has 0 passed attempts
      prismaMock.assessment.findMany.mockResolvedValue([
        { id: 'mod-quiz-1', titleEn: 'Module 1 Quiz', attempts: [] },
      ]);

      await expect((service as any).assertFinalEligible('course-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );

      try {
        await (service as any).assertFinalEligible('course-1', 'user-1');
      } catch (err: any) {
        expect(err.getResponse()).toMatchObject({
          reason: 'PREREQUISITES_INCOMPLETE',
          incompleteCount: 1,
          incompleteAssessments: [{ id: 'mod-quiz-1', title: 'Module 1 Quiz' }],
        });
      }
    });

    it('passes successfully when all lessons and module assessments are completed and passed', async () => {
      prismaMock.curriculumModule.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          title: 'Module 1',
          lessons: [{ id: 'les-1', title: 'Lesson 1', subLessons: [] }],
        },
      ]);

      prismaMock.lessonCompletion.findMany.mockResolvedValue([{ lessonId: 'les-1' }]);

      prismaMock.assessment.findMany.mockResolvedValue([
        { id: 'mod-quiz-1', titleEn: 'Module 1 Quiz', attempts: [{ passed: true }] },
      ]);

      await expect(
        (service as any).assertFinalEligible('course-1', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when live sessions exist but are not completed/attended', async () => {
      prismaMock.curriculumModule.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          title: 'Module 1',
          lessons: [{ id: 'les-1', title: 'Lesson 1', subLessons: [] }],
        },
      ]);
      prismaMock.lessonCompletion.findMany.mockResolvedValue([{ lessonId: 'les-1' }]);
      prismaMock.assessment.findMany.mockResolvedValue([]);
      prismaMock.liveSession.findMany.mockResolvedValue([
        { id: 'sess-1', titleEn: 'Live Session 1', status: 'SCHEDULED' },
      ]);
      prismaMock.attendance.findMany.mockResolvedValue([]);

      await expect((service as any).assertFinalEligible('course-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );

      try {
        await (service as any).assertFinalEligible('course-1', 'user-1');
      } catch (err: any) {
        expect(err.getResponse()).toMatchObject({
          reason: 'LIVE_SESSIONS_INCOMPLETE',
          incompleteCount: 1,
        });
      }
    });
  });

  describe('assertTargetUnlocked', () => {
    it('allows taking module assessment when module is unlocked in progress state (e.g. in OPEN mode)', async () => {
      progressServiceMock.getUnlockState.mockResolvedValue({
        moduleUnlocked: new Map([['mod-1', true]]),
        lessonUnlocked: new Map([['les-1', true]]),
      });

      await expect(
        (service as any).assertTargetUnlocked(
          {
            type: AssessmentType.MODULE_ASSESSMENT,
            courseId: 'course-1',
            moduleId: 'mod-1',
            lessonId: null,
          },
          'user-1',
        ),
      ).resolves.toBeUndefined();
    });

    it('blocks module assessment when module is locked', async () => {
      progressServiceMock.getUnlockState.mockResolvedValue({
        moduleUnlocked: new Map([['mod-1', false]]),
        lessonUnlocked: new Map(),
      });

      await expect(
        (service as any).assertTargetUnlocked(
          {
            type: AssessmentType.MODULE_ASSESSMENT,
            courseId: 'course-1',
            moduleId: 'mod-1',
            lessonId: null,
          },
          'user-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows taking lesson assessment when lesson is unlocked and time requirement is met (without requiring lesson itself to already be marked completed)', async () => {
      progressServiceMock.getUnlockState.mockResolvedValue({
        moduleUnlocked: new Map([['mod-1', true]]),
        lessonUnlocked: new Map([['les-1', true]]),
      });
      prismaMock.lesson.findUnique.mockResolvedValue({ durationMinutes: 10 });
      prismaMock.lessonCompletion.findUnique.mockResolvedValue({ timeSpentSeconds: 300 });

      await expect(
        (service as any).assertTargetUnlocked(
          {
            type: AssessmentType.LESSON_ASSESSMENT,
            courseId: 'course-1',
            moduleId: 'mod-1',
            lessonId: 'les-1',
          },
          'user-1',
        ),
      ).resolves.toBeUndefined();
    });

    it('blocks lesson assessment when study time requirement is not yet met', async () => {
      progressServiceMock.getUnlockState.mockResolvedValue({
        moduleUnlocked: new Map([['mod-1', true]]),
        lessonUnlocked: new Map([['les-1', true]]),
      });
      // 20 minutes with 0.5 ratio = 600s required, only 100s spent
      prismaMock.lesson.findUnique.mockResolvedValue({ durationMinutes: 20 });
      prismaMock.lessonCompletion.findUnique.mockResolvedValue({ timeSpentSeconds: 0 });

      await expect(
        (service as any).assertTargetUnlocked(
          {
            type: AssessmentType.LESSON_ASSESSMENT,
            courseId: 'course-1',
            moduleId: 'mod-1',
            lessonId: 'les-1',
          },
          'user-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
