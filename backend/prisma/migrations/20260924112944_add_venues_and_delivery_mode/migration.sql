-- CreateEnum
CREATE TYPE "CourseDeliveryMode" AS ENUM ('ONLINE_ONLY', 'IN_PERSON_ONLY', 'BOTH');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('VIRTUAL', 'IN_PERSON');

-- AlterEnum
ALTER TYPE "SessionPlatform" ADD VALUE 'IN_PERSON';

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "delivery_mode" "CourseDeliveryMode" NOT NULL DEFAULT 'BOTH';

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "enrolled_delivery_mode" "CourseDeliveryMode" NOT NULL DEFAULT 'ONLINE_ONLY',
ADD COLUMN     "enrolled_session_id" TEXT,
ADD COLUMN     "enrolled_venue_id" TEXT;

-- AlterTable
ALTER TABLE "live_sessions" ADD COLUMN     "session_type" "SessionType" NOT NULL DEFAULT 'VIRTUAL',
ADD COLUMN     "venue_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "primary_venue_id" TEXT;

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "building" TEXT,
    "branch" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 30,
    "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venues_branch_idx" ON "venues"("branch");

-- CreateIndex
CREATE INDEX "venues_is_active_idx" ON "venues"("is_active");

-- CreateIndex
CREATE INDEX "enrollments_enrolled_venue_id_idx" ON "enrollments"("enrolled_venue_id");

-- CreateIndex
CREATE INDEX "enrollments_enrolled_session_id_idx" ON "enrollments"("enrolled_session_id");

-- CreateIndex
CREATE INDEX "live_sessions_venue_id_idx" ON "live_sessions"("venue_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_primary_venue_id_fkey" FOREIGN KEY ("primary_venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_enrolled_venue_id_fkey" FOREIGN KEY ("enrolled_venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_enrolled_session_id_fkey" FOREIGN KEY ("enrolled_session_id") REFERENCES "live_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
