import { AssessmentType, EnrollmentStatus } from '@prisma/client';
import { ProgressService } from '@modules/progress/progress.service';

describe('Assessment Weighting & Global Pass Mark Evaluation', () => {
  let progressService: ProgressService;
  let prismaMock: any;
  let policyServiceMock: any;
  let enrollmentsServiceMock: any;
  let certificatesServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      curriculumModule: {
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ courseId: 'course-1', durationMinutes: 10 }),
      },
      lesson: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      lessonCompletion: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      moduleCompletion: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      assessment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      assessmentAttempt: {
        findFirst: jest.fn(),
      },
      enrollment: {
        findUnique: jest.fn(),
      },
    };

    policyServiceMock = {
      getTimeRatio: jest.fn().mockResolvedValue(0.8),
      getProgressionMode: jest.fn().mockResolvedValue('FREE'),
      getPassingScorePercent: jest.fn().mockResolvedValue(50),
    };

    enrollmentsServiceMock = {
      markCompleted: jest.fn().mockResolvedValue(undefined),
    };

    certificatesServiceMock = {
      maybeIssueForCompletion: jest.fn().mockResolvedValue(undefined),
    };

    progressService = new ProgressService(
      prismaMock,
      enrollmentsServiceMock,
      certificatesServiceMock,
      policyServiceMock,
    );
  });

  describe('Weighted Grade Calculation in getCourseProgress', () => {
    it('accurately calculates weighted scores matching the user example', async () => {
      // User example:
      // Module 1 Quiz: Scored 80% * 20% weight = 16%
      // Module 2 Quiz: Scored 90% * 20% weight = 18%
      // Final Assessment: Scored 75% * 60% weight = 45%
      // Total Course Grade = 16% + 18% + 45% = 79%
      const assessments = [
        {
          id: 'quiz-1',
          titleEn: 'Module 1 Quiz',
          titleAm: null,
          type: AssessmentType.MODULE_ASSESSMENT,
          moduleId: 'mod-1',
          lessonId: null,
          weight: 20,
          passingScore: 50,
          attempts: [{ score: 80, passed: true }],
        },
        {
          id: 'quiz-2',
          titleEn: 'Module 2 Quiz',
          titleAm: null,
          type: AssessmentType.MODULE_ASSESSMENT,
          moduleId: 'mod-2',
          lessonId: null,
          weight: 20,
          passingScore: 50,
          attempts: [{ score: 90, passed: true }],
        },
        {
          id: 'quiz-3',
          titleEn: 'Final Assessment',
          titleAm: null,
          type: AssessmentType.FINAL_ASSESSMENT,
          moduleId: null,
          lessonId: null,
          weight: 60,
          passingScore: 50,
          attempts: [{ score: 75, passed: true }],
        },
      ];

      prismaMock.curriculumModule.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          title: 'Module 1',
          order: 1,
          durationMinutes: 10,
          lessons: [
            {
              id: 'les-1',
              title: 'Lesson 1',
              order: 1,
              durationMinutes: 10,
              completions: [{ completed: true, timeSpentSeconds: 600 }],
            },
          ],
          completions: [{ completed: true }],
        },
        {
          id: 'mod-2',
          title: 'Module 2',
          order: 2,
          durationMinutes: 10,
          lessons: [
            {
              id: 'les-2',
              title: 'Lesson 2',
              order: 2,
              durationMinutes: 10,
              completions: [{ completed: true, timeSpentSeconds: 600 }],
            },
          ],
          completions: [{ completed: true }],
        },
      ]);
      prismaMock.lessonCompletion.findMany.mockResolvedValue([]);
      prismaMock.moduleCompletion.findMany.mockResolvedValue([]);
      prismaMock.assessment.findMany.mockResolvedValue(assessments);

      const progress = await progressService.getCourseProgress('course-1', 'user-1');

      expect(progress.courseCompletion.totalCourseGrade).toBe(79);
      expect(progress.courseCompletion.passingScorePercent).toBe(50);
      expect(progress.courseCompletion.allAssessmentsPassed).toBe(true);
      expect(progress.courseCompletion.gradeSatisfied).toBe(true);
      expect(progress.courseCompletion.certificateEligible).toBe(true);

      const breakdown = progress.courseCompletion.assessmentBreakdown;
      expect(breakdown[0].earnedPoints).toBe(16);
      expect(breakdown[1].earnedPoints).toBe(18);
      expect(breakdown[2].earnedPoints).toBe(45);
    });

    it('falls back to equal-split when assessments have 0 weight allocated', async () => {
      // 2 assessments with weight 0 -> 50% each
      const assessments = [
        {
          id: 'quiz-1',
          titleEn: 'Quiz 1',
          titleAm: null,
          type: AssessmentType.LESSON_ASSESSMENT,
          moduleId: null,
          lessonId: 'les-1',
          weight: 0,
          passingScore: 50,
          attempts: [{ score: 80, passed: true }],
        },
        {
          id: 'quiz-2',
          titleEn: 'Quiz 2',
          titleAm: null,
          type: AssessmentType.LESSON_ASSESSMENT,
          moduleId: null,
          lessonId: 'les-2',
          weight: 0,
          passingScore: 50,
          attempts: [{ score: 60, passed: true }],
        },
      ];

      prismaMock.curriculumModule.findMany.mockResolvedValue([]);
      prismaMock.lessonCompletion.findMany.mockResolvedValue([]);
      prismaMock.moduleCompletion.findMany.mockResolvedValue([]);
      prismaMock.assessment.findMany.mockResolvedValue(assessments);

      const progress = await progressService.getCourseProgress('course-1', 'user-1');
      // 80 * 0.5 = 40; 60 * 0.5 = 30 -> total 70
      expect(progress.courseCompletion.totalCourseGrade).toBe(70);
    });
  });

  describe('maybeCompleteCourse Certificate Eligibility', () => {
    it('does not complete course if an individual assessment is below pass mark', async () => {
      prismaMock.curriculumModule.findMany.mockResolvedValue([
        { id: 'mod-1', lessons: [{ id: 'les-1' }] },
      ]);
      prismaMock.lessonCompletion.count.mockResolvedValue(1);

      prismaMock.assessment.findMany.mockResolvedValue([
        {
          id: 'quiz-1',
          weight: 50,
          passingScore: 50,
          attempts: [{ score: 40, passed: false }],
        },
        {
          id: 'quiz-2',
          weight: 50,
          passingScore: 50,
          attempts: [{ score: 90, passed: true }],
        },
      ]);

      await progressService.maybeCompleteCourse('user-1', 'course-1');

      expect(enrollmentsServiceMock.markCompleted).not.toHaveBeenCalled();
      expect(certificatesServiceMock.maybeIssueForCompletion).not.toHaveBeenCalled();
    });

    it('does not complete course if total weighted grade is below global pass mark even if assessments passed individually', async () => {
      policyServiceMock.getPassingScorePercent.mockResolvedValue(60); // Global pass mark 60%

      prismaMock.curriculumModule.findMany.mockResolvedValue([
        { id: 'mod-1', lessons: [{ id: 'les-1' }] },
      ]);
      prismaMock.lessonCompletion.count.mockResolvedValue(1);

      // Quiz 1 has explicit low pass mark of 50%, scored 52% (passed), weight 80% -> 41.6 pts
      // Quiz 2 scored 65% (passed), weight 20% -> 13 pts
      // Total grade = 55% (< 60% global pass mark)
      prismaMock.assessment.findMany.mockResolvedValue([
        {
          id: 'quiz-1',
          weight: 80,
          passingScore: 50,
          attempts: [{ score: 52, passed: true }],
        },
        {
          id: 'quiz-2',
          weight: 20,
          passingScore: 50,
          attempts: [{ score: 65, passed: true }],
        },
      ]);

      await progressService.maybeCompleteCourse('user-1', 'course-1');

      expect(enrollmentsServiceMock.markCompleted).not.toHaveBeenCalled();
    });

    it('completes course and issues certificate when all assessments and cumulative grade meet pass mark', async () => {
      policyServiceMock.getPassingScorePercent.mockResolvedValue(50);

      prismaMock.curriculumModule.findMany.mockResolvedValue([
        { id: 'mod-1', lessons: [{ id: 'les-1' }] },
      ]);
      prismaMock.lessonCompletion.count.mockResolvedValue(1);

      prismaMock.assessment.findMany.mockResolvedValue([
        {
          id: 'quiz-1',
          weight: 30,
          passingScore: 50,
          attempts: [{ score: 80, passed: true }],
        },
        {
          id: 'quiz-2',
          weight: 70,
          passingScore: 50,
          attempts: [{ score: 70, passed: true }],
        },
      ]);

      prismaMock.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment-1',
        status: EnrollmentStatus.ACTIVE,
      });

      await progressService.maybeCompleteCourse('user-1', 'course-1');

      expect(enrollmentsServiceMock.markCompleted).toHaveBeenCalledWith('enrollment-1');
      expect(certificatesServiceMock.maybeIssueForCompletion).toHaveBeenCalledWith(
        'user-1',
        'course-1',
      );
    });
  });
});
