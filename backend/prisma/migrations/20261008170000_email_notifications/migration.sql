-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'COURSE_SUBMITTED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_notifications" BOOLEAN NOT NULL DEFAULT true;
