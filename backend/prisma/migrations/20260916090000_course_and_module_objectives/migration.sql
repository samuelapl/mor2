-- Alter courses table: add objectives and course metadata
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "target_audience" TEXT;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "delivery_method" TEXT;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'en';
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "objectives_am" TEXT;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "objectives_en" TEXT;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "prerequisites" TEXT;

-- Alter curriculum_modules table: add module objectives and duration
ALTER TABLE "curriculum_modules" ADD COLUMN IF NOT EXISTS "objectives_am" TEXT;
ALTER TABLE "curriculum_modules" ADD COLUMN IF NOT EXISTS "objectives_en" TEXT;
ALTER TABLE "curriculum_modules" ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER;
