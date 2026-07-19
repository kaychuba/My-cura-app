import { MigrationInterface, QueryRunner } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';

const sql = (file: string) => readFileSync(join(__dirname, 'sql', file), 'utf8');

export class TamperResistantAudit1790000010000 implements MigrationInterface {
  name = 'TamperResistantAudit1790000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(sql('1790000010000-tamper-resistant-audit.up.sql'));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(sql('1790000010000-tamper-resistant-audit.down.sql'));
  }
}
