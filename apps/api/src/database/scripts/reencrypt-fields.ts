/**
 * Re-encrypts every field-level-encrypted column with the CURRENT key after a
 * key rotation. Idempotent: rows already on the current key version are
 * skipped, so it can be re-run safely and stopped at any time.
 *
 * Usage (from apps/api, with the same .env the API uses — must include the
 * new key as ENCRYPTION_KEY/ENCRYPTION_KEY_VERSION and the old key inside
 * ENCRYPTION_KEYS_RETIRED):
 *
 *   npx ts-node -r tsconfig-paths/register src/database/scripts/reencrypt-fields.ts
 *
 * Runs as the OWNER role (same connection as migrations) because it must see
 * every tenant's rows. Full procedure: docs/DATA-PROTECTION.md §6.
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
loadEnv();

import { DataSource } from 'typeorm';
import {
  EncryptionKeyring,
  encryptWithKeyring,
  decryptWithKeyring,
  needsReencryption,
} from '@my-cura/shared-utils';

interface EncryptedColumn {
  table: string;
  column: string;
  pk: string;
}

/** Every encrypted-at-rest column in the schema. Extend when adding one. */
const ENCRYPTED_COLUMNS: EncryptedColumn[] = [
  { table: 'mar_records', column: 'signature_svg_enc', pk: 'id' },
  { table: 'mar_records', column: 'witness_sig_enc', pk: 'id' },
  { table: 'care_workers', column: 'ni_number_enc', pk: 'id' },
  { table: 'users', column: 'totp_secret_enc', pk: 'id' },
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function buildKeyring(): EncryptionKeyring {
  const current = Number(process.env['ENCRYPTION_KEY_VERSION'] ?? 1);
  const keys: Record<number, string> = { [current]: requireEnv('ENCRYPTION_KEY') };
  const retired = process.env['ENCRYPTION_KEYS_RETIRED'];
  if (retired) {
    for (const [v, k] of Object.entries(JSON.parse(retired) as Record<string, string>)) {
      keys[Number(v)] = k;
    }
  }
  return { current, keys };
}

async function main() {
  const ring = buildKeyring();
  const db = new DataSource({
    type: 'postgres',
    host: process.env['DB_HOST'] ?? 'localhost',
    port: Number(process.env['DB_PORT'] ?? 5432),
    username: process.env['DB_USERNAME'] ?? 'mycura',
    password: requireEnv('DB_PASSWORD'),
    database: process.env['DB_DATABASE'] ?? 'mycura',
  });
  await db.initialize();

  let rotated = 0;
  let skipped = 0;
  let failed = 0;

  for (const { table, column, pk } of ENCRYPTED_COLUMNS) {
    const rows: Record<string, string>[] = await db.query(
      `SELECT ${pk} AS pk, ${column} AS value FROM ${table} WHERE ${column} IS NOT NULL`,
    );
    for (const row of rows) {
      if (!needsReencryption(row['value'], ring)) {
        skipped++;
        continue;
      }
      try {
        const plaintext = decryptWithKeyring(row['value'], ring);
        const fresh = encryptWithKeyring(plaintext, ring);
        await db.query(`UPDATE ${table} SET ${column} = $1 WHERE ${pk} = $2`, [fresh, row['pk']]);
        rotated++;
      } catch (err) {
        // TOTP secrets written before encryption landed are stored raw and
        // cannot be decrypted — wrap them as-is under the current key.
        if (table === 'users' && column === 'totp_secret_enc') {
          const fresh = encryptWithKeyring(row['value'], ring);
          await db.query(`UPDATE ${table} SET ${column} = $1 WHERE ${pk} = $2`, [fresh, row['pk']]);
          rotated++;
        } else {
          failed++;
          console.error(`  FAILED ${table}.${column} pk=${row['pk']}: ${(err as Error).message}`);
        }
      }
    }
    console.log(`${table}.${column}: done`);
  }

  await db.destroy();
  console.log(`\nRe-encryption complete: ${rotated} rotated, ${skipped} already current, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
