-- AlterTable
ALTER TABLE "assessments" ADD COLUMN "total_points" INTEGER;

-- Backfill session quizzes: keep the points a trainer already assigned, otherwise the quiz's
-- old course weight, otherwise 10.
UPDATE "assessments" a
SET "total_points" = COALESCE(
  NULLIF((
    SELECT SUM(q."points")
    FROM "session_prepared_quizzes" pq
    JOIN "session_prepared_questions" q ON q."quiz_id" = pq."id"
    WHERE pq."assessment_id" = a."id"
  ), 0),
  NULLIF(a."weight", 0),
  10
)
WHERE a."type" = 'SESSION_ASSESSMENT';
