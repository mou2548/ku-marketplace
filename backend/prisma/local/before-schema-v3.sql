-- Run once, before 20261011000000_schema_v3_transaction_split, on a database
-- that was built from init.sql (local Docker, test schemas). The migration was
-- written against the deployed database and stops on three things an
-- init.sql database has that the deployed one does not. Safe to run again,
-- and a no-op on a database that already matches.

-- 1. Demo items in categories outside the ten the migration's CHECK allows.
UPDATE "Item" SET "category" = 'Home & Living' WHERE "category" = 'Appliances';
UPDATE "Item" SET "category" = 'Other'
WHERE "category" NOT IN ('Clothing', 'Electronics', 'Home & Living', 'Bags', 'Vehicles',
                         'Sports', 'Stationery', 'Tickets', 'Books', 'Other');

-- 2. init.sql declares this pair unique as a table constraint; the migration
--    replaces it with DROP INDEX, which a constraint refuses.
ALTER TABLE "Giveaway_Ticket"
  DROP CONSTRAINT IF EXISTS "Giveaway_Ticket_giveaway_id_receiver_id_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Giveaway_Ticket_giveaway_id_receiver_id_key"
  ON "Giveaway_Ticket" ("giveaway_id", "receiver_id");

-- 3. active_report_id is dropped: from then on a transaction's reports are
--    found through Report (report_type, target_id). A link to a report about
--    something else cannot be carried over, and the migration refuses it.
UPDATE "Transaction" t SET "active_report_id" = NULL
WHERE t."active_report_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Report" r
    WHERE r."report_id" = t."active_report_id"
      AND r."report_type" = 'Transaction'
      AND r."target_id" = t."transaction_id"
  );
