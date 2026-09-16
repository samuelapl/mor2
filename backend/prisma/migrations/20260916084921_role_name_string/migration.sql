-- Convert RoleName enum columns to plain strings (data-preserving: enum
-- values become their identical string equivalents, e.g. 'LEARNER' -> 'LEARNER').
ALTER TABLE "roles" ALTER COLUMN "name" TYPE TEXT USING "name"::text;

ALTER TABLE "user_roles" ALTER COLUMN "role" TYPE TEXT USING "role"::text;
