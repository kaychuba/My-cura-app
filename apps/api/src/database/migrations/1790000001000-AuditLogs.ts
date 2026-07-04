import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The AuditLogInterceptor has inserted into audit_logs since the first
 * release, but the table was never created — failures were swallowed by
 * design. This makes the audit trail real.
 */
export class AuditLogs1790000001000 implements MigrationInterface {
    name = 'AuditLogs1790000001000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "user_id" uuid, "action" character varying NOT NULL, "resource_type" character varying, "resource_id" uuid, "ip_address" character varying, "user_agent" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_tenant_created" ON "audit_logs" ("tenant_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_tenant_user_created" ON "audit_logs" ("tenant_id", "user_id", "created_at") `);
        // Tenant isolation — the dynamic RLS migration already ran, so new
        // tables carry their own policies.
        await queryRunner.query(`ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY`);
        await queryRunner.query(`CREATE POLICY tenant_isolation ON "audit_logs" USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "audit_logs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_tenant_user_created"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_tenant_created"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
    }

}
