-- AlterEnum
ALTER TYPE "AssessmentType" ADD VALUE 'SESSION_ASSESSMENT';

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "has_online_sessions" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "session_plan_id" TEXT;

-- AlterTable
ALTER TABLE "live_sessions" ADD COLUMN     "session_plan_id" TEXT;

-- CreateTable
CREATE TABLE "course_session_plans" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title_en" TEXT NOT NULL,
    "description_en" TEXT,
    "objectives_en" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_session_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_session_plans_course_id_idx" ON "course_session_plans"("course_id");

-- CreateIndex
CREATE INDEX "assessments_session_plan_id_idx" ON "assessments"("session_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "live_sessions_session_plan_id_key" ON "live_sessions"("session_plan_id");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_session_plan_id_fkey" FOREIGN KEY ("session_plan_id") REFERENCES "course_session_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_session_plan_id_fkey" FOREIGN KEY ("session_plan_id") REFERENCES "course_session_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_session_plans" ADD CONSTRAINT "course_session_plans_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

