-- §giveaway QR — one code per 15 minutes, like the deal handover. qr_issued_at
-- records when the current qr_token was minted; qrGenerate reuses that token
-- while it is under 15 minutes old and reports the time it has left, and qrScan
-- rejects a token once its window has passed.
--
-- Idempotent for databases created before this column existed.
BEGIN;

ALTER TABLE "Giveaway_Ticket"
  ADD COLUMN IF NOT EXISTS "qr_issued_at" TIMESTAMP;

-- Existing tokens have no known issue time, so treat them as already stale:
-- the next qrGenerate mints a fresh one and stamps it.
UPDATE "Giveaway_Ticket"
SET "qr_issued_at" = NULL
WHERE "qr_issued_at" IS NULL;

COMMIT;
