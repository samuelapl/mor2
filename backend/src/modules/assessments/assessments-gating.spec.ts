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
      },
      assessment: {
        findMany: jest.fn(),
      },
    };

    progressServiceMock = {
      getUnlockState: jest.fn(),
    };

    service = new AssessmentsService(
      prismaMock,
      {} as any,
      {} as any,
      progressServiceMock,
      {} as any,
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
      prismaMock.lessonCompletion.findMany.mockResolvedValue([
        { lessonId: 'les-1' },
      ]);

      await expect(
        (service as any).assertFinalEligible('course-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);

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

      prismaMock.lessonCompletion.findMany.mockResolvedValue([
        { lessonId: 'les-1' },
      ]);

      // Module assessment exists but has 0 passed attempts
      prismaMock.assessment.findMany.mockResolvedValue([
        { id: 'mod-quiz-1', titleEn: 'Module 1 Quiz', attempts: [] },
      ]);

      await expect(
        (service as any).assertFinalEligible('course-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);

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

      prismaMock.lessonCompletion.findMany.mockResolvedValue([
        { lessonId: 'les-1' },
      ]);

      prismaMock.assessment.findMany.mockResolvedValue([
        { id: 'mod-quiz-1', titleEn: 'Module 1 Quiz', attempts: [{ passed: true }] },
      ]);

      await expect(
        (service as any).assertFinalEligible('course-1', 'user-1'),
      ).resolves.toBeUndefined();
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
  });
});

