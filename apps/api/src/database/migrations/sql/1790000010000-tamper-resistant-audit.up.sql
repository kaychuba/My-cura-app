-- Tamper-resistant audit trail: the application may append and read audit
-- rows, but can never modify or remove them — even through SQL injection or
-- a compromised service. Only the owner role (migrations, retention purge
-- jobs) retains write access, and that role is never used by the API.

DO $$
BEGIN
  REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM mycura_app;
EXCEPTION WHEN undefined_object OR undefined_table THEN
  RAISE NOTICE 'audit_logs/mycura_app missing; skipping revoke';
END $$;

DO $$
BEGIN
  REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM mycura_auth;
EXCEPTION WHEN undefined_object OR undefined_table THEN
  RAISE NOTICE 'audit_logs/mycura_auth missing; skipping revoke';
END $$;
