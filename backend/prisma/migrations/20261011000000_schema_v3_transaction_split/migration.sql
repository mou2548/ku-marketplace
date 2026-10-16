-- Schema v3: bring the live database in line with docs/db/KU_Marketplace_Data_Dictionary.md
--
--   * Split Transaction into Transaction + 5 child tables (data is moved, not dropped).
--   * Add the missing columns / change column types listed in the diff note.
--   * Giveaway_Post.item_id becomes NOT NULL; item_name is dropped (an Item is
--     created for each legacy giveaway that only had item_name).
--
-- Deliberate deviations from the docs (decided with the DB owner):
--   * CHECK constraints are kept (and added to the new tables).
--   * Report.sanction stays lower-case: none, warn, suspend_temporary, suspend_permanent.
--   * Post.item_id stays NON-unique (multi-listing: one Item backs many Posts).
--
-- Runs as one transaction (Prisma applies a migration script atomically). Row-count
-- assertions below RAISE EXCEPTION, which rolls everything back, if data would be lost.
-- Take a backup / PITR point before applying to a real database. See ROLLBACK.md.

-- ---------------------------------------------------------------------------
-- 1. Simple column changes on existing tables
-- ---------------------------------------------------------------------------

-- User
ALTER TABLE "User" ADD COLUMN "promptpay_id" VARCHAR(100);

-- User_Follow: soft delete (NULL = still following)
ALTER TABLE "User_Follow" ADD COLUMN "deleted_at" TIMESTAMP(6);
-- Dictionary: created_at is nullable (default now()).
ALTER TABLE "User_Follow" ALTER COLUMN "created_at" DROP NOT NULL;

-- Subscription_Payment
ALTER TABLE "Subscription_Payment" ALTER COLUMN "amount" TYPE DECIMAL(10,2);
ALTER TABLE "Subscription_Payment" ALTER COLUMN "rejection_reason" TYPE VARCHAR(500);

-- Item
ALTER TABLE "Item" ALTER COLUMN "size" TYPE VARCHAR(100);
ALTER TABLE "Item" ALTER COLUMN "description" TYPE VARCHAR(2000);
-- Dictionary: quantity is NOT NULL with no default (the caller must say how many).
ALTER TABLE "Item" ALTER COLUMN "quantity" DROP DEFAULT;
-- Dictionary Enum reference: the 10 categories. Existing rows were checked: all within the list.
ALTER TABLE "Item" ADD CONSTRAINT "Item_category_check"
  CHECK ("category" IN ('Clothing', 'Electronics', 'Home & Living', 'Bags', 'Vehicles',
                        'Sports', 'Stationery', 'Tickets', 'Books', 'Other'));

-- Post: price is optional (TradeOnly); free-text columns get a length limit
ALTER TABLE "Post" ALTER COLUMN "price" DROP NOT NULL;
ALTER TABLE "Post" ALTER COLUMN "description" TYPE VARCHAR(2000);
ALTER TABLE "Post" ALTER COLUMN "wanted_item_offer" TYPE VARCHAR(500);

-- Report
ALTER TABLE "Report" ALTER COLUMN "details" TYPE VARCHAR(2000);
ALTER TABLE "Report" ALTER COLUMN "resolution_note" TYPE VARCHAR(1000);
-- A dismissed report has, by definition, no sanction.
UPDATE "Report" SET "sanction" = 'none' WHERE "report_status" = 'Report_Dismissed' AND "sanction" IS NULL;
ALTER TABLE "Report" ADD CONSTRAINT "Report_sanction_check"
  CHECK ("sanction" IS NULL OR "sanction" IN ('none', 'warn', 'suspend_temporary', 'suspend_permanent'));
-- Replaces Transaction.active_report_id: "reports of this transaction/post/user".
CREATE INDEX "Report_report_type_target_id_idx" ON "Report"("report_type", "target_id");

-- Appeal
ALTER TABLE "Appeal" ALTER COLUMN "reason" TYPE VARCHAR(2000);
ALTER TABLE "Appeal" ALTER COLUMN "resolution_note" TYPE VARCHAR(1000);

-- Chat
ALTER TABLE "Chat_Message" ALTER COLUMN "content" TYPE VARCHAR(2000);
ALTER TABLE "Chat_Room" ADD CONSTRAINT "Chat_Room_exactly_one_target_check"
  CHECK (num_nonnulls("transaction_id", "giveaway_id") = 1);

-- Notification: unique per (user, event) instead of per event; read_at; length limits
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_event_key_key";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_event_key_key" UNIQUE ("user_id", "event_key");
ALTER TABLE "Notification" ALTER COLUMN "title" TYPE VARCHAR(255);
ALTER TABLE "Notification" ALTER COLUMN "body" TYPE VARCHAR(1000);
ALTER TABLE "Notification" ALTER COLUMN "href" TYPE VARCHAR(500);
ALTER TABLE "Notification" ADD COLUMN "read_at" TIMESTAMP(6);
-- Dictionary: created_at is nullable (default now()).
ALTER TABLE "Notification" ALTER COLUMN "created_at" DROP NOT NULL;

-- Giveaway_Ticket: a user who forfeited may register again, so (giveaway_id, receiver_id)
-- is no longer unique; only one *live* ticket per user per giveaway is allowed.
DROP INDEX "Giveaway_Ticket_giveaway_id_receiver_id_key";
CREATE UNIQUE INDEX "Giveaway_Ticket_one_live_ticket_per_receiver"
  ON "Giveaway_Ticket"("giveaway_id", "receiver_id")
  WHERE "ticket_status" IN ('Registered', 'Waiting', 'Received');

-- ---------------------------------------------------------------------------
-- 2. Giveaway_Post: item_id NOT NULL, item_name dropped
-- ---------------------------------------------------------------------------

-- Legacy giveaways that only carry item_name get a real Item (owned by the giver,
-- quantity = giveaway quantity so the owner's available stock stays consistent).
DO $$
DECLARE
  r RECORD;
  new_item_id INTEGER;
  created_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT "giveaway_id", "item_name", "description", "giver_id", "quantity", "created_at"
    FROM "Giveaway_Post"
    WHERE "item_id" IS NULL
    ORDER BY "giveaway_id"
  LOOP
    INSERT INTO "Item" ("owner_id", "name", "category", "condition", "description",
                        "item_status", "quantity", "created_at")
    VALUES (r."giver_id", COALESCE(r."item_name", 'Giveaway #' || r."giveaway_id"),
            'Other', 'Good', r."description", 'Unlisted', r."quantity", r."created_at")
    RETURNING "item_id" INTO new_item_id;

    UPDATE "Giveaway_Post" SET "item_id" = new_item_id WHERE "giveaway_id" = r."giveaway_id";
    created_count := created_count + 1;
  END LOOP;
  RAISE NOTICE 'Giveaway_Post: created % Item rows for legacy giveaways', created_count;
END $$;

ALTER TABLE "Giveaway_Post" ALTER COLUMN "item_id" SET NOT NULL;
ALTER TABLE "Giveaway_Post" DROP COLUMN "item_name";
ALTER TABLE "Giveaway_Post" ALTER COLUMN "description" TYPE VARCHAR(2000);

-- ---------------------------------------------------------------------------
-- 3. Transaction split
-- ---------------------------------------------------------------------------

-- 3.1 total_amount (snapshot of the cash the buyer owes)
ALTER TABLE "Transaction" ADD COLUMN "total_amount" DECIMAL(10,2);

-- Direct purchase (no offer): Post.price x quantity.
-- Via an accepted offer: only the extra cash (Offer.additional_money), 0 if none.
UPDATE "Transaction" t
SET "total_amount" = CASE
      WHEN t."offer_id" IS NULL THEN p."price" * COALESCE(t."quantity", 1)
      ELSE COALESCE((SELECT o."additional_money" FROM "Offer" o WHERE o."offer_id" = t."offer_id"), 0)
    END
FROM "Post" p
WHERE p."post_id" = t."post_id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Transaction" WHERE "total_amount" IS NULL) THEN
    RAISE EXCEPTION 'total_amount backfill left NULLs (direct purchase of a post without price?)';
  END IF;
END $$;
ALTER TABLE "Transaction" ALTER COLUMN "total_amount" SET NOT NULL;

-- 3.2 child tables
CREATE TABLE "Transaction_Shipment" (
  "transaction_id"          INTEGER      NOT NULL,
  "tracking_number"         VARCHAR(100),
  "estimated_delivery_date" DATE,
  "shipped_at"              TIMESTAMP(6),
  CONSTRAINT "Transaction_Shipment_pkey" PRIMARY KEY ("transaction_id"),
  CONSTRAINT "Transaction_Shipment_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("transaction_id")
);

CREATE TABLE "Transaction_Payment" (
  "payment_id"       SERIAL       NOT NULL,
  "transaction_id"   INTEGER      NOT NULL,
  "slip_image_url"   VARCHAR(500) NOT NULL,
  "payment_status"   VARCHAR(20)  DEFAULT 'Pending',
  "rejection_reason" VARCHAR(500),
  "handled_by"       INTEGER,
  "handled_at"       TIMESTAMP(6),
  "created_at"       TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transaction_Payment_pkey" PRIMARY KEY ("payment_id"),
  CONSTRAINT "Transaction_Payment_payment_status_check"
    CHECK ("payment_status" IN ('Pending', 'Confirmed', 'Rejected')),
  CONSTRAINT "Transaction_Payment_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("transaction_id"),
  CONSTRAINT "Transaction_Payment_handled_by_fkey"
    FOREIGN KEY ("handled_by") REFERENCES "User"("user_id")
);
CREATE INDEX "Transaction_Payment_transaction_id_created_at_idx"
  ON "Transaction_Payment"("transaction_id", "created_at");
-- At most one slip waiting for review / already confirmed per transaction.
CREATE UNIQUE INDEX "Transaction_Payment_one_open_slip"
  ON "Transaction_Payment"("transaction_id")
  WHERE "payment_status" IN ('Pending', 'Confirmed');

CREATE TABLE "Transaction_Cancellation" (
  "cancellation_id" SERIAL       NOT NULL,
  "transaction_id"  INTEGER      NOT NULL,
  "requested_by"    INTEGER      NOT NULL,
  "reason"          VARCHAR(500),
  "requested_at"    TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  "response"        VARCHAR(20)  DEFAULT 'Pending',
  "responded_at"    TIMESTAMP(6),
  CONSTRAINT "Transaction_Cancellation_pkey" PRIMARY KEY ("cancellation_id"),
  CONSTRAINT "Transaction_Cancellation_response_check"
    CHECK ("response" IN ('Pending', 'Approved', 'Rejected')),
  CONSTRAINT "Transaction_Cancellation_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("transaction_id"),
  CONSTRAINT "Transaction_Cancellation_requested_by_fkey"
    FOREIGN KEY ("requested_by") REFERENCES "User"("user_id")
);
CREATE INDEX "Transaction_Cancellation_transaction_id_requested_at_idx"
  ON "Transaction_Cancellation"("transaction_id", "requested_at");
-- At most one unanswered cancellation request per transaction.
CREATE UNIQUE INDEX "Transaction_Cancellation_one_pending"
  ON "Transaction_Cancellation"("transaction_id")
  WHERE "response" = 'Pending';

CREATE TABLE "Transaction_Refund" (
  "transaction_id"           INTEGER      NOT NULL,
  "item_return_confirmed_at" TIMESTAMP(6),
  "created_at"               TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transaction_Refund_pkey" PRIMARY KEY ("transaction_id"),
  CONSTRAINT "Transaction_Refund_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("transaction_id")
);

CREATE TABLE "Transaction_Refund_Slip" (
  "refund_slip_id"   SERIAL       NOT NULL,
  "transaction_id"   INTEGER      NOT NULL,
  "refund_slip_url"  VARCHAR(500) NOT NULL,
  "refund_status"    VARCHAR(20)  DEFAULT 'Pending',
  "rejection_reason" VARCHAR(500),
  "handled_at"       TIMESTAMP(6),
  "created_at"       TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transaction_Refund_Slip_pkey" PRIMARY KEY ("refund_slip_id"),
  CONSTRAINT "Transaction_Refund_Slip_refund_status_check"
    CHECK ("refund_status" IN ('Pending', 'Confirmed', 'Rejected')),
  CONSTRAINT "Transaction_Refund_Slip_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "Transaction_Refund"("transaction_id")
);
CREATE INDEX "Transaction_Refund_Slip_transaction_id_created_at_idx"
  ON "Transaction_Refund_Slip"("transaction_id", "created_at");
CREATE UNIQUE INDEX "Transaction_Refund_Slip_one_open_slip"
  ON "Transaction_Refund_Slip"("transaction_id")
  WHERE "refund_status" IN ('Pending', 'Confirmed');

-- RLS on, no policies: same posture as every other table (only the backend role gets in).
ALTER TABLE "Transaction_Shipment"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction_Payment"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction_Cancellation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction_Refund"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction_Refund_Slip"  ENABLE ROW LEVEL SECURITY;

-- 3.3 move the data
-- Payment slips. Upload time = the old payment_confirmed_by_buyer_at (fallback: created_at).
-- Seller confirmation -> Confirmed + handled_by/handled_at. The old schema had no column for
-- a rejected slip, so no row can be Rejected.
INSERT INTO "Transaction_Payment"
  ("transaction_id", "slip_image_url", "payment_status", "handled_by", "handled_at", "created_at")
SELECT t."transaction_id",
       t."slip_image_url",
       CASE WHEN t."payment_confirmed_by_seller_at" IS NOT NULL THEN 'Confirmed' ELSE 'Pending' END,
       CASE WHEN t."payment_confirmed_by_seller_at" IS NOT NULL THEN t."seller_id" END,
       t."payment_confirmed_by_seller_at",
       COALESCE(t."payment_confirmed_by_buyer_at", t."created_at")
FROM "Transaction" t
WHERE t."slip_image_url" IS NOT NULL
ORDER BY t."transaction_id";

INSERT INTO "Transaction_Shipment" ("transaction_id", "tracking_number", "estimated_delivery_date")
SELECT "transaction_id", "tracking_number", "estimated_delivery_date"
FROM "Transaction"
WHERE "tracking_number" IS NOT NULL OR "estimated_delivery_date" IS NOT NULL
ORDER BY "transaction_id";

-- The old schema did not record when the other side answered, so responded_at stays NULL
-- even for Approved/Rejected rows; read `response`, not responded_at, for the legacy rows.
INSERT INTO "Transaction_Cancellation"
  ("transaction_id", "requested_by", "reason", "requested_at", "response")
SELECT "transaction_id",
       "cancellation_requested_by",
       "cancellation_reason",
       COALESCE("cancellation_requested_at", "created_at"),
       COALESCE("cancellation_response", 'Pending')
FROM "Transaction"
WHERE "cancellation_requested_by" IS NOT NULL OR "cancellation_requested_at" IS NOT NULL
ORDER BY "transaction_id";

-- Refund header. created_at = when the seller submitted the refund slip (best evidence we have).
INSERT INTO "Transaction_Refund" ("transaction_id", "item_return_confirmed_at", "created_at")
SELECT "transaction_id",
       "item_return_confirmed_at",
       COALESCE("refund_submitted_at", "created_at")
FROM "Transaction"
WHERE "refund_slip_url" IS NOT NULL OR "item_return_confirmed_at" IS NOT NULL
ORDER BY "transaction_id";

-- Refund slips. The old boolean refund_confirmed_by_buyer has no timestamp, so Confirmed rows
-- get handled_at = migration time (keeps the rule "handled_at IS NOT NULL <=> decided").
INSERT INTO "Transaction_Refund_Slip"
  ("transaction_id", "refund_slip_url", "refund_status", "handled_at", "created_at")
SELECT "transaction_id",
       "refund_slip_url",
       CASE WHEN COALESCE("refund_confirmed_by_buyer", FALSE) THEN 'Confirmed' ELSE 'Pending' END,
       CASE WHEN COALESCE("refund_confirmed_by_buyer", FALSE) THEN CURRENT_TIMESTAMP END,
       COALESCE("refund_submitted_at", "created_at")
FROM "Transaction"
WHERE "refund_slip_url" IS NOT NULL
ORDER BY "transaction_id";

-- 3.4 safety net: every legacy value must have a home before the old columns go away
DO $$
DECLARE
  bad TEXT := '';
BEGIN
  IF (SELECT count(*) FROM "Transaction_Payment")
     <> (SELECT count(*) FROM "Transaction" WHERE "slip_image_url" IS NOT NULL) THEN
    bad := bad || ' payment';
  END IF;
  IF (SELECT count(*) FROM "Transaction_Shipment")
     <> (SELECT count(*) FROM "Transaction" WHERE "tracking_number" IS NOT NULL OR "estimated_delivery_date" IS NOT NULL) THEN
    bad := bad || ' shipment';
  END IF;
  IF (SELECT count(*) FROM "Transaction_Cancellation")
     <> (SELECT count(*) FROM "Transaction" WHERE "cancellation_requested_by" IS NOT NULL OR "cancellation_requested_at" IS NOT NULL) THEN
    bad := bad || ' cancellation';
  END IF;
  IF (SELECT count(*) FROM "Transaction_Refund")
     <> (SELECT count(*) FROM "Transaction" WHERE "refund_slip_url" IS NOT NULL OR "item_return_confirmed_at" IS NOT NULL) THEN
    bad := bad || ' refund';
  END IF;
  IF (SELECT count(*) FROM "Transaction_Refund_Slip")
     <> (SELECT count(*) FROM "Transaction" WHERE "refund_slip_url" IS NOT NULL) THEN
    bad := bad || ' refund_slip';
  END IF;
  -- Information that would be lost silently.
  IF EXISTS (SELECT 1 FROM "Transaction" WHERE "refund_submitted_at" IS NOT NULL AND "refund_slip_url" IS NULL) THEN
    bad := bad || ' refund_submitted_at_without_slip';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Transaction" t JOIN "Report" r ON r."report_id" = t."active_report_id"
    WHERE NOT (r."report_type" = 'Transaction' AND r."target_id" = t."transaction_id")
  ) THEN
    bad := bad || ' active_report_not_discoverable_via_Report';
  END IF;
  IF bad <> '' THEN
    RAISE EXCEPTION 'Transaction split verification failed:%', bad;
  END IF;
END $$;

-- 3.5 drop the old columns (their FKs and CHECKs go with them)
ALTER TABLE "Transaction"
  DROP COLUMN "slip_image_url",
  DROP COLUMN "tracking_number",
  DROP COLUMN "estimated_delivery_date",
  DROP COLUMN "payment_confirmed_by_buyer_at",
  DROP COLUMN "payment_confirmed_by_seller_at",
  DROP COLUMN "item_return_confirmed_at",
  DROP COLUMN "cancellation_requested_by",
  DROP COLUMN "cancellation_reason",
  DROP COLUMN "cancellation_requested_at",
  DROP COLUMN "cancellation_response",
  DROP COLUMN "refund_slip_url",
  DROP COLUMN "refund_confirmed_by_buyer",
  DROP COLUMN "refund_submitted_at",
  DROP COLUMN "active_report_id";
