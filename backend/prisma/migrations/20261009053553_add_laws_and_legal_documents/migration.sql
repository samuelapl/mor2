-- CreateEnum
CREATE TYPE "LawDomain" AS ENUM ('TAX_LAW', 'CUSTOMS_LAW', 'DRAFT_LAW', 'OTHER_DOCUMENTS');

-- CreateEnum
CREATE TYPE "LawInstrumentType" AS ENUM ('PROCLAMATION', 'REGULATION', 'DIRECTIVE', 'CIRCULAR', 'OTHER');

-- CreateEnum
CREATE TYPE "LawStatus" AS ENUM ('IN_FORCE', 'REPEALED', 'AMENDED', 'DRAFT');

-- CreateTable
CREATE TABLE "law_categories" (
    "id" TEXT NOT NULL,
    "domain" "LawDomain" NOT NULL,
    "instrument_type" "LawInstrumentType" NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_am" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "law_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_am" TEXT,
    "description_en" TEXT,
    "description_am" TEXT,
    "status" "LawStatus" NOT NULL DEFAULT 'IN_FORCE',
    "year_issued" INTEGER,
    "cover_image_url" TEXT,
    "pdf_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "law_categories_domain_instrument_type_idx" ON "law_categories"("domain", "instrument_type");

-- CreateIndex
CREATE INDEX "legal_documents_category_id_status_idx" ON "legal_documents"("category_id", "status");

-- CreateIndex
CREATE INDEX "legal_documents_created_by_id_idx" ON "legal_documents"("created_by_id");

-- AddForeignKey
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "law_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
