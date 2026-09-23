-- AlterTable
ALTER TABLE "question_bank_questions" ADD COLUMN     "lesson_id" TEXT,
ADD COLUMN     "module_id" TEXT,
ADD COLUMN     "sub_lesson_id" TEXT;

-- CreateIndex
CREATE INDEX "question_bank_questions_module_id_idx" ON "question_bank_questions"("module_id");

-- CreateIndex
CREATE INDEX "question_bank_questions_lesson_id_idx" ON "question_bank_questions"("lesson_id");

-- CreateIndex
CREATE INDEX "question_bank_questions_sub_lesson_id_idx" ON "question_bank_questions"("sub_lesson_id");

-- AddForeignKey
ALTER TABLE "question_bank_questions" ADD CONSTRAINT "question_bank_questions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "curriculum_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_questions" ADD CONSTRAINT "question_bank_questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_questions" ADD CONSTRAINT "question_bank_questions_sub_lesson_id_fkey" FOREIGN KEY ("sub_lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
