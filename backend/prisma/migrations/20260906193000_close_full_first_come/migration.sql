BEGIN;

-- Preserve every historical ticket, but stop legacy First Come giveaways from
-- accepting more registrations when their existing ticket count already meets
-- or exceeds the newly enforced capacity.
UPDATE "Giveaway_Post" AS giveaway
SET "giveaway_status" = 'Closed'
WHERE giveaway."allocation_method" = 'FirstCome'
  AND giveaway."giveaway_status" = 'Active'
  AND (
    SELECT COUNT(*)
    FROM "Giveaway_Ticket" AS ticket
    WHERE ticket."giveaway_id" = giveaway."giveaway_id"
  ) >= giveaway."quantity";

COMMIT;
