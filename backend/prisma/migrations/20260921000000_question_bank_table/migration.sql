-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER');

-- CreateTable
CREATE TABLE "question_bank_questions" (
    "id" TEXT NOT NULL,
    "course_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_answer" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "category" TEXT NOT NULL DEFAULT 'General',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_bank_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_bank_questions_course_id_idx" ON "question_bank_questions"("course_id");

-- CreateIndex
CREATE INDEX "question_bank_questions_created_by_id_idx" ON "question_bank_questions"("created_by_id");

-- AddForeignKey
ALTER TABLE "question_bank_questions" ADD CONSTRAINT "question_bank_questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_questions" ADD CONSTRAINT "question_bank_questions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
