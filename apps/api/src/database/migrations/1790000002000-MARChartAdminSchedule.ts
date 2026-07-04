import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * MAR chart, admin-driven:
 * - medications gain purpose (what it's for), quantity and formulation,
 *   all set by the admin and shown read-only in the carer portal
 * - mar_records support admin-scheduled doses (status 'scheduled',
 *   care_worker_id nullable until a carer records the outcome) plus the
 *   carer's initials signature, their selected completion time
 *   (administered_at) and the server-side recorded_at timestamp
 * - new outcome statuses: parent_administered, not_administered, other
 */
export class MARChartAdminSchedule1790000002000 implements MigrationInterface {
    name = 'MARChartAdminSchedule1790000002000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."mar_records_status_enum" ADD VALUE IF NOT EXISTS 'scheduled'`);
        await queryRunner.query(`ALTER TYPE "public"."mar_records_status_enum" ADD VALUE IF NOT EXISTS 'parent_administered'`);
        await queryRunner.query(`ALTER TYPE "public"."mar_records_status_enum" ADD VALUE IF NOT EXISTS 'not_administered'`);
        await queryRunner.query(`ALTER TYPE "public"."mar_records_status_enum" ADD VALUE IF NOT EXISTS 'other'`);

        await queryRunner.query(`CREATE TYPE "public"."medications_formulation_enum" AS ENUM('tablet', 'capsule', 'liquid', 'powder', 'suppository', 'cream', 'ointment', 'patch', 'inhaler', 'drops', 'injection', 'spray')`);
        await queryRunner.query(`ALTER TABLE "medications" ADD "purpose" text`);
        await queryRunner.query(`ALTER TABLE "medications" ADD "quantity" character varying`);
        await queryRunner.query(`ALTER TABLE "medications" ADD "formulation" "public"."medications_formulation_enum"`);

        await queryRunner.query(`ALTER TABLE "mar_records" ALTER COLUMN "care_worker_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "mar_records" ADD "recorded_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "mar_records" ADD "initials" character varying`);
        await queryRunner.query(`ALTER TABLE "mar_records" ADD "witness_initials" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "mar_records" DROP COLUMN "witness_initials"`);
        await queryRunner.query(`ALTER TABLE "mar_records" DROP COLUMN "initials"`);
        await queryRunner.query(`ALTER TABLE "mar_records" DROP COLUMN "recorded_at"`);
        await queryRunner.query(`ALTER TABLE "mar_records" ALTER COLUMN "care_worker_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "medications" DROP COLUMN "formulation"`);
        await queryRunner.query(`ALTER TABLE "medications" DROP COLUMN "quantity"`);
        await queryRunner.query(`ALTER TABLE "medications" DROP COLUMN "purpose"`);
        await queryRunner.query(`DROP TYPE "public"."medications_formulation_enum"`);
        // Postgres cannot remove enum values; the added mar status values stay.
    }
}
