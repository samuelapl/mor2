-- CreateEnum
CREATE TYPE "CourseProgressionMode" AS ENUM ('LOCKED', 'OPEN');

-- AlterTable
ALTER TABLE "course_policy_settings" ADD COLUMN "progression_mode" "CourseProgressionMode" NOT NULL DEFAULT 'LOCKED';
