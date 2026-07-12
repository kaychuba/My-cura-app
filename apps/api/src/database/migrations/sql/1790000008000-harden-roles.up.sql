-- Security hardening:
-- 1. No role keeps a password shipped in this repository — passwords are
--    stripped (PASSWORD NULL) and must be set per environment from secrets
--    (see infrastructure/scripts/set-role-passwords.sh).
-- 2. The BYPASSRLS role mycura_super is removed. Nothing may blanket-bypass
--    row-level security.
-- 3. Authentication uses mycura_auth: an ordinary role with explicit,
--    auditable row policies on ONLY the two pre-tenant tables it needs
--    (users for login/token checks, tenants for signup) — not a bypass.

-- Role management may need elevated privileges: statements degrade to a
-- NOTICE when the migration user lacks them, and the same file can be run
-- directly by a DBA (psql -f) to apply the role changes.
DO $$
BEGIN
  BEGIN
    ALTER ROLE mycura_app PASSWORD NULL; -- strip the repo-known password
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'run as a superuser to strip mycura_app password';
  END;
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'mycura_auth') THEN
      CREATE ROLE mycura_auth LOGIN;
    END IF;
    ALTER ROLE mycura_auth PASSWORD NULL;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'run as a superuser to create mycura_auth';
  END;
END
$$;
GRANT USAGE ON SCHEMA public TO mycura_auth;
GRANT SELECT, INSERT, UPDATE ON users, tenants TO mycura_auth;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mycura_auth;

-- Explicit cross-tenant policies for the auth surface only
DROP POLICY IF EXISTS auth_access ON users;
CREATE POLICY auth_access ON users FOR ALL TO mycura_auth
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS auth_access ON tenants;
CREATE POLICY auth_access ON tenants FOR ALL TO mycura_auth
  USING (true) WITH CHECK (true);

-- Remove the blanket-bypass role entirely (fallback: disarm it if the DROP
-- is blocked by ownership elsewhere in the cluster)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'mycura_super') THEN
    REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM mycura_super;
    REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM mycura_super;
    REVOKE USAGE ON SCHEMA public FROM mycura_super;
    BEGIN
      DROP ROLE mycura_super;
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        ALTER ROLE mycura_super NOLOGIN NOBYPASSRLS PASSWORD NULL;
      EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'run as a superuser to remove mycura_super';
      END;
    END;
  END IF;
END
$$;
