import { MigrationInterface, QueryRunner } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Database changes are written in pure SQL from here on: the schema change
 * lives in migrations/sql/*.up.sql / *.down.sql, reviewable by any DBA
 * without reading TypeScript. This file only loads and executes it.
 */
const sql = (file: string) =>
  readFileSync(join(__dirname, 'sql', file), 'utf8');

export class HardenDatabaseRoles1790000008000 implements MigrationInterface {
  name = 'HardenDatabaseRoles1790000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(sql('1790000008000-harden-roles.up.sql'));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(sql('1790000008000-harden-roles.down.sql'));
  }
}
