-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "certificate_templates" ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "revoked_at" TIMESTAMP(3),
ADD COLUMN     "revoked_by_id" TEXT,
ADD COLUMN     "revoked_reason" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "course_policy_settings" ADD COLUMN     "passing_score_percent" INTEGER NOT NULL DEFAULT 50;

-- CreateIndex
CREATE INDEX "certificate_templates_is_archived_idx" ON "certificate_templates"("is_archived");

-- CreateIndex
CREATE INDEX "certificates_status_idx" ON "certificates"("status");
