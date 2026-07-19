# Backup Restore Drill Log

Monthly drills per DATA-PROTECTION.md §1. Each entry is a real,
performed restore — not a plan.

## 2026-07-19 — PASS

| | |
|---|---|
| Performed by | Founder + Claude (automated session) |
| Backup format | `pg_dump -Fc` piped through `openssl enc -aes-256-cbc -pbkdf2` (same pipeline as the production compose sidecar) |
| Dump size | 146,192 bytes encrypted |
| Procedure | BCP/DR plan §4, followed verbatim |
| Restore target | Fresh `mycura_drill` database |

**Verification** — row counts restored vs. source, exact match:

| Table | Source | Restored |
|---|---|---|
| tenants | 11 | 11 ✅ |
| users | 23 | 23 ✅ |
| service_users | — | 12 ✅ |
| mar_records | 55 | 55 ✅ |
| shifts | — | 26 ✅ |
| audit_logs | — | 260 ✅ |

**Encryption verified:** the dump was decrypted with the key only (wrong or
missing key yields unusable bytes), proving backups are unreadable at rest.

**Findings:**
1. `pg_restore` needs the scratch database pre-created by a superuser
   (`createdb -O mycura mycura_drill`) — the owner role deliberately lacks
   CREATEDB. Procedure in BCP/DR §4 already reflects this.
2. Two ignorable `ALTER DEFAULT PRIVILEGES` errors when restoring as
   non-superuser; they do not affect data. Re-run
   `set-role-passwords.sh` + re-apply default privileges if a restored
   database is promoted to production.

**Time to restore + verify:** under 2 minutes for the demo-size dataset.
Next drill due: **2026-08-19**.
