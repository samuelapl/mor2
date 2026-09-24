/**
 * Testing aid: moves each choice question's correct option to the front (index 0), so an
 * assessment can be passed by always picking the first choice. Used by the seeds, and run
 * on its own (`npm run questions:correct-first`) to rewrite assessments already in the DB.
 */
import { Prisma, PrismaClient } from '@prisma/client';

interface ChoiceQuestion {
  options?: unknown;
  correctAnswer?: unknown;
}

/** Returns the question with its correct option first; non-choice questions are unchanged. */
export function correctAnswerFirst<T extends ChoiceQuestion>(question: T): T {
  const { options, correctAnswer } = question;
  if (!Array.isArray(options) || options.length === 0) return question;

  const numeric = typeof correctAnswer === 'string' ? Number(correctAnswer) : correctAnswer;
  if (typeof numeric !== 'number' || !Number.isInteger(numeric)) return question;
  if (numeric <= 0 || numeric >= options.length) return question;

  const reordered = [options[numeric], ...options.filter((_, index) => index !== numeric)];
  // Keep the stored type: assessments use numbers, the question bank uses strings.
  const firstIndex = typeof correctAnswer === 'string' ? '0' : 0;
  return { ...question, options: reordered, correctAnswer: firstIndex };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const assessments = await prisma.assessment.findMany({
      select: { id: true, questions: true },
    });
    let assessmentsUpdated = 0;
    for (const assessment of assessments) {
      if (!Array.isArray(assessment.questions)) continue;
      const before = JSON.stringify(assessment.questions);
      const questions = (assessment.questions as unknown as ChoiceQuestion[]).map(correctAnswerFirst);
      if (JSON.stringify(questions) === before) continue;
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: { questions: questions as unknown as Prisma.InputJsonValue },
      });
      assessmentsUpdated++;
    }

    const bankQuestions = await prisma.questionBankQuestion.findMany({
      where: { courseId: { not: null } },
      select: { id: true, options: true, correctAnswer: true },
    });
    let bankUpdated = 0;
    for (const bankQuestion of bankQuestions) {
      const next = correctAnswerFirst(bankQuestion);
      if (next === bankQuestion) continue;
      await prisma.questionBankQuestion.update({
        where: { id: bankQuestion.id },
        data: {
          options: next.options as Prisma.InputJsonValue,
          correctAnswer: next.correctAnswer as string,
        },
      });
      bankUpdated++;
    }

    console.log(
      `✅ Correct answer moved to the first choice: ${assessmentsUpdated}/${assessments.length} assessments, ` +
        `${bankUpdated}/${bankQuestions.length} course question-bank questions.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
