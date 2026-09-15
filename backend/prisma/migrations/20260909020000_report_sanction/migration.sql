-- NULL preserves the unknown sanction on legacy decisions.
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "sanction" VARCHAR(30);
