# Rollback — 20260911120000_appointment_soft_delete

```sql
BEGIN;
DROP INDEX IF EXISTS "Appointment_Card_transaction_id_created_at_idx";
ALTER TABLE "Appointment_Card" DROP COLUMN IF EXISTS "deleted_at";
COMMIT;
```

`deleted_at` values cannot be reconstructed after the column is dropped. The
backfill above only ever *set* the column, so dropping it returns the table to
its pre-migration shape without losing any other data.
