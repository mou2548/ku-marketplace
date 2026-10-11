-- Additive and safe to reapply; existing accounts and listings are unchanged.
CREATE TABLE IF NOT EXISTS "User_Follow" (
  "follower_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
  "followed_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("follower_id", "followed_id"),
  CONSTRAINT "User_Follow_no_self" CHECK ("follower_id" <> "followed_id")
);
CREATE INDEX IF NOT EXISTS "User_Follow_followed_id_created_at_idx"
  ON "User_Follow" ("followed_id", "created_at");
CREATE INDEX IF NOT EXISTS "User_Follow_follower_id_created_at_followed_id_idx"
  ON "User_Follow" ("follower_id", "created_at", "followed_id");
