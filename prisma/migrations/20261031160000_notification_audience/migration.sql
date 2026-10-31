-- The Supabase database already has this required column. IF NOT EXISTS keeps
-- this migration compatible with that database while also creating it on
-- databases built from the repository's migration history.
ALTER TABLE "notifications"
ADD COLUMN IF NOT EXISTS "audience" TEXT;

-- Backfill existing rows for databases where the column did not exist yet.
UPDATE "notifications" AS n
SET "audience" = CASE WHEN u."is_admin" THEN 'ADMIN' ELSE 'USER' END
FROM "user_profiles" AS u
WHERE n."recipient_id" = u."id"
  AND n."audience" IS NULL;

ALTER TABLE "notifications"
ALTER COLUMN "audience" SET NOT NULL;
