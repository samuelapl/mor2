-- A weighted session quiz keeps a copy of its questions (answer key) on its Assessment.
-- Bring the points in that copy in line with the per-quiz points set in the previous migration.
UPDATE "assessments" a
SET "questions" = (
  SELECT jsonb_agg(
           CASE WHEN spq."points" IS NULL THEN e.elem
                ELSE jsonb_set(e.elem, '{points}', to_jsonb(spq."points")) END
           ORDER BY e.ord)
  FROM jsonb_array_elements(a."questions") WITH ORDINALITY AS e(elem, ord)
  LEFT JOIN "session_prepared_questions" spq
    ON spq."quiz_id" = pq."id" AND spq."question_id" = e.elem->>'id'
)
FROM "session_prepared_quizzes" pq
WHERE pq."assessment_id" = a."id"
  AND jsonb_typeof(a."questions") = 'array'
  AND jsonb_array_length(a."questions") > 0;
