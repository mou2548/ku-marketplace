-- Adds the missing "opens at" side of the registration and pickup windows.
-- Both existing columns (register_deadline, pickup_deadline) stay as the
-- "closes at" side; these two are purely additive and nullable, so existing
-- rows are unaffected.
--
-- Idempotent for databases created before this migration existed.
BEGIN;

ALTER TABLE "Giveaway_Post"
  ADD COLUMN IF NOT EXISTS "register_start" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "pickup_start" TIMESTAMP;

COMMIT;
