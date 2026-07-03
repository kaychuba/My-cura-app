import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-tenant row-level security.
 *
 * Timestamp is intentionally pinned ahead of the generated schema migrations
 * so this always runs after every table exists.
 *
 * - Extensions + set_tenant_id()/current_tenant_id() helpers (mirrors
 *   infrastructure/docker/init-db.sql for environments where that bootstrap
 *   never ran).
 * - mycura_app (RLS-constrained) and mycura_super (BYPASSRLS) login roles.
 *   Dev-only passwords; production must ALTER ROLE with secrets from AWS
 *   Secrets Manager.
 * - Every table with a tenant_id column gets row-level security and a
 *   tenant_isolation policy, discovered dynamically so the file never needs a
 *   hard-coded table list.
 */
export class EnableRowLevelSecurity1790000000000 implements MigrationInterface {
  name = 'EnableRowLevelSecurity1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // Conditional: init-db.sql may have created these already under a
    // different owner, in which case CREATE OR REPLACE would be refused.
    await queryRunner.query(`
      DO $do$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'set_tenant_id') THEN
          CREATE FUNCTION set_tenant_id(tenant_id UUID)
          RETURNS void AS $$
          BEGIN
            PERFORM set_config('app.current_tenant_id', tenant_id::text, TRUE);
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        END IF;

        IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'current_tenant_id') THEN
          CREATE FUNCTION current_tenant_id()
          RETURNS UUID AS $$
          BEGIN
            RETURN NULLIF(current_setting('app.current_tenant_id', TRUE), '')::UUID;
          EXCEPTION WHEN OTHERS THEN
            RETURN NULL;
          END;
          $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
        END IF;
      END
      $do$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'mycura_app') THEN
          CREATE ROLE mycura_app LOGIN PASSWORD 'mycura_app_password';
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'mycura_super') THEN
          CREATE ROLE mycura_super LOGIN PASSWORD 'mycura_super_password' BYPASSRLS;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`GRANT USAGE ON SCHEMA public TO mycura_app`);
    await queryRunner.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mycura_app`);
    await queryRunner.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mycura_app`);
    await queryRunner.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mycura_app`);
    await queryRunner.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mycura_app`);
    await queryRunner.query(`GRANT USAGE ON SCHEMA public TO mycura_super`);
    await queryRunner.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mycura_super`);
    await queryRunner.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mycura_super`);

    // Tenant isolation on every table that carries tenant_id. RLS is ENABLEd
    // (not FORCEd): the policy binds connections made as mycura_app
    // (production), while the schema owner used for local dev, migrations and
    // seeds bypasses it. NOTE: before pointing production at mycura_app, the
    // API needs per-request tenant plumbing that calls set_tenant_id() on the
    // checked-out connection — services currently scope by tenantId in code.
    // The tenants table itself is scoped by its id — a tenant context can
    // only see its own tenant row.
    await queryRunner.query(`
      DO $$
      DECLARE
        t RECORD;
      BEGIN
        FOR t IN
          SELECT c.table_name
          FROM information_schema.columns c
          JOIN information_schema.tables tb
            ON tb.table_name = c.table_name AND tb.table_schema = c.table_schema
          WHERE c.column_name = 'tenant_id'
            AND c.table_schema = 'public'
            AND tb.table_type = 'BASE TABLE'
        LOOP
          EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.table_name);
          EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t.table_name);
          EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())',
            t.table_name
          );
        END LOOP;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
          ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS tenant_isolation ON tenants;
          CREATE POLICY tenant_isolation ON tenants
            USING (id = current_tenant_id())
            WITH CHECK (id = current_tenant_id());
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        t RECORD;
      BEGIN
        FOR t IN
          SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        LOOP
          EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t.tablename);
          EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t.tablename);
        END LOOP;
      END
      $$;
    `);
    await queryRunner.query(`DROP FUNCTION IF EXISTS set_tenant_id(UUID)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS current_tenant_id()`);
    // Roles are cluster-wide; other databases may use them, so they stay.
  }
}
