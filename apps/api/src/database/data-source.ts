// TypeORM CLI DataSource — used by the migration:generate / migration:run /
// migration:revert npm scripts (see package.json). The runtime app builds its
// own connection via getDatabaseConfig(); keep the two in sync.

import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';

// Load apps/api/.env regardless of the directory the CLI is invoked from
loadEnv({ path: join(__dirname, '../../.env') });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'mycura',
  password: process.env.DB_PASSWORD ?? 'mycura',
  database: process.env.DB_NAME ?? 'mycura',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
});
