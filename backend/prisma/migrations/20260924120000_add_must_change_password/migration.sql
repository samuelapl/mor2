-- CreateEnum
CREATE TYPE "PasswordResetPurpose" AS ENUM ('RESET', 'FIRST_LOGIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "password_resets" ADD COLUMN     "purpose" "PasswordResetPurpose" NOT NULL DEFAULT 'RESET';
