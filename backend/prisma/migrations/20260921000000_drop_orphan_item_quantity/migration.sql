BEGIN;
-- item_quantity was added manually outside prisma migrate; never in schema.prisma,
-- unread/unwritten by any app code. quantity is the real column app code uses.
ALTER TABLE "Item" DROP COLUMN IF EXISTS "item_quantity";
COMMIT;
