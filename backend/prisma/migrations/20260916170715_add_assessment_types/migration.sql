-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('FINAL_ASSESSMENT', 'MODULE_ASSESSMENT', 'LESSON_ASSESSMENT', 'SUB_LESSON_ASSESSMENT');

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "lesson_id" TEXT,
ADD COLUMN     "module_id" TEXT,
ADD COLUMN     "type" "AssessmentType" NOT NULL DEFAULT 'FINAL_ASSESSMENT';

-- CreateIndex
CREATE INDEX "assessments_module_id_idx" ON "assessments"("module_id");

-- CreateIndex
CREATE INDEX "assessments_lesson_id_idx" ON "assessments"("lesson_id");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "curriculum_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One assessment per module / lesson / sub-lesson target (partial unique indexes — Prisma cannot express these).
-- NOTE: the final (course-level) assessment is intentionally NOT uniqueness-constrained here to preserve the
-- existing frontend flow which can create/replace course-level assessments while the course is a draft.
CREATE UNIQUE INDEX "uq_assessment_module"     ON "assessments"("module_id") WHERE type = 'MODULE_ASSESSMENT';
CREATE UNIQUE INDEX "uq_assessment_lesson"     ON "assessments"("lesson_id") WHERE type = 'LESSON_ASSESSMENT';
CREATE UNIQUE INDEX "uq_assessment_sublesson"  ON "assessments"("lesson_id") WHERE type = 'SUB_LESSON_ASSESSMENT';
