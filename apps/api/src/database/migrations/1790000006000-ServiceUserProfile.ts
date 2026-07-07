import { MigrationInterface, QueryRunner } from "typeorm";

/** Full service-user profile: gender, condition, photo, care commencement,
 *  hospital and pharmacy contacts. */
export class ServiceUserProfile1790000006000 implements MigrationInterface {
    name = 'ServiceUserProfile1790000006000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_users" ADD "gender" character varying`);
        await queryRunner.query(`ALTER TABLE "service_users" ADD "condition_summary" text`);
        await queryRunner.query(`ALTER TABLE "service_users" ADD "photo_url" character varying`);
        await queryRunner.query(`ALTER TABLE "service_users" ADD "care_commenced_on" date`);
        await queryRunner.query(`ALTER TABLE "service_users" ADD "hospital_contact" jsonb`);
        await queryRunner.query(`ALTER TABLE "service_users" ADD "pharmacy_contact" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_users" DROP COLUMN "pharmacy_contact"`);
        await queryRunner.query(`ALTER TABLE "service_users" DROP COLUMN "hospital_contact"`);
        await queryRunner.query(`ALTER TABLE "service_users" DROP COLUMN "care_commenced_on"`);
        await queryRunner.query(`ALTER TABLE "service_users" DROP COLUMN "photo_url"`);
        await queryRunner.query(`ALTER TABLE "service_users" DROP COLUMN "condition_summary"`);
        await queryRunner.query(`ALTER TABLE "service_users" DROP COLUMN "gender"`);
    }
}
