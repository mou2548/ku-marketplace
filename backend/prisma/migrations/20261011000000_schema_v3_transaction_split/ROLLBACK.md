# Rollback: 20261011000000_schema_v3_transaction_split

This migration **moves data** out of `Transaction` and drops 14 columns, drops
`Giveaway_Post.item_name`, and creates `Item` rows for legacy giveaways. There is no
loss-free automatic down-migration, so the safe rollback is a restore:

1. Before applying to a real database, take a backup / Supabase PITR point
   (or `pg_dump --schema=public`).
2. If the migration itself fails, nothing to do: it runs in one transaction and the
   row-count assertions roll everything back.
3. If it applied and must be undone: restore the backup taken in step 1, then delete the
   row for this migration from `_prisma_migrations` (or `prisma migrate resolve --rolled-back
   20261011000000_schema_v3_transaction_split`).

Data that is approximate after the move (cannot be reconstructed exactly in either direction):

- `Transaction_Cancellation.responded_at` is NULL for legacy rows (read `response`).
- `Transaction_Refund_Slip.handled_at` of legacy Confirmed rows is the migration time.
- `Transaction_Refund.created_at` / `Transaction_Refund_Slip.created_at` of legacy rows use the old `refund_submitted_at`.
- Legacy rejected payment slips cannot exist (the old schema had no column for them).
- The old `Transaction.refund_submitted_at` is folded into the refund tables' `created_at`.
