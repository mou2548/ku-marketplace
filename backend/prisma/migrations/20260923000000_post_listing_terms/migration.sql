-- The listing form has always collected a description and, for a trade post,
-- "what do you want in trade" — neither was ever persisted (see
-- frontend/docs/design/api-gaps.md, "Trade terms and the listing description
-- are not stored"). These are the channel's own terms, distinct from
-- Item.description (the item's own facts, shared by every channel it backs).
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "wanted_item_offer" TEXT;
