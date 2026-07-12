-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create application user with row-level security capabilities
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'mycura_app') THEN
    CREATE ROLE mycura_app LOGIN; -- password set per environment
  END IF;
END
$$;

GRANT CONNECT ON DATABASE mycura TO mycura_app;
GRANT USAGE ON SCHEMA public TO mycura_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mycura_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mycura_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mycura_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mycura_app;

-- Create super admin role that bypasses RLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'mycura_super') THEN
    -- (BYPASSRLS role removed: nothing may blanket-bypass row security)
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE mycura TO mycura_super;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mycura_super;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mycura_super;

-- Function to set tenant context (used by application before every query)
CREATE OR REPLACE FUNCTION set_tenant_id(tenant_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function for RLS policies
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', TRUE), '')::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
