import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Tables for the previously-stubbed modules: notifications, expenses,
 * training, HR documents, recruitment, and persistent messaging.
 */
export class NotificationsAndWorkforce1790000003000 implements MigrationInterface {
    name = 'NotificationsAndWorkforce1790000003000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const base = `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE`;

        await queryRunner.query(`CREATE TABLE "notifications" (${base}, "user_id" uuid NOT NULL, "type" character varying NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "data" jsonb, "read_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_tenant_user_created" ON "notifications" ("tenant_id", "user_id", "created_at")`);

        await queryRunner.query(`CREATE TABLE "expenses" (${base}, "care_worker_id" uuid NOT NULL, "category" character varying NOT NULL, "description" text NOT NULL, "amount" numeric(10,2) NOT NULL, "expense_date" date NOT NULL, "receipt_key" character varying, "status" character varying NOT NULL DEFAULT 'submitted', "reviewed_by" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "review_note" text, CONSTRAINT "PK_expenses_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_expenses_tenant_worker_created" ON "expenses" ("tenant_id", "care_worker_id", "created_at")`);
        await queryRunner.query(`CREATE INDEX "IDX_expenses_tenant_status" ON "expenses" ("tenant_id", "status")`);

        await queryRunner.query(`CREATE TABLE "training_courses" (${base}, "name" character varying NOT NULL, "description" text, "validity_months" integer, "mandatory" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_training_courses_id" PRIMARY KEY ("id"))`);

        await queryRunner.query(`CREATE TABLE "training_records" (${base}, "user_id" uuid NOT NULL, "course_id" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'assigned', "completed_at" TIMESTAMP WITH TIME ZONE, "expires_at" TIMESTAMP WITH TIME ZONE, "certificate_key" character varying, CONSTRAINT "PK_training_records_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_training_records_tenant_user" ON "training_records" ("tenant_id", "user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_training_records_tenant_expires" ON "training_records" ("tenant_id", "expires_at")`);

        await queryRunner.query(`CREATE TABLE "hr_documents" (${base}, "user_id" uuid NOT NULL, "type" character varying NOT NULL, "title" character varying NOT NULL, "file_key" character varying, "issued_at" date, "expires_at" date, "notes" text, CONSTRAINT "PK_hr_documents_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_hr_documents_tenant_user" ON "hr_documents" ("tenant_id", "user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_hr_documents_tenant_expires" ON "hr_documents" ("tenant_id", "expires_at")`);

        await queryRunner.query(`CREATE TABLE "applicants" (${base}, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying, "role_applied_for" character varying NOT NULL, "stage" character varying NOT NULL DEFAULT 'applied', "cv_key" character varying, "notes" text, CONSTRAINT "PK_applicants_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_applicants_tenant_stage" ON "applicants" ("tenant_id", "stage")`);

        await queryRunner.query(`CREATE TABLE "conversations" (${base}, "title" character varying, "participant_ids" jsonb NOT NULL, "created_by" uuid NOT NULL, "last_message_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_conversations_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_conversations_tenant_last" ON "conversations" ("tenant_id", "last_message_at")`);

        await queryRunner.query(`CREATE TABLE "messages" (${base}, "conversation_id" uuid NOT NULL, "sender_id" uuid NOT NULL, "body" text NOT NULL, CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_messages_tenant_conv_created" ON "messages" ("tenant_id", "conversation_id", "created_at")`);

        // Tenant isolation — the dynamic RLS migration already ran, so new
        // tables carry their own policies.
        for (const table of ['notifications', 'expenses', 'training_courses', 'training_records', 'hr_documents', 'applicants', 'conversations', 'messages']) {
            await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
            await queryRunner.query(`CREATE POLICY tenant_isolation ON "${table}" USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const table of ['messages', 'conversations', 'applicants', 'hr_documents', 'training_records', 'training_courses', 'expenses', 'notifications']) {
            await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "${table}"`);
            await queryRunner.query(`DROP TABLE "${table}"`);
        }
    }
}
