-- AlterTable
ALTER TABLE "course_session_plans" ADD COLUMN "trainer_id" TEXT;

-- CreateIndex
CREATE INDEX "course_session_plans_trainer_id_idx" ON "course_session_plans"("trainer_id");

-- AddForeignKey
ALTER TABLE "course_session_plans" ADD CONSTRAINT "course_session_plans_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: a plan that is already scheduled takes its session's trainer.
UPDATE "course_session_plans" p
SET "trainer_id" = s."trainer_id"
FROM "live_sessions" s
WHERE s."session_plan_id" = p."id" AND s."deleted_at" IS NULL AND s."trainer_id" IS NOT NULL;
