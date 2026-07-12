# Data Protection & Resilience Runbook

My-Cura holds special-category health data (UK GDPR Article 9). This
document is the operational policy for keeping it safe, recoverable and
lawfully retained. It applies to every deployment (docker-compose, CDK,
or any managed cloud).

## 1. Redundancy & availability

| Layer | Minimum (compose) | Recommended (production) |
|---|---|---|
| Database | Nightly `pg_dump` (backup sidecar, 30-day retention) | Managed Postgres with multi-AZ standby + automatic failover (RDS Multi-AZ / Cloud SQL HA / Azure Flexible HA) |
| Point-in-time recovery | — | WAL archiving / PITR enabled, 7–35 day window |
| Read traffic | — | 1+ read replica; route reports/analytics to it |
| Off-site copies | copy `./backups` to a second machine | cross-region snapshot copies, encrypted |

**Replica guidance:** managed clouds enable a standby with one setting.
Self-hosted: streaming replication with a hot standby (`primary_conninfo`
+ replication slot) and promote on failure. Test the failover, not just
the setup.

**Restore drills are the policy, not optional:** monthly, restore the
latest dump to a scratch database and run the API smoke suite against
it. A backup that has never been restored is a hope, not a backup.

## 2. Retention

| Data class | Retention | Basis |
|---|---|---|
| Care records (care plans, visit notes, MAR, care documentation) | 8 years after care ends (adults) — confirm against the current NHS Records Management Code of Practice and your registration body before shortening | Statutory/CQC guidance |
| Payroll & financial records | 6 years + current year | HMRC |
| Staff records (HR docs, training) | 6 years after employment ends | Employment law norms |
| Audit logs | 3 years minimum | Accountability (UK GDPR art. 5) |
| Messages | 2 years, then delete | Proportionality |
| Backups | 30 days rolling (compose default) | Ops policy |

Soft-delete (`deleted_at`) is already used across tables: "deleted" data
remains recoverable until the retention window ends, then is purged by a
scheduled job (to implement alongside deployment).

## 3. Data-subject rights (UK GDPR)
- Export: per-tenant full export endpoint — planned; interim: DBA export
  by `tenant_id` (RLS makes the boundary exact).
- Erasure: soft-delete now; hard purge after the retention period. Care
  records are usually EXEMPT from erasure during their statutory
  retention — record the refusal reason.

## 4. Security posture (already enforced in code)
- Postgres row-level security on every tenant table; the API runs as a
  role that cannot see across companies even with buggy queries.
- No BYPASSRLS role exists. Authentication uses `mycura_auth` with
  explicit policies on `users`/`tenants` only.
- No credentials in the repository: all secrets are environment
  variables (`apps/api/.env.example`); role passwords set per
  environment via `infrastructure/scripts/set-role-passwords.sh`.
- Field-level encryption (AES) for signatures and NI numbers; key from
  `ENCRYPTION_KEY` env (64-hex), required at boot.
- Audit log on every mutating request, tenant-scoped.

## 5. Deployment checklist (any cloud)
1. Generate secrets: `openssl rand -hex 32` ×3 (JWT, refresh, encryption),
   `openssl rand -hex 24` ×2 (db roles). Store in the platform's secret
   manager, never in git.
2. `docker compose up -d` (or the CDK stack — optional, AWS only).
3. `migration:run`, then `set-role-passwords.sh`.
4. Enable PITR/standby on the database.
5. Schedule the monthly restore drill.
6. TLS at the edge; restrict Postgres to the private network.
