import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (...path: string[]) =>
  readFileSync(resolve(__dirname, ...path), 'utf8');

const MIGRATIONS = resolve(__dirname, '../prisma/migrations');
export const SCHEMA_V3_MIGRATION = '20261011000000_schema_v3_transaction_split';

/** The idempotent, additive SQL updates that predate schema v3, in order. */
export const additiveMigrationsSql = () =>
  readdirSync(MIGRATIONS)
    .sort()
    .filter((name) => name < SCHEMA_V3_MIGRATION)
    .map((name) => read(MIGRATIONS, name, 'migration.sql'));

/**
 * Takes a database built from an init file to schema v3. The migration moves
 * data and drops columns, so unlike the additive ones it runs exactly once.
 */
export const schemaV3Sql = () =>
  [
    read('../prisma/local/before-schema-v3.sql'),
    read(MIGRATIONS, SCHEMA_V3_MIGRATION, 'migration.sql'),
  ].join('\n');

/** What a fresh clone ends up with: init.sql, then schema v3 on top. */
export const freshInstallSql = () =>
  [read('../../init.sql'), schemaV3Sql()].join('\n');
