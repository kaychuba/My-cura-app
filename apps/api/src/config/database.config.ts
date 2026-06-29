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

export function getDatabaseConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'mycura',
    password: process.env.DB_PASSWORD ?? 'mycura',
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
