-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('VIRTUAL', 'QR', 'GPS', 'BIOMETRIC');

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "biometric_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "check_in_method" "CheckInMethod",
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "overridden_at" TIMESTAMP(3),
ADD COLUMN     "overridden_by" TEXT;
