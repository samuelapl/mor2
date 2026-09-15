import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { CreateAssessmentDto, SubmitAssessmentDto } from './dto';
import { AuthenticatedUser } from '@common/interfaces';
import { CertificatesService } from '@modules/certificates/certificates.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { computeResult, gradeAnswers, GradableQuestion } from './grading.util';

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly certificatesService: CertificatesService,
  ) {}

  async findByCourse(courseId: string, isLearner = false) {
    const assessments = await this.prisma.assessment.findMany({
      where: { courseId },
      orderBy: { createdAt: 'asc' },
      include: { attempts: true },
    });

    if (isLearner) {
      return assessments.map((assessment) => {
        if (!assessment.questions) return assessment;
        const questions = assessment.questions as Array<Record<string, any>>;
        return {
          ...assessment,
          questions: questions.map((q) => {
            const { correctAnswer: _correctAnswer, ...rest } = q;
            return rest;
          }),
        };
      });
    }

    return assessments;
  }

  async findById(id: string, includeAnswers = false) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: { attempts: { orderBy: { createdAt: 'asc' } } },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    if (!includeAnswers && assessment.questions) {
      const questions = assessment.questions as Array<Record<string, any>>;
      assessment.questions = questions.map((q) => {
        const { correctAnswer: _correctAnswer, ...rest } = q;
        return rest;
      });
    }

    return assessment;
  }

  /** Replaces the course's assessments (delete-all + create) atomically. Only DRAFT/REJECTED courses. */
  async replaceForCourse(courseId: string, dto: CreateAssessmentDto) {
    await this.assertCourseEditable(courseId);

    await this.prisma.$transaction([
      this.prisma.assessment.deleteMany({ where: { courseId } }),
      this.prisma.assessment.create({
        data: {
          courseId,
          titleAm: dto.titleAm,
          titleEn: dto.titleEn,
          descriptionAm: dto.descriptionAm,
          descriptionEn: dto.descriptionEn,
          passingScore: dto.passingScore,
          maxAttempts: dto.maxAttempts ?? 3,
          timeLimitMinutes: dto.timeLimitMinutes,
          shuffleQuestions: dto.shuffleQuestions ?? false,
          questions: dto.questions as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    return this.findByCourse(courseId, false);
  }

  private async assertCourseEditable(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.deletedAt) {
      throw new NotFoundException('Course not found');
    }
    if (course.status !== CourseStatus.DRAFT && course.status !== CourseStatus.REJECTED) {
      throw new ForbiddenException(
        'Assessment can only be edited while the course is in DRAFT or REJECTED state',
      );
    }
  }

  async create(courseId: string, dto: CreateAssessmentDto) {
    return this.prisma.assessment.create({
      data: {
        courseId,
        titleAm: dto.titleAm,
        titleEn: dto.titleEn,
        descriptionAm: dto.descriptionAm,
        descriptionEn: dto.descriptionEn,
        passingScore: dto.passingScore,
        maxAttempts: dto.maxAttempts ?? 3,
        timeLimitMinutes: dto.timeLimitMinutes,
        shuffleQuestions: dto.shuffleQuestions ?? false,
        questions: dto.questions as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: string, dto: CreateAssessmentDto) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id } });
    if (!assessment) throw new NotFoundException('Assessment not found');

    return this.prisma.assessment.update({
      where: { id },
      data: {
        titleAm: dto.titleAm,
        titleEn: dto.titleEn,
        descriptionAm: dto.descriptionAm,
        descriptionEn: dto.descriptionEn,
        passingScore: dto.passingScore,
        maxAttempts: dto.maxAttempts ?? assessment.maxAttempts,
        timeLimitMinutes: dto.timeLimitMinutes,
        shuffleQuestions: dto.shuffleQuestions ?? assessment.shuffleQuestions,
        questions: dto.questions as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async getAttempts(assessmentId: string, user: AuthenticatedUser) {
    const isLearner = user.roles.includes('LEARNER');
    return this.prisma.assessmentAttempt.findMany({
      where: {
        assessmentId,
        ...(isLearner ? { userId: user.id } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async startAttempt(assessmentId: string, userId: string) {
    const assessment = await this.findById(assessmentId, true);

    const pending = await this.prisma.assessmentAttempt.findFirst({
      where: { assessmentId, userId, submittedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (pending) {
      return {
        attemptId: pending.id,
        attemptNumber: pending.attemptNumber,
        startedAt: pending.startedAt,
      };
    }

    const submittedCount = await this.prisma.assessmentAttempt.count({
      where: { assessmentId, userId, submittedAt: { not: null } },
    });

    if (submittedCount >= assessment.maxAttempts) {
      throw new ForbiddenException('Maximum attempts reached for this assessment');
    }

    const attempt = await this.prisma.assessmentAttempt.create({
      data: {
        assessmentId,
        userId,
        attemptNumber: submittedCount + 1,
        score: 0,
        passed: false,
        answers: {},
        startedAt: new Date(),
      },
    });

    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
    };
  }

  async submit(assessmentId: string, userId: string, dto: SubmitAssessmentDto) {
    const assessment = await this.findById(assessmentId, true);
    const questions = assessment.questions as unknown as GradableQuestion[];
    const assessmentCourseId = assessment.courseId;

    const pending = await this.prisma.assessmentAttempt.findFirst({
      where: { assessmentId, userId, submittedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!pending) {
      const submittedCount = await this.prisma.assessmentAttempt.count({
        where: { assessmentId, userId, submittedAt: { not: null } },
      });
      if (submittedCount >= assessment.maxAttempts) {
        throw new ForbiddenException('Maximum attempts reached for this assessment');
      }
    }

    const gradedAnswers = gradeAnswers(questions, dto.answers);
    const { score, passed, correctCount, totalQuestions } = computeResult(
      gradedAnswers,
      questions.length,
      assessment.passingScore,
    );
    const now = new Date();
    const startedAt = pending?.startedAt ?? new Date(now.getTime() - 60000);
    const timeSpentSeconds = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));

    let attempt;

    if (pending) {
      attempt = await this.prisma.assessmentAttempt.update({
        where: { id: pending.id },
        data: {
          score,
          passed,
          answers: gradedAnswers as unknown as Prisma.InputJsonValue,
          submittedAt: now,
          timeSpentSeconds,
        },
      });
    } else {
      const submittedCount = await this.prisma.assessmentAttempt.count({
        where: { assessmentId, userId, submittedAt: { not: null } },
      });
      attempt = await this.prisma.assessmentAttempt.create({
        data: {
          assessmentId,
          userId,
          attemptNumber: submittedCount + 1,
          score,
          passed,
          answers: gradedAnswers as unknown as Prisma.InputJsonValue,
          startedAt,
          submittedAt: now,
          timeSpentSeconds,
        },
      });
    }

    try {
      await this.notificationsService.send(
        userId,
        NotificationType.ASSESSMENT_GRADED,
        {
          en: passed ? 'Quiz passed' : 'Quiz result',
          am: passed ? 'ፈተና አልፈዋል' : 'የፈተና ውጤት',
        },
        {
          en: `You scored ${score}% on "${assessment.titleEn}" and ${passed ? 'passed' : 'did not pass'}.`,
          am: `በ"${assessment.titleAm}" ${score}% አስመዝግበዋል እና ${passed ? 'አልፈዋል' : 'አላለፉም'}.`,
        },
        { assessmentId, score, passed },
      );
    } catch {
      // notification failure is non-fatal
    }

    if (passed) {
      try {
        await this.certificatesService.maybeIssueForCompletion(userId, assessmentCourseId);
      } catch {
        // certificate issuance is opportunistic and non-fatal
      }
    }

    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      score,
      passed,
      correctCount,
      totalQuestions: questions.length,
    };
  }

  async gradingSummary(assessmentId: string) {
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { assessmentId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: [{ userId: 'asc' }, { attemptNumber: 'desc' }],
    });

    return attempts;
  }
}
