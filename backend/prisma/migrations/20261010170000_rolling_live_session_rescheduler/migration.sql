-- AlterTable
ALTER TABLE "live_sessions" ADD COLUMN IF NOT EXISTS "is_auto_rescheduled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "live_sessions" ADD COLUMN IF NOT EXISTS "reschedule_status" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "live_sessions" ADD COLUMN IF NOT EXISTS "original_plan_id" TEXT;
ALTER TABLE "live_sessions" ADD COLUMN IF NOT EXISTS "planned_order" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "public_holidays" (
    "id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_am" TEXT,
    "holiday_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "public_holidays_holiday_date_key" ON "public_holidays"("holiday_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "public_holidays_holiday_date_idx" ON "public_holidays"("holiday_date");

