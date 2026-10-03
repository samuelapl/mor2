-- Duplicate detection for the question bank.
-- Normalization lives in SQL so generated columns, seeds and the service's
-- similarity queries all share one definition.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Strips HTML tags/entities, applies NFKC, lowercases and collapses everything
-- that is not a letter or digit (any script, incl. Ethiopic) into single spaces.
CREATE OR REPLACE FUNCTION qb_normalize_text(t text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT btrim(regexp_replace(regexp_replace(
    lower(normalize(regexp_replace(regexp_replace(coalesce(t, ''), '<[^>]*>', ' ', 'g'), '&[a-zA-Z0-9#]+;', ' ', 'g'), NFKC)),
    '[^[:alnum:]]+', ' ', 'g'), '\s+', ' ', 'g'))
$$;

-- Normalized options, sorted so that option order does not matter.
CREATE OR REPLACE FUNCTION qb_normalize_options(o jsonb) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT coalesce(string_agg(n, ' ' ORDER BY n), '')
  FROM (SELECT qb_normalize_text(e) AS n
        FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(o) = 'array' THEN o ELSE '[]'::jsonb END) e) s
  WHERE n <> ''
$$;

-- Text compared with trigram similarity. Short, generic stems ("Which of the
-- following is correct?") include their options so they don't all match each other.
CREATE OR REPLACE FUNCTION qb_similarity_text(q text, o jsonb) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE WHEN array_length(regexp_split_to_array(qb_normalize_text(q), ' '), 1) < 6
              THEN btrim(qb_normalize_text(q) || ' ' || qb_normalize_options(o))
              ELSE qb_normalize_text(q) END
$$;

-- Exact-duplicate fingerprint: type + normalized question + normalized options.
-- Takes the enum directly because an enum::text cast is not immutable.
CREATE OR REPLACE FUNCTION qb_content_hash(t "QuestionType", q text, o jsonb) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT md5(t::text || '|' || qb_normalize_text(q) || '|' || qb_normalize_options(o))
$$;

-- AlterTable
ALTER TABLE "question_bank_questions"
  ADD COLUMN "content_hash" TEXT GENERATED ALWAYS AS (qb_content_hash("type", "question", "options")) STORED,
  ADD COLUMN "similarity_text" TEXT GENERATED ALWAYS AS (qb_similarity_text("question", "options")) STORED;

-- CreateIndex
CREATE INDEX "question_bank_questions_course_id_content_hash_idx" ON "question_bank_questions"("course_id", "content_hash");

-- CreateIndex
CREATE INDEX "question_bank_questions_similarity_text_idx" ON "question_bank_questions" USING GIN ("similarity_text" gin_trgm_ops);
