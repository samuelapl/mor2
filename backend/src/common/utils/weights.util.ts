import { BadRequestException } from '@nestjs/common';
import { AssessmentType, Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Total grade weight of a course's assessments. Lesson, module and final assessments without
 * questions cannot be taken, so they do not count; the creator studio uses the same rule
 * (creator/weights.ts). Session quizzes always count: their weight is fixed when the course is
 * planned, and their questions are only prepared after approval.
 */
export async function courseWeightTotal(
  db: Db,
  courseId: string,
): Promise<{ total: number; count: number }> {
  const rows = await db.assessment.findMany({
    where: { courseId },
    select: { weight: true, questions: true, type: true },
  });
  const graded = rows.filter(
    (r) =>
      r.type === AssessmentType.SESSION_ASSESSMENT ||
      (Array.isArray(r.questions) && r.questions.length > 0),
  );
  return { total: graded.reduce((sum, r) => sum + (r.weight ?? 0), 0), count: graded.length };
}

/**
 * `exact`: a graded course must total exactly 100% (submission).
 * `atMost`: the total may not pass 100% (while editing).
 */
export async function assertCourseWeightsTotal(db: Db, courseId: string, mode: 'exact' | 'atMost') {
  const { total, count } = await courseWeightTotal(db, courseId);
  if (count === 0) return;
  if (mode === 'exact' && total !== 100) {
    throw new BadRequestException(
      `Assessment weights total ${total}%. They must add up to exactly 100% before the course is submitted.`,
    );
  }
  if (mode === 'atMost' && total > 100) {
    throw new BadRequestException(`Assessment weights total ${total}%, which is more than 100%.`);
  }
}

/**
 * Lesson, module and final assessments: question points must total the assessment's weight
 * (one point per percent of the course grade), like session quizzes. A 0% (practice) assessment
 * or one without questions has no required total. Session quizzes are checked separately, as
 * their questions are prepared after approval. Mirrors the creator studio (creator/weights.ts).
 */
export async function assertAssessmentPointsMatchWeights(db: Db, courseId: string) {
  const rows = await db.assessment.findMany({
    where: { courseId, type: { not: AssessmentType.SESSION_ASSESSMENT } },
    select: { titleEn: true, weight: true, questions: true },
  });
  const problems = rows.flatMap((r) => {
    if (!r.weight || !Array.isArray(r.questions) || r.questions.length === 0) return [];
    const total = (r.questions as Array<{ points?: unknown }>).reduce(
      (sum, q) => sum + (typeof q?.points === 'number' ? q.points : 0),
      0,
    );
    return total === r.weight ? [] : [`"${r.titleEn}" has ${total} points but weighs ${r.weight}%`];
  });
  if (problems.length > 0) {
    throw new BadRequestException(
      `Question points must total each assessment's weight: ${problems.join('; ')}.`,
    );
  }
}
