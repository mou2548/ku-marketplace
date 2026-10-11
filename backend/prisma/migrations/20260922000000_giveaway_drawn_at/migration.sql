-- Additive and safe to reapply; databases seeded from a newer init.sql
-- already have this column. Records when a giveaway's allocation was drawn.
ALTER TABLE "Giveaway_Post" ADD COLUMN IF NOT EXISTS "drawn_at" TIMESTAMP(6);
