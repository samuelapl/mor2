-- Add AUDIO to LessonContentType enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type typ
    JOIN pg_enum enm ON typ.oid = enm.enumtypid
    WHERE typ.typname = 'LessonContentType' AND enm.enumlabel = 'AUDIO'
  ) THEN
    ALTER TYPE "LessonContentType" ADD VALUE 'AUDIO';
  END IF;
END
$$;

-- Add parent_id column to lessons
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "parent_id" TEXT REFERENCES "lessons"("id") ON DELETE CASCADE;

-- Create index on parent_id
CREATE INDEX IF NOT EXISTS "lessons_parent_id_idx" ON "lessons"("parent_id");
