import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { Prisma } from '@prisma/client';
import { additiveMigrationsSql, schemaV3Sql } from './schema-v3';

it('upgrades the legacy schema twice without losing existing rows or evidence', async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const schema = `upgrade_${process.pid}_${Date.now()}`;
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(
      readFileSync(resolve(__dirname, 'fixtures/legacy-init.sql'), 'utf8'),
    );
    const tables = (
      await client.query<{ table_name: string }>(
        'SELECT table_name FROM information_schema.tables WHERE table_schema=$1',
        [schema],
      )
    ).rows;
    const snapshots = new Map<string, Record<string, unknown>[]>();
    for (const { table_name: table } of tables)
      snapshots.set(
        table,
        (
          await client.query<Record<string, unknown>>(
            `SELECT * FROM "${table}" ORDER BY 1`,
          )
        ).rows,
      );
    for (let pass = 0; pass < 2; pass++) {
      for (const migration of additiveMigrationsSql())
        await client.query(migration);
    }
    for (const [table, before] of snapshots) {
      const columns = Object.keys(before[0] ?? {});
      if (!columns.length) continue;
      const after = (
        await client.query<Record<string, unknown>>(
          `SELECT ${columns.map((name) => `"${name}"`).join(',')} FROM "${table}" ORDER BY 1`,
        )
      ).rows;
      expect(after).toEqual(before);
    }
    // Schema v3 moves data into new tables and drops the old columns, so it
    // runs once, after the row-for-row comparison above.
    await client.query(schemaV3Sql());
    for (const model of Prisma.dmmf.datamodel.models) {
      const columns = model.fields
        .filter((field) => field.kind !== 'object')
        .map((field) => `"${field.dbName ?? field.name}"`)
        .join(',');
      await client.query(
        `SELECT ${columns} FROM "${model.dbName ?? model.name}" LIMIT 1`,
      );
    }
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    client.release();
    await pool.end();
  }
});
