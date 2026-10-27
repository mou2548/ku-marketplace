// Inspect legacy pending offers; use --apply to cancel only invalid pending offers.
// Accepted offers, transactions, inventory and evidence are never rewritten.
require('dotenv').config({ quiet: true });
const { Client } = require('pg');

// item_committed mirrors backend/src/items/item-availability.ts's formula:
// an item is "fully available" (no open or closed-but-unreleased channel)
// when committed = 0. Post's item_status column no longer means anything
// (multi-listing round 1) — a listing/offered item's real availability is
// this sum across every Post and Giveaway_Post channel, not a status string.
const invalidOffersSql = `
WITH item_committed AS (
  SELECT i.item_id,
    COALESCE(post_sum.committed, 0) + COALESCE(giveaway_sum.committed, 0) AS committed
  FROM "Item" i
  LEFT JOIN (
    SELECT item_id, SUM(
      CASE WHEN deleted_at IS NULL AND post_status = 'Active'
           THEN quantity_total
           ELSE quantity_total - quantity_remaining END
    ) AS committed
    FROM "Post"
    GROUP BY item_id
  ) post_sum ON post_sum.item_id = i.item_id
  LEFT JOIN (
    SELECT item_id, SUM(quantity) AS committed
    FROM "Giveaway_Post"
    WHERE item_id IS NOT NULL
    GROUP BY item_id
  ) giveaway_sum ON giveaway_sum.item_id = i.item_id
)
SELECT o.offer_id, o.post_id,
  CASE
    WHEN p.deleted_at IS NOT NULL OR p.post_status <> 'Active'
      OR p.quantity_remaining < 1 OR listed.deleted_at IS NOT NULL
      THEN 'Listing unavailable'
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
  OR listed.deleted_at IS NOT NULL
  OR p.post_type NOT IN ('Both', 'TradeOnly') OR listed.owner_id = o.proposer_id
  OR NOT EXISTS (SELECT 1 FROM "Offer_Item" oi WHERE oi.offer_id = o.offer_id)
  OR EXISTS (
    SELECT 1 FROM "Offer_Item" oi
    JOIN "Item" i ON i.item_id = oi.item_id
    JOIN item_committed ic ON ic.item_id = i.item_id
    WHERE oi.offer_id = o.offer_id AND (
      i.owner_id <> o.proposer_id OR ic.committed <> 0 OR i.deleted_at IS NOT NULL
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
