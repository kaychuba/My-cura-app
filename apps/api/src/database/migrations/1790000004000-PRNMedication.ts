import { MigrationInterface, QueryRunner } from "typeorm";

/** PRN ("as needed") medications: flagged by the admin with instructions. */
export class PRNMedication1790000004000 implements MigrationInterface {
    name = 'PRNMedication1790000004000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medications" ADD "is_prn" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "medications" ADD "prn_instructions" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medications" DROP COLUMN "prn_instructions"`);
        await queryRunner.query(`ALTER TABLE "medications" DROP COLUMN "is_prn"`);
    }
}
