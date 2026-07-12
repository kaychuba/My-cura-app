import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'mycura',
  password: process.env.DB_PASSWORD ?? 'mycura',
  database: process.env.DB_NAME ?? 'mycura',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
}));

/**
 * Main application connection. Connects as the RLS-CONSTRAINED role
 * (mycura_app, created by the RLS migration): the database itself refuses
 * to return rows outside the tenant set by set_tenant_id() for the request.
 * Migrations and seeds keep using the owner role via data-source.ts.
 */
export function getDatabaseConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_APP_USERNAME ?? 'mycura_app',
    password: process.env.DB_APP_PASSWORD ?? 'mycura_app_password',
    database: process.env.DB_NAME ?? 'mycura',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    extra: {
      // Connection pool sizing for multi-tenant scale
      max: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    },
  };
}

/**
 * Privileged connection used ONLY for authentication and platform-level
 * tenant administration — the places that must see rows before a tenant
 * context exists (login by email, token validation, signup). Uses the
 * schema owner in dev; production points DB_SUPER_USERNAME at the
 * BYPASSRLS mycura_super role via Secrets Manager.
 */
export function getAuthDatabaseConfig(): TypeOrmModuleOptions {
  return {
    name: 'auth',
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_SUPER_USERNAME ?? process.env.DB_USERNAME ?? 'mycura',
    password: process.env.DB_SUPER_PASSWORD ?? process.env.DB_PASSWORD ?? 'mycura',
    database: process.env.DB_NAME ?? 'mycura',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
    extra: {
      max: parseInt(process.env.DB_AUTH_POOL_MAX ?? '5', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    },
  };
}
