-- Consent management: an APPEND-ONLY event log of consent decisions per
-- service user. A newer row for the same consent type supersedes older ones;
-- withdrawal is itself a new row (status = 'withdrawn'), never an edit.
-- UPDATE/DELETE are revoked from the application role so history cannot be
-- rewritten even by buggy or compromised application code.

CREATE TABLE service_user_consents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  service_user_id  uuid NOT NULL REFERENCES service_users(id),
  -- care_and_support | data_processing | data_sharing | medication | photography
  consent_type     varchar(40) NOT NULL,
  -- granted | refused | withdrawn
  status           varchar(20) NOT NULL,
  -- Who made the decision: self | attorney | deputy | best_interests
  given_by         varchar(30) NOT NULL,
  given_by_name    varchar(160),
  -- Mental Capacity Act: was capacity assessed at the time of the decision?
  capacity_assessed boolean NOT NULL DEFAULT false,
  notes            text,
  -- When this decision should be reviewed (CQC good practice)
  review_by        date,
  recorded_by      uuid NOT NULL REFERENCES users(id),
  recorded_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_consents_lookup
  ON service_user_consents (tenant_id, service_user_id, consent_type, recorded_at DESC);

ALTER TABLE service_user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON service_user_consents
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Append-only: the app role may read and insert, never rewrite history.
DO $$
BEGIN
  REVOKE UPDATE, DELETE, TRUNCATE ON service_user_consents FROM mycura_app;
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'mycura_app missing; skipping consent revoke';
END $$;
