/**
 * One-off data migration: live-session quizzes (SESSION_ASSESSMENT) become formative.
 *
 * For every course whose session quizzes still carry a weight or a pass mark:
 * 1. Session quizzes get weight 0 and pass mark 0, and their recorded attempts `passed = false`.
 * 2. The weight they held moves to the course's final assessment (or its heaviest graded
 *    assessment when it has no final one). That assessment's question points are scaled to its
 *    new weight, so "points total = weight" (assertAssessmentPointsMatchWeights) still holds.
 * 3. Courses whose graded assessments still don't total 100% are reported for a manual fix.
 * 4. Learners of affected courses get a completion check, so anyone who was only held back by a
 *    session quiz completes the course and receives the certificate. Issued certificates stay.
 *
 * Safe to run repeatedly: a second run finds nothing to move and only re-runs the checks.
 *
 * Run:  npm run session-quizzes:formative            (apply)
 *       npm run session-quizzes:formative -- --dry-run   (report only, change nothing)
 */
import 'dotenv/config';
import { AssessmentType, EnrollmentStatus, Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

type KeyedQuestion = { points?: number } & Record<string, unknown>;

/** Scales question points to total `target`; any rounding difference goes on the last question. */
function scalePoints(points: number[], target: number): number[] {
  if (points.length === 0) return [];
  const current = points.reduce((sum, p) => sum + p, 0);
  const scaled =
    current > 0
      ? points.map((p) => Math.round((p * target) / current))
      : points.map(
          (_, i) => Math.floor(target / points.length) + (i < target % points.length ? 1 : 0),
        );
  const diff = target - scaled.reduce((sum, p) => sum + p, 0);
  scaled[scaled.length - 1] = Math.max(0, scaled[scaled.length - 1]! + diff);
  return scaled;
}

async function main() {
  const courses = await prisma.course.findMany({
    where: {
      deletedAt: null,
      assessments: {
        some: {
          type: AssessmentType.SESSION_ASSESSMENT,
          OR: [{ weight: { gt: 0 } }, { passingScore: { gt: 0 } }],
        },
      },
    },
    select: { id: true, code: true, title: true },
    orderBy: { code: 'asc' },
  });
  console.log(
    `${courses.length} course(s) with weighted or pass-marked session quizzes.${dryRun ? ' (dry run)' : ''}`,
  );

  const affected: string[] = [];
  const needsManualFix: string[] = [];

  for (const course of courses) {
    const assessments = await prisma.assessment.findMany({
      where: { courseId: course.id },
      select: {
        id: true,
        type: true,
        titleEn: true,
        weight: true,
        questions: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    const sessionQuizzes = assessments.filter((a) => a.type === AssessmentType.SESSION_ASSESSMENT);
    const graded = assessments.filter(
      (a) =>
        a.type !== AssessmentType.SESSION_ASSESSMENT &&
        Array.isArray(a.questions) &&
        a.questions.length > 0,
    );
    const freed = sessionQuizzes.reduce((sum, a) => sum + (a.weight || 0), 0);
    const target =
      graded.find((a) => a.type === AssessmentType.FINAL_ASSESSMENT) ??
      [...graded].sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];

    const label = `${course.code} "${course.title}"`;
    if (freed > 0 && !target) {
      console.warn(`  ! ${label}: ${freed}% freed but no graded assessment to take it.`);
    }
    const gradedTotal = graded.reduce((sum, a) => sum + (a.weight || 0), 0) + (target ? freed : 0);
    console.log(
      `  ${label}: ${sessionQuizzes.length} session quiz(zes), ${freed}% freed` +
        (target && freed > 0
          ? ` → "${target.titleEn}" (${target.weight}% → ${target.weight + freed}%)`
          : '') +
        `; graded total ${gradedTotal}%`,
    );
    if (graded.length > 0 && gradedTotal !== 100)
      needsManualFix.push(`${label} totals ${gradedTotal}%`);
    affected.push(course.id);
    if (dryRun) continue;

    await prisma.$transaction(async (tx) => {
      const ids = sessionQuizzes.map((a) => a.id);
      await tx.assessment.updateMany({
        where: { id: { in: ids } },
        data: { weight: 0, passingScore: 0 },
      });
      await tx.assessmentAttempt.updateMany({
        where: { assessmentId: { in: ids } },
        data: { passed: false },
      });

      if (target && freed > 0) {
        const newWeight = target.weight + freed;
        const questions = (target.questions as KeyedQuestion[]).slice();
        const points = scalePoints(
          questions.map((q) => (typeof q.points === 'number' ? q.points : 0)),
          newWeight,
        );
        await tx.assessment.update({
          where: { id: target.id },
          data: {
            weight: newWeight,
            questions: questions.map((q, i) => ({
              ...q,
              points: points[i],
            })) as Prisma.InputJsonValue,
          },
        });
      }
    });
  }

  if (needsManualFix.length > 0) {
    console.warn(`\nFix these courses' weights by hand (graded assessments must total 100%):`);
    for (const line of needsManualFix) console.warn(`  - ${line}`);
  }

  if (dryRun || affected.length === 0) return;

  // Completion needs the full app (enrollment, certificate and notification services).
  // Imported lazily so a dry run doesn't boot the app.
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../src/app.module');
  const { ProgressService } = await import('../src/modules/progress/progress.service');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const progress = app.get(ProgressService);
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: { in: affected }, status: EnrollmentStatus.ACTIVE },
      select: { userId: true, courseId: true },
    });
    console.log(`\nRe-checking completion for ${enrollments.length} active enrollment(s)...`);
    let failed = 0;
    for (const e of enrollments) {
      try {
        await progress.maybeCompleteCourse(e.userId, e.courseId);
      } catch (err) {
        failed++;
        console.warn(`  ! ${e.userId} in ${e.courseId}: ${(err as Error).message}`);
      }
    }
    console.log(`Done. ${failed} check(s) failed.`);
  } finally {
    await app.close();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
