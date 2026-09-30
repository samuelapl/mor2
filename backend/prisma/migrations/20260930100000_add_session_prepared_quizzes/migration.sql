-- Drop old table
DROP TABLE IF EXISTS "session_prepared_questions" CASCADE;

-- CreateTable session_prepared_quizzes
CREATE TABLE "session_prepared_quizzes" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Quiz 1',
    "time_limit_minutes" INTEGER NOT NULL DEFAULT 3,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_prepared_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_prepared_quizzes_session_id_idx" ON "session_prepared_quizzes"("session_id");

-- AddForeignKey
ALTER TABLE "session_prepared_quizzes" ADD CONSTRAINT "session_prepared_quizzes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable session_prepared_questions
CREATE TABLE "session_prepared_questions" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "session_prepared_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_prepared_questions_quiz_id_idx" ON "session_prepared_questions"("quiz_id");
CREATE UNIQUE INDEX "session_prepared_questions_quiz_id_question_id_key" ON "session_prepared_questions"("quiz_id", "question_id");

-- AddForeignKey
ALTER TABLE "session_prepared_questions" ADD CONSTRAINT "session_prepared_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "session_prepared_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_prepared_questions" ADD CONSTRAINT "session_prepared_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question_bank_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
