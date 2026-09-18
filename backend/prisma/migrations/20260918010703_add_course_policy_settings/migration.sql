-- CreateTable
CREATE TABLE "course_policy_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "time_spent_percent" INTEGER NOT NULL DEFAULT 50,
    "retake_cooldown_minutes" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "course_policy_settings_pkey" PRIMARY KEY ("id")
);
