-- Migration: password_reset_code_flow
-- Replaces the old token-link flow with a 6-digit code flow.
-- Changes:
--   1. Rename column token_hash → code_hash
--   2. Add column attempts (default 0) for brute-force attempt tracking

-- Step 1: Drop the old unique index on token_hash
DROP INDEX IF EXISTS "password_resets_token_hash_key";

-- Step 2: Rename the column
ALTER TABLE "password_resets" RENAME COLUMN "token_hash" TO "code_hash";

-- Step 3: Add the attempts column with a default of 0
ALTER TABLE "password_resets" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;

-- Step 4: Re-create the unique index on the renamed column
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_code_hash_key" UNIQUE ("code_hash");
