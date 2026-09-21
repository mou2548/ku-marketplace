-- §giveaway queue number — ticket_id is a Postgres sequence shared across
-- every giveaway, so it cannot be shown to an entrant as "your position in
-- this giveaway". queue_number is the 1-based join order within a single
-- giveaway_id, backfilled here from the existing ticket_id ordering and
-- assigned going forward inside join()'s existing row lock.
--
-- Idempotent for databases created before this column existed.
BEGIN;

ALTER TABLE "Giveaway_Ticket"
  ADD COLUMN IF NOT EXISTS "queue_number" INTEGER;

UPDATE "Giveaway_Ticket" AS ticket
SET "queue_number" = ordered.rn
FROM (
  SELECT "ticket_id",
         ROW_NUMBER() OVER (PARTITION BY "giveaway_id" ORDER BY "ticket_id" ASC) AS rn
  FROM "Giveaway_Ticket"
) AS ordered
WHERE ticket."ticket_id" = ordered."ticket_id"
  AND ticket."queue_number" IS NULL;

ALTER TABLE "Giveaway_Ticket"
  ALTER COLUMN "queue_number" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Giveaway_Ticket_giveaway_id_queue_number_key"
  ON "Giveaway_Ticket"("giveaway_id", "queue_number");

COMMIT;
