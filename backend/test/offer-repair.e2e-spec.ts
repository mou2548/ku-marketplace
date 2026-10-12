import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { additiveMigrationsSql, schemaV3Sql } from './schema-v3';
// The same CLI implementation is exercised against an isolated legacy schema.
const { repairInvalidOffers } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../scripts/repair-invalid-offers.cjs') as {
    repairInvalidOffers: (
      client: PoolClient,
      apply?: boolean,
    ) => Promise<{ offer_id: number }[]>;
  };

it('previews legacy invalid offers and repairs them idempotently without changing accepted deals or inventory', async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const schema = `offer_repair_${process.pid}_${Date.now()}`;
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(
      readFileSync(resolve(__dirname, 'fixtures/legacy-init.sql'), 'utf8'),
    );
    for (const migration of additiveMigrationsSql()) {
      await client.query(migration);
    }
    await client.query(schemaV3Sql());
    const before = (
      await client.query<{ offer_id: number; offer_status: string }>(
        'SELECT * FROM "Offer" ORDER BY offer_id',
      )
    ).rows;
    const inventory = (
      await client.query('SELECT * FROM "Item" ORDER BY item_id')
    ).rows;
    const transactions = (
      await client.query('SELECT * FROM "Transaction" ORDER BY transaction_id')
    ).rows;
    expect(await repairInvalidOffers(client)).toEqual([
      expect.objectContaining({ offer_id: 1 }),
    ]);
    expect(
      (
        await client.query<{ offer_id: number; offer_status: string }>(
          'SELECT * FROM "Offer" ORDER BY offer_id',
        )
      ).rows,
    ).toEqual(before);
    await repairInvalidOffers(client, true);
    expect(await repairInvalidOffers(client, true)).toEqual([]);
    expect(
      (
        await client.query<{ offer_id: number; offer_status: string }>(
          'SELECT * FROM "Offer" ORDER BY offer_id',
        )
      ).rows,
    ).toEqual(
      before.map((row) =>
        row.offer_id === 1 ? { ...row, offer_status: 'Cancelled' } : row,
      ),
    );
    expect(
      (await client.query('SELECT * FROM "Item" ORDER BY item_id')).rows,
    ).toEqual(inventory);
    expect(
      (
        await client.query(
          'SELECT * FROM "Transaction" ORDER BY transaction_id',
        )
      ).rows,
    ).toEqual(transactions);
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    client.release();
    await pool.end();
  }
});
