-- Giveaway capacity/deadline already exist in init.sql, but older databases may
-- predate them. These statements are idempotent for those installations.
BEGIN;

ALTER TABLE "Giveaway_Post"
  ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "register_deadline" TIMESTAMP;

ALTER TABLE "Giveaway_Post"
  DROP CONSTRAINT IF EXISTS "Giveaway_Post_quantity_check";

ALTER TABLE "Giveaway_Post"
  ADD CONSTRAINT "Giveaway_Post_quantity_check" CHECK ("quantity" > 0);

ALTER TABLE "Giveaway_Ticket"
  DROP CONSTRAINT IF EXISTS "Giveaway_Ticket_ticket_status_check";

-- Waived was the previous explicit opt-out value, so unlike an ambiguous
-- Expired record it is safe to preserve as Forfeited.
UPDATE "Giveaway_Ticket"
SET "ticket_status" = 'Forfeited'
WHERE "ticket_status" = 'Waived';

-- Active Random/Manual tickets have not been allocated yet, so this is the one
-- historical Waiting state that can be migrated without guessing. Closed draws
-- retain Waiting for winners. Existing Expired rows remain unchanged because
-- the old schema cannot prove whether they expired, forfeited, or lost a draw.
UPDATE "Giveaway_Ticket" AS ticket
SET "ticket_status" = 'Registered'
FROM "Giveaway_Post" AS giveaway
WHERE ticket."giveaway_id" = giveaway."giveaway_id"
  AND ticket."ticket_status" = 'Waiting'
  AND giveaway."giveaway_status" = 'Active'
  AND giveaway."allocation_method" IN ('Random', 'Manual');

ALTER TABLE "Giveaway_Ticket"
  ADD CONSTRAINT "Giveaway_Ticket_ticket_status_check"
  CHECK ("ticket_status" IN (
    'Registered',
    'Waiting',
    'NotSelected',
    'Received',
    'Forfeited',
    'Expired'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS "Giveaway_Ticket_giveaway_id_receiver_id_key"
  ON "Giveaway_Ticket"("giveaway_id", "receiver_id");

COMMIT;
