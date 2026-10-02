-- AlterTable
ALTER TABLE "attachments" ADD COLUMN "assessment_id" TEXT;

-- CreateIndex
CREATE INDEX "attachments_assessment_id_idx" ON "attachments"("assessment_id");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
