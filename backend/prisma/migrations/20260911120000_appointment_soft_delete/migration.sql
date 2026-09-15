-- §appointment loop fix. "Another time" (reject a proposed change) used to fall
-- back to the last Confirmed card, so the pin and the handover check disagreed.
-- A card now carries deleted_at: it is set when a newer proposal supersedes the
-- card and when the other party rejects it, so the "current appointment" (newest
-- row with deleted_at NULL) can never resolve to a stale Confirmed one.
--
-- Idempotent for databases created before this column existed.
BEGIN;

ALTER TABLE "Appointment_Card"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Appointment_Card_transaction_id_created_at_idx"
  ON "Appointment_Card"("transaction_id", "created_at");

-- Backfill existing history so old rows follow the new rule. For every
-- transaction, keep only the newest non-rejected card live; retire the rest.
--   - every Rejected card is retired (it was a declined proposal)
--   - every card older than the transaction's newest card is retired,
--     which retires a Confirmed card that a later proposal already replaced
UPDATE "Appointment_Card" AS card
SET "deleted_at" = COALESCE(card."deleted_at", card."created_at", CURRENT_TIMESTAMP)
WHERE card."deleted_at" IS NULL
  AND (
    card."appointment_status" = 'Rejected'
    OR card."appointment_id" < (
      SELECT MAX(newer."appointment_id")
      FROM "Appointment_Card" AS newer
      WHERE newer."transaction_id" = card."transaction_id"
    )
  );

COMMIT;
