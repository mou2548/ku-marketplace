# Rollback — 20260911130000_giveaway_ticket_qr_issued_at

```sql
ALTER TABLE "Giveaway_Ticket" DROP COLUMN IF EXISTS "qr_issued_at";
```

The column only ever recorded when a QR token was minted; dropping it makes
`qrGenerate` mint a fresh token on the next call, losing nothing else.
