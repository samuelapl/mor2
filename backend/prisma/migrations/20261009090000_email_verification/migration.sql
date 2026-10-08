-- AlterEnum
ALTER TYPE "PasswordResetPurpose" ADD VALUE 'EMAIL_VERIFY';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3);

-- Existing approved accounts keep working: treat them as verified. Admin-created accounts still
-- waiting for their first login stay unverified; finishing first login (an emailed code) sets it.
-- PENDING accounts stay unverified and verify by email on their next sign-in.
UPDATE "users"
SET "email_verified_at" = "created_at"
WHERE "registration_status" = 'APPROVED' AND "must_change_password" = false;
