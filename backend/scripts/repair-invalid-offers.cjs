// Inspect legacy pending offers; use --apply to cancel only invalid pending offers.
// Accepted offers, transactions, inventory and evidence are never rewritten.
require('dotenv').config({ quiet: true });
const { Client } = require('pg');

const invalidOffersSql = `
SELECT o.offer_id, o.post_id,
  CASE
    WHEN p.deleted_at IS NOT NULL OR p.post_status <> 'Active'
      OR p.quantity_remaining < 1 OR listed.deleted_at IS NOT NULL
      OR listed.item_status <> 'Listed' THEN 'Listing unavailable'
    WHEN p.post_type NOT IN ('Both', 'TradeOnly') THEN 'Listing does not support trades'
    WHEN listed.owner_id = o.proposer_id THEN 'Own listing'
    WHEN NOT EXISTS (SELECT 1 FROM "Offer_Item" oi WHERE oi.offer_id = o.offer_id)
      THEN 'No offered items'
    ELSE 'Offered item unavailable, owned by another user or reserved'
  END AS reason
FROM "Offer" o JOIN "Post" p ON p.post_id = o.post_id
JOIN "Item" listed ON listed.item_id = p.item_id
WHERE o.offer_status = 'Pending' AND (
  p.deleted_at IS NOT NULL OR p.post_status <> 'Active' OR p.quantity_remaining < 1
  OR listed.deleted_at IS NOT NULL OR listed.item_status <> 'Listed'
  OR p.post_type NOT IN ('Both', 'TradeOnly') OR listed.owner_id = o.proposer_id
  OR NOT EXISTS (SELECT 1 FROM "Offer_Item" oi WHERE oi.offer_id = o.offer_id)
  OR EXISTS (
    SELECT 1 FROM "Offer_Item" oi JOIN "Item" i ON i.item_id = oi.item_id
    WHERE oi.offer_id = o.offer_id AND (
      i.owner_id <> o.proposer_id OR i.item_status <> 'Unlisted' OR i.deleted_at IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM "Offer_Item" reserved JOIN "Transaction" t ON t.offer_id = reserved.offer_id
        WHERE reserved.item_id = i.item_id AND
          t.transaction_status IN ('Pending', 'Processing', 'Pending Refund', 'Completed')
      )
    )
  )
) ORDER BY o.offer_id`;

async function repairInvalidOffers(client, apply = false) {
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  try {
    const { rows } = await client.query(invalidOffersSql);
    if (apply && rows.length) {
      await client.query(
        `UPDATE "Offer" SET offer_status = 'Cancelled' WHERE offer_status = 'Pending' AND offer_id = ANY($1::int[])`,
        [rows.map((row) => row.offer_id)],
      );
    }
    await client.query('COMMIT');
    return rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
module.exports = { repairInvalidOffers };

if (require.main === module) {
  (async () => {
    if (process.argv.slice(2).some((arg) => arg !== '--apply')) {
      throw new Error(
        'Usage: node scripts/repair-invalid-offers.cjs [--apply]',
      );
    }
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await client.connect();
      const apply = process.argv.includes('--apply');
      const rows = await repairInvalidOffers(client, apply);
      console.log(
        JSON.stringify(
          { mode: apply ? 'apply' : 'preview', offers: rows },
          null,
          2,
        ),
      );
    } finally {
      await client.end();
    }
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
