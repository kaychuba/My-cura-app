import { MigrationInterface, QueryRunner } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';

const sql = (file: string) => readFileSync(join(__dirname, 'sql', file), 'utf8');

export class ConsentManagement1790000009000 implements MigrationInterface {
  name = 'ConsentManagement1790000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(sql('1790000009000-consent-management.up.sql'));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(sql('1790000009000-consent-management.down.sql'));
  }
}
