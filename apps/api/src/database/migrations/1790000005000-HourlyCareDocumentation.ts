import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Hourly care documentation: admins allocate daily care hours per service
 * user; carers write one documentation entry per hour with an execution
 * classification (executed / partially / not executed / other + reason).
 */
export class HourlyCareDocumentation1790000005000 implements MigrationInterface {
    name = 'HourlyCareDocumentation1790000005000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_users" ADD "care_hours_per_day" integer`);
        await queryRunner.query(`ALTER TABLE "service_users" ADD "care_day_start" character varying`);

        await queryRunner.query(`CREATE TABLE "care_doc_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "service_user_id" uuid NOT NULL, "care_worker_id" uuid NOT NULL, "slot_at" TIMESTAMP WITH TIME ZONE NOT NULL, "documentation" text NOT NULL, "execution" character varying NOT NULL, "reason" character varying NOT NULL, CONSTRAINT "PK_care_doc_entries_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_care_doc_tenant_su_slot" ON "care_doc_entries" ("tenant_id", "service_user_id", "slot_at")`);
        await queryRunner.query(`CREATE INDEX "IDX_care_doc_tenant_worker_slot" ON "care_doc_entries" ("tenant_id", "care_worker_id", "slot_at")`);
        await queryRunner.query(`ALTER TABLE "care_doc_entries" ENABLE ROW LEVEL SECURITY`);
        await queryRunner.query(`CREATE POLICY tenant_isolation ON "care_doc_entries" USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "care_doc_entries"`);
        await queryRunner.query(`DROP TABLE "care_doc_entries"`);
        await queryRunner.query(`ALTER TABLE "service_users" DROP COLUMN "care_day_start"`);
        await queryRunner.query(`ALTER TABLE "service_users" DROP COLUMN "care_hours_per_day"`);
    }
}
