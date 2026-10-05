-- CreateEnum
CREATE TYPE "NewsStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'REJECTED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NewsCategory" AS ENUM ('PRESS_RELEASE', 'ANNOUNCEMENT', 'EVENT', 'NOTICE');

-- CreateEnum
CREATE TYPE "NewsReactionType" AS ENUM ('LIKE', 'DISLIKE');

-- CreateTable
CREATE TABLE "news" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "cover_image_url" TEXT,
    "category" "NewsCategory" NOT NULL DEFAULT 'PRESS_RELEASE',
    "source" TEXT NOT NULL DEFAULT 'የገቢዎች ሚኒስቴር',
    "event_date" TIMESTAMP(3),
    "status" "NewsStatus" NOT NULL DEFAULT 'DRAFT',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "allow_comments" BOOLEAN NOT NULL DEFAULT true,
    "rejection_reason" TEXT,
    "published_at" TIMESTAMP(3),
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_images" (
    "id" TEXT NOT NULL,
    "news_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_reactions" (
    "news_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NewsReactionType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_reactions_pkey" PRIMARY KEY ("news_id","user_id")
);

-- CreateTable
CREATE TABLE "news_comments" (
    "id" TEXT NOT NULL,
    "news_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "hidden_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "news_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_slug_key" ON "news"("slug");

-- CreateIndex
CREATE INDEX "news_status_published_at_idx" ON "news"("status", "published_at");

-- CreateIndex
CREATE INDEX "news_is_featured_idx" ON "news"("is_featured");

-- CreateIndex
CREATE INDEX "news_images_news_id_idx" ON "news_images"("news_id");

-- CreateIndex
CREATE INDEX "news_reactions_news_id_type_idx" ON "news_reactions"("news_id", "type");

-- CreateIndex
CREATE INDEX "news_comments_news_id_created_at_idx" ON "news_comments"("news_id", "created_at");

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_images" ADD CONSTRAINT "news_images_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_reactions" ADD CONSTRAINT "news_reactions_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_reactions" ADD CONSTRAINT "news_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_comments" ADD CONSTRAINT "news_comments_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_comments" ADD CONSTRAINT "news_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
