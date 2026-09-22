-- Multi-listing round 1: allow one Item to be split across multiple concurrent
-- Post/Giveaway_Post channels. Item.item_status is intentionally left in place
-- here; it is dropped in a later round only after all backend code stops
-- reading/writing it.

-- Post.item_id: drop the UNIQUE constraint (keep the FK, keep NOT NULL).
-- One item can now back more than one Post row at once.
ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_item_id_key";

-- Giveaway_Post: link to Item so a giveaway can be counted against the same
-- item's available quantity as its Post channels.
ALTER TABLE "Giveaway_Post" ADD COLUMN IF NOT EXISTS "item_id" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Giveaway_Post_item_id_fkey'
  ) THEN
    ALTER TABLE "Giveaway_Post"
      ADD CONSTRAINT "Giveaway_Post_item_id_fkey"
      FOREIGN KEY ("item_id") REFERENCES "Item"("item_id");
  END IF;
END $$;

-- item_name stops being the source of truth for the given item's display name
-- once item_id is set; keep it as an optional fallback label instead of a
-- required field.
ALTER TABLE "Giveaway_Post" ALTER COLUMN "item_name" DROP NOT NULL;
