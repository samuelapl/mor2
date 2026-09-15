-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "course_id" TEXT;

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "template_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "registration_status" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "background_url" TEXT,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certificate_templates_is_active_idx" ON "certificate_templates"("is_active");

-- CreateIndex
CREATE INDEX "attachments_course_id_idx" ON "attachments"("course_id");

-- CreateIndex
CREATE INDEX "certificates_template_id_idx" ON "certificates"("template_id");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "certificate_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
