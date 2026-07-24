-- Public contact/demo enquiries from the marketing site. Platform-level
-- (no tenant), holds prospect PII — append-only like the audit trail so a
-- compromised API cannot silently rewrite or purge the sales pipeline.

CREATE TABLE enquiries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          varchar(160) NOT NULL,
  email         varchar(255) NOT NULL,
  phone         varchar(40),
  organisation  varchar(200),
  -- demo | sales | general | support
  enquiry_type  varchar(20) NOT NULL DEFAULT 'general',
  message       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_enquiries_created ON enquiries (created_at DESC);

DO $$
BEGIN
  REVOKE UPDATE, DELETE, TRUNCATE ON enquiries FROM mycura_app;
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'mycura_app missing; skipping enquiries revoke';
END $$;
