# Business Continuity & Disaster Recovery Plan — My-Cura

> **Status: DRAFT for adoption.** Defines RTO/RPO and what to do when the
> platform, its data, or the people running it are unavailable. Review
> after every incident and at least annually.

## 1. Objectives

| Metric | Current commitment (single-node compose) | Target (managed cloud with PITR) |
|---|---|---|
| **RPO** (max data loss) | 24 hours (nightly encrypted dump) | ≤ 5 minutes (WAL/PITR) |
| **RTO** (max time to restore service) | 8 working hours | ≤ 1 hour |

Care agencies must be told these numbers in the service agreement — they
plan paper fallbacks around them.

**Continuity reality for customers:** if My-Cura is down, care must not
stop. The mobile app's offline queue keeps clock-ins/MAR/notes recording
locally during API outages and syncs on recovery; beyond that window,
agencies revert to paper MAR sheets (their CQC-required fallback).

## 2. Scenarios & responses

| Scenario | Response |
|---|---|
| API crash/hang | Restart service; check monitor alerts for the cause; 5xx spike alert should have fired |
| Database corruption/loss | Restore latest encrypted dump (procedure §4); accept ≤ RPO loss; notify affected controllers if loss > 1 hour of writes |
| Host/region loss | Provision new host, `docker compose up` from the repo, restore dump, repoint DNS |
| Ransomware | Treat as SEV1 incident (incident-response-plan.md); rebuild from clean images + restore dump predating compromise; rotate every secret |
| Key person unavailable | See §5 |
| Backup failure | Alert fires automatically (webhook); fix same day — a second consecutive failure is a SEV2 incident |

## 3. What exists to make this work
- Nightly `pg_dump`, AES-256-encrypted, 30-day retention, alert on failure
  (docker-compose backup sidecar).
- Off-site copy of `./backups` — *(action: schedule copy to separate
  provider/location)*.
- Everything needed to rebuild the platform is in the git repository
  (GitHub); secrets are in the environment/secret manager, NOT in the repo
  — keep a sealed copy of production secrets in *(password manager /
  offline safe)*.

## 4. Restore procedure (tested — see restore-drill-log.md)

```bash
# 1. Fetch the latest dump
ls -t backups/*.dump.enc | head -1
# 2. Decrypt
openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY \
  -in backups/<file>.dump.enc -out /tmp/restore.dump
# 3. Restore into a fresh database
createdb mycura_restore
pg_restore -d mycura_restore --no-owner /tmp/restore.dump
# 4. Verify: row counts on tenants/users/mar_records, then run the
#    user-journey smoke suite against an API pointed at the restored DB
# 5. Swap: rename databases (or repoint DB_NAME), restart API
```

**Drills:** monthly, minuted in restore-drill-log.md. A backup that has
never been restored is a hope, not a backup.

## 5. People continuity
Single-founder risk is the biggest continuity gap. Mitigations: this plan +
sealed credentials give a competent engineer everything needed to operate
the platform; *(action: name a technical executor / break-glass contact
with access instructions)*.

## 6. Communication during an outage
Status updates to agency contacts by email every 2 hours during SEV1/SEV2
(*(action: maintain out-of-band contact list — it must live outside the
platform)*).
