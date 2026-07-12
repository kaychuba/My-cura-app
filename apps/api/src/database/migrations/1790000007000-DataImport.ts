import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Data migration from other care software:
 * - external_ref columns so re-importing the same export never duplicates
 *   records (idempotent upserts keyed on the source system's own IDs)
 * - import_jobs history so every migration run is auditable
 */
export class DataImport1790000007000 implements MigrationInterface {
    name = 'DataImport1790000007000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_users" ADD "external_ref" character varying`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_su_tenant_external_ref" ON "service_users" ("tenant_id", "external_ref") WHERE "external_ref" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "medications" ADD "external_ref" character varying`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_med_tenant_external_ref" ON "medications" ("tenant_id", "external_ref") WHERE "external_ref" IS NOT NULL`);

        await queryRunner.query(`CREATE TABLE "import_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid NOT NULL, "entity_type" character varying NOT NULL, "file_name" character varying, "template" character varying, "row_count" integer NOT NULL DEFAULT 0, "created_count" integer NOT NULL DEFAULT 0, "updated_count" integer NOT NULL DEFAULT 0, "error_count" integer NOT NULL DEFAULT 0, "errors" jsonb, CONSTRAINT "PK_import_jobs_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_import_jobs_tenant_created" ON "import_jobs" ("tenant_id", "created_at")`);
        await queryRunner.query(`ALTER TABLE "import_jobs" ENABLE ROW LEVEL SECURITY`);
        await queryRunner.query(`CREATE POLICY tenant_isolation ON "import_jobs" USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())`);
        await queryRunner.query(`GRANT ALL PRIVILEGES ON "import_jobs" TO mycura_app`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "import_jobs"`);
        await queryRunner.query(`DROP TABLE "import_jobs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_med_tenant_external_ref"`);
        await queryRunner.query(`ALTER TABLE "medications" DROP COLUMN "external_ref"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_su_tenant_external_ref"`);
        await queryRunner.query(`ALTER TABLE "service_users" DROP COLUMN "external_ref"`);
    }
}
