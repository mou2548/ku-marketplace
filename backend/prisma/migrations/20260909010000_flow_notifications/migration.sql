BEGIN;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "refund_submitted_at" TIMESTAMP;
CREATE TABLE IF NOT EXISTS "Notification" (
  "notification_id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
  "event_key" VARCHAR(255) NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Notification_user_id_created_at_idx" ON "Notification"("user_id", "created_at");
COMMIT;
