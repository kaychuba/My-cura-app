import { MigrationInterface, QueryRunner } from "typeorm";

export class LeaveRequests1783112154235 implements MigrationInterface {
    name = 'LeaveRequests1783112154235'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."leave_requests_leave_type_enum" AS ENUM('annual', 'sick', 'maternity', 'paternity', 'shared_parental', 'compassionate', 'emergency', 'training', 'unpaid', 'jury_duty')`);
        await queryRunner.query(`CREATE TYPE "public"."leave_requests_status_enum" AS ENUM('pending', 'approved', 'declined', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "leave_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "care_worker_id" uuid NOT NULL, "leave_type" "public"."leave_requests_leave_type_enum" NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "days_requested" numeric(5,2) NOT NULL, "status" "public"."leave_requests_status_enum" NOT NULL DEFAULT 'pending', "reason" text, "is_paid" boolean NOT NULL DEFAULT true, "reviewed_by" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "review_notes" text, CONSTRAINT "PK_d3abcf9a16cef1450129e06fa9f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_25b3486c88c77032291ffd95f2" ON "leave_requests" ("tenant_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_63c5db6aa8910c9a3bc66454df" ON "leave_requests" ("tenant_id", "care_worker_id", "start_date") `);
        // Tenant isolation — the dynamic RLS migration has already run, so new
        // tables must carry their own policy.
        await queryRunner.query(`ALTER TABLE "leave_requests" ENABLE ROW LEVEL SECURITY`);
        await queryRunner.query(`CREATE POLICY tenant_isolation ON "leave_requests" USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "leave_requests"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_63c5db6aa8910c9a3bc66454df"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_25b3486c88c77032291ffd95f2"`);
        await queryRunner.query(`DROP TABLE "leave_requests"`);
        await queryRunner.query(`DROP TYPE "public"."leave_requests_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."leave_requests_leave_type_enum"`);
    }

}
