DO $$
BEGIN
  GRANT UPDATE, DELETE ON audit_logs TO mycura_app;
EXCEPTION WHEN undefined_object OR undefined_table THEN
  RAISE NOTICE 'audit_logs/mycura_app missing; skipping grant';
END $$;
