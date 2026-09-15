-- AlterTable
ALTER TABLE "curriculum_modules" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "deleted_at" TIMESTAMP(3);
