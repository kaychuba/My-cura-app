-- Reverting removes the auth role's explicit policies and grants.
-- The BYPASSRLS role is deliberately NOT recreated.
DROP POLICY IF EXISTS auth_access ON users;
DROP POLICY IF EXISTS auth_access ON tenants;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM mycura_auth;
REVOKE USAGE ON SCHEMA public FROM mycura_auth;
