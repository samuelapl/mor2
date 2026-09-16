-- DropForeignKey
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_parent_id_fkey";

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
