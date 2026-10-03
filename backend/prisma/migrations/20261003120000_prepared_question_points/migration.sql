-- Points per question inside a prepared session quiz (trainer-set; the bank question's
-- points are only the starting value). For a weighted session quiz they must total its weight.

-- AlterTable
ALTER TABLE "session_prepared_questions" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 0;

-- Backfill ungraded quizzes with the bank question's points (what they were scored with so far).
UPDATE "session_prepared_questions" spq
SET "points" = q."points"
FROM "question_bank_questions" q, "session_prepared_quizzes" pq
WHERE q."id" = spq."question_id" AND pq."id" = spq."quiz_id" AND pq."assessment_id" IS NULL;

-- Backfill weighted quizzes by splitting the weight evenly (earlier questions take the remainder),
-- so every existing graded quiz starts out valid.
WITH ranked AS (
  SELECT spq."id",
         a."weight",
         COUNT(*) OVER (PARTITION BY spq."quiz_id") AS n,
         ROW_NUMBER() OVER (PARTITION BY spq."quiz_id" ORDER BY spq."order", spq."added_at") AS rn
  FROM "session_prepared_questions" spq
  JOIN "session_prepared_quizzes" pq ON pq."id" = spq."quiz_id"
  JOIN "assessments" a ON a."id" = pq."assessment_id"
)
UPDATE "session_prepared_questions" spq
SET "points" = (r."weight" / r."n") + CASE WHEN r."rn" <= r."weight" % r."n" THEN 1 ELSE 0 END
FROM ranked r
WHERE r."id" = spq."id";
