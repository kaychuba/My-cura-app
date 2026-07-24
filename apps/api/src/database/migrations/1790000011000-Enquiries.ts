import { MigrationInterface, QueryRunner } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';

const sql = (file: string) => readFileSync(join(__dirname, 'sql', file), 'utf8');

export class Enquiries1790000011000 implements MigrationInterface {
  name = 'Enquiries1790000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(sql('1790000011000-enquiries.up.sql'));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(sql('1790000011000-enquiries.down.sql'));
  }
}
