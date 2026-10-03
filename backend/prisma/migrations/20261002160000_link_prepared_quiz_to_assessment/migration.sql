-- AlterTable
ALTER TABLE "session_prepared_quizzes" ADD COLUMN     "assessment_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "session_prepared_quizzes_assessment_id_key" ON "session_prepared_quizzes"("assessment_id");

-- AddForeignKey
ALTER TABLE "session_prepared_quizzes" ADD CONSTRAINT "session_prepared_quizzes_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

