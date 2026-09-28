/*
  Warnings:

  - You are about to drop the column `description_am` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the column `description_en` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the column `objectives_am` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the column `objectives_en` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the column `title_am` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the column `title_en` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the column `description_am` on the `curriculum_modules` table. All the data in the column will be lost.
  - You are about to drop the column `description_en` on the `curriculum_modules` table. All the data in the column will be lost.
  - You are about to drop the column `objectives_am` on the `curriculum_modules` table. All the data in the column will be lost.
  - You are about to drop the column `objectives_en` on the `curriculum_modules` table. All the data in the column will be lost.
  - You are about to drop the column `title_am` on the `curriculum_modules` table. All the data in the column will be lost.
  - You are about to drop the column `title_en` on the `curriculum_modules` table. All the data in the column will be lost.
  - You are about to drop the column `content_am` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `content_en` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `title_am` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `title_en` on the `lessons` table. All the data in the column will be lost.
  - Added the required column `title` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `curriculum_modules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `lessons` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LookupCategoryType" AS ENUM ('COURSE_CATEGORY', 'COURSE_LEVEL', 'QUESTION_TYPE');

-- AlterTable
ALTER TABLE "courses" DROP COLUMN "description_am",
DROP COLUMN "description_en",
DROP COLUMN "language",
DROP COLUMN "objectives_am",
DROP COLUMN "objectives_en",
DROP COLUMN "title_am",
DROP COLUMN "title_en",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "objectives" TEXT,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "curriculum_modules" DROP COLUMN "description_am",
DROP COLUMN "description_en",
DROP COLUMN "objectives_am",
DROP COLUMN "objectives_en",
DROP COLUMN "title_am",
DROP COLUMN "title_en",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "objectives" TEXT,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "lessons" DROP COLUMN "content_am",
DROP COLUMN "content_en",
DROP COLUMN "title_am",
DROP COLUMN "title_en",
ADD COLUMN     "content" TEXT,
ADD COLUMN     "title" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "lookup_categories" (
    "id" TEXT NOT NULL,
    "type" "LookupCategoryType" NOT NULL,
    "value" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "label_am" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lookup_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lookup_categories_type_value_key" ON "lookup_categories"("type", "value");
