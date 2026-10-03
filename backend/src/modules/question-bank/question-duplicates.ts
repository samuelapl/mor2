import { Prisma, QuestionType } from '@prisma/client';

/**
 * Duplicate detection for the question bank.
 *
 * Normalization is done in SQL (see migration 20261003090000): every row has a
 * generated `content_hash` (exact fingerprint) and `similarity_text` (compared
 * with pg_trgm). Candidates are normalized with the same SQL functions, so the
 * two sides can never drift apart.
 *
 * Scope: a course question is compared with every question of that course
 * (course-general, module, lesson and sub-lesson level alike) plus the reusable
 * questions, since all of them show up together in the course's bank. A
 * reusable question shows up in every course, so it is compared with all.
 */

/** Trigram similarity at or above which an existing question is reported. */
export const SIMILAR_THRESHOLD = 0.55;
/** Similarity at or above which a match is reported as a likely duplicate. */
export const LIKELY_DUPLICATE_THRESHOLD = 0.75;
const MAX_MATCHES = 5;

export type DuplicateSeverity = 'EXACT' | 'LIKELY' | 'SIMILAR';

export type QuestionLevel = 'GLOBAL' | 'COURSE' | 'MODULE' | 'LESSON' | 'SUB_LESSON';

export interface DuplicateCandidate {
  type: QuestionType;
  question: string;
  options: string[];
  courseId?: string | null;
}

export interface SimilarQuestionMatch {
  id: string;
  question: string;
  type: QuestionType;
  /** Trigram similarity, 0–1. */
  score: number;
  severity: DuplicateSeverity;
  level: QuestionLevel;
  location: {
    courseTitle: string | null;
    moduleTitle: string | null;
    lessonTitle: string | null;
    subLessonTitle: string | null;
  };
}

export interface BatchMatch {
  /** Index of the earlier question in the same batch. */
  index: number;
  score: number;
  severity: DuplicateSeverity;
}

type Db = Prisma.TransactionClient;

interface MatchRow {
  id: string;
  question: string;
  type: QuestionType;
  course_id: string | null;
  module_id: string | null;
  lesson_id: string | null;
  sub_lesson_id: string | null;
  course_title: string | null;
  module_title: string | null;
  lesson_title: string | null;
  sub_lesson_title: string | null;
  exact: boolean;
  score: number;
}

const severityOf = (exact: boolean, score: number): DuplicateSeverity =>
  exact ? 'EXACT' : score >= LIKELY_DUPLICATE_THRESHOLD ? 'LIKELY' : 'SIMILAR';

const roundScore = (score: number) => Math.round(Number(score) * 100) / 100;

const levelOf = (row: MatchRow): QuestionLevel => {
  if (!row.course_id) return 'GLOBAL';
  if (row.sub_lesson_id) return 'SUB_LESSON';
  if (row.lesson_id) return 'LESSON';
  if (row.module_id) return 'MODULE';
  return 'COURSE';
};

/**
 * Serializes question-bank writes for the rest of the transaction, so two
 * concurrent saves of the same question cannot both pass the duplicate check.
 */
export async function lockQuestionBank(db: Db): Promise<void> {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('question_bank_questions'))`;
}

/** Existing questions identical or similar to `candidate`, most relevant first. */
export async function findSimilarQuestions(
  db: Db,
  candidate: DuplicateCandidate,
  excludeIds: string[] = [],
): Promise<SimilarQuestionMatch[]> {
  const options = JSON.stringify(candidate.options ?? []);

  // Normalize first so the trigram query below gets constants and can use the GIN index.
  const [normalized] = await db.$queryRaw<{ st: string; h: string }[]>`
    SELECT qb_similarity_text(${candidate.question}, ${options}::jsonb) AS st,
           qb_content_hash(${candidate.type}::"QuestionType", ${candidate.question}, ${options}::jsonb) AS h`;
  if (!normalized?.st) return [];

  const scope = candidate.courseId
    ? Prisma.sql`(q.course_id = ${candidate.courseId} OR q.course_id IS NULL)`
    : Prisma.sql`TRUE`;

  const rows = await db.$queryRaw<MatchRow[]>`
    SELECT q.id, q.question, q.type, q.course_id, q.module_id, q.lesson_id, q.sub_lesson_id,
           c.title AS course_title, m.title AS module_title,
           l.title AS lesson_title, sl.title AS sub_lesson_title,
           q.content_hash = ${normalized.h} AS exact,
           similarity(q.similarity_text, ${normalized.st}) AS score
    FROM question_bank_questions q
    LEFT JOIN courses c ON c.id = q.course_id
    LEFT JOIN curriculum_modules m ON m.id = q.module_id
    LEFT JOIN lessons l ON l.id = q.lesson_id
    LEFT JOIN lessons sl ON sl.id = q.sub_lesson_id
    WHERE ${scope}
      AND q.id <> ALL(${excludeIds}::text[])
      AND (q.content_hash = ${normalized.h}
           OR (q.similarity_text % ${normalized.st}
               AND similarity(q.similarity_text, ${normalized.st}) >= ${SIMILAR_THRESHOLD}))
    ORDER BY exact DESC, score DESC
    LIMIT ${MAX_MATCHES}`;

  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    type: row.type,
    score: row.exact ? 1 : roundScore(row.score),
    severity: severityOf(row.exact, Number(row.score)),
    level: levelOf(row),
    location: {
      courseTitle: row.course_title,
      moduleTitle: row.module_title,
      lessonTitle: row.lesson_title,
      subLessonTitle: row.sub_lesson_title,
    },
  }));
}

/**
 * Pairs of questions within one batch that duplicate each other. Each pair is
 * reported on the later question (`index`) pointing at the earlier one.
 */
export async function findBatchDuplicates(
  db: Db,
  items: DuplicateCandidate[],
): Promise<Map<number, BatchMatch[]>> {
  const result = new Map<number, BatchMatch[]>();
  if (items.length < 2) return result;

  const rows = await db.$queryRaw<
    { idx: number; duplicate_of: number; exact: boolean; score: number }[]
  >`
    WITH items AS (
      SELECT (u.ord - 1)::int AS idx, u.course_id,
             qb_similarity_text(u.q, u.o::jsonb) AS st,
             qb_content_hash(u.t::"QuestionType", u.q, u.o::jsonb) AS h
      FROM unnest(
        ${items.map((i) => i.type)}::text[],
        ${items.map((i) => i.question)}::text[],
        ${items.map((i) => JSON.stringify(i.options ?? []))}::text[],
        ${items.map((i) => i.courseId ?? null)}::text[]
      ) WITH ORDINALITY AS u(t, q, o, course_id, ord)
    )
    SELECT a.idx, b.idx AS duplicate_of, a.h = b.h AS exact, similarity(a.st, b.st) AS score
    FROM items a
    JOIN items b ON b.idx < a.idx
     AND (a.course_id = b.course_id OR a.course_id IS NULL OR b.course_id IS NULL)
    WHERE a.st <> ''
      AND (a.h = b.h OR similarity(a.st, b.st) >= ${SIMILAR_THRESHOLD})
    ORDER BY a.idx, exact DESC, score DESC`;

  for (const row of rows) {
    const list = result.get(row.idx) ?? [];
    list.push({
      index: row.duplicate_of,
      score: row.exact ? 1 : roundScore(row.score),
      severity: severityOf(row.exact, Number(row.score)),
    });
    result.set(row.idx, list);
  }
  return result;
}
