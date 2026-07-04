import { MigrationInterface, QueryRunner } from "typeorm";

export class ComplianceModules1783130075959 implements MigrationInterface {
    name = 'ComplianceModules1783130075959'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "policies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "title" character varying NOT NULL, "summary" text, "content" text, "external_url" character varying, "document_s3_key" character varying, "published_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_by" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "requires_acknowledgement" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_603e09f183df0108d8695c57e28" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_830ce259a97bf1ac5722fd020b" ON "policies" ("tenant_id", "published_at") `);
        await queryRunner.query(`CREATE TABLE "policy_acknowledgements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "policy_id" uuid NOT NULL, "user_id" uuid NOT NULL, "acknowledged_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_621989181149ad611307d3e98aa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5c894fd8bbe9997c5d9b9226e2" ON "policy_acknowledgements" ("policy_id", "user_id") `);
        await queryRunner.query(`CREATE TABLE "whistleblowing_reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "reporter_id" uuid, "category" character varying NOT NULL, "description" text NOT NULL, "context" text, "status" character varying NOT NULL DEFAULT 'submitted', "reviewed_by" uuid, "review_notes" text, "closed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_b83069fb389b6fbab49ec0970cf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f722b35dc741254398138e6f18" ON "whistleblowing_reports" ("tenant_id", "status") `);
        await queryRunner.query(`CREATE TABLE "body_maps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "service_user_id" uuid NOT NULL, "care_worker_id" uuid NOT NULL, "shift_id" uuid, "markers" jsonb NOT NULL, "summary" text NOT NULL, "incident_id" uuid, CONSTRAINT "PK_c2aeacffc98cfc462bbff6230f7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_41c5838096617ee25d230b540e" ON "body_maps" ("tenant_id", "service_user_id", "created_at") `);
        // Tenant isolation — the dynamic RLS migration already ran, so new
        // tables carry their own policies.
        for (const table of ['policies', 'policy_acknowledgements', 'whistleblowing_reports', 'body_maps']) {
            await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
            await queryRunner.query(`CREATE POLICY tenant_isolation ON "${table}" USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const table of ['policies', 'policy_acknowledgements', 'whistleblowing_reports', 'body_maps']) {
            await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "${table}"`);
        }
        await queryRunner.query(`DROP INDEX "public"."IDX_41c5838096617ee25d230b540e"`);
        await queryRunner.query(`DROP TABLE "body_maps"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f722b35dc741254398138e6f18"`);
        await queryRunner.query(`DROP TABLE "whistleblowing_reports"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5c894fd8bbe9997c5d9b9226e2"`);
        await queryRunner.query(`DROP TABLE "policy_acknowledgements"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_830ce259a97bf1ac5722fd020b"`);
        await queryRunner.query(`DROP TABLE "policies"`);
    }

}
