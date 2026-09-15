-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "level" "CourseLevel" NOT NULL DEFAULT 'BASIC';
