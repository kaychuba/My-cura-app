# Application Security Reference

What is enforced, where it lives, and what each deployment must configure.
Data lifecycle (retention, backups, key rotation) lives in
[DATA-PROTECTION.md](./DATA-PROTECTION.md).

## 1. Authentication

- **Password hashing: Argon2id** (64 MiB, 3 passes — OWASP parameters), never
  encryption. Legacy bcrypt hashes verify once more on login and are upgraded
  to Argon2id in place (`common/security/password.util.ts`), so the migration
  completes itself without a reset campaign.
- **Password acceptance policy** (NCSC style — length + denylist, not
  composition theatre): 8–128 chars, common-password denylist, no
  single-repeated-character, must not contain the user's own name/email.
  Enforced centrally (`assertAcceptablePassword`) at signup, registration,
  user creation and password reset.
- **MFA is mandatory for administrators, owners and managers**
  (`MfaRequiredGuard`, global). Tokens minted before enrollment carry
  `mfa: false` and can reach only the enrollment endpoints (`@AllowPreMfa`);
  the web app routes such logins straight to `/mfa-setup`. TOTP secrets are
  AES-encrypted at rest. Admin roles cannot disable their own MFA.
- Failed logins and failed 2FA attempts feed the security monitor (§7).

## 2. Rate limiting

Global guard (`ThrottlerGuard`) — every route capped at 120 req/min/IP, with
strict overrides on the abuse-prone endpoints:

| Endpoint | Limit |
|---|---|
| POST /auth/login | 5 / 15 min |
| POST /auth/2fa/verify | 5 / 15 min |
| POST /auth/2fa/disable | 5 / 15 min |
| POST /auth/signup | 3 / 15 min |
| POST /auth/2fa/setup, /confirm | 10 / 15 min |
| POST /auth/biometric/verify | 10 / 15 min |
| POST /auth/refresh | 60 / 15 min |
| password reset (when built) | must reuse the login budget |

Counters are per-process; behind a load balancer, add the same limits at the
edge (nginx `limit_req` / cloud WAF) or move the throttler to Redis storage.
`trust proxy` is set so client IPs survive one proxy hop.

## 3. Refresh-token cookies (web)

For requests tagged `X-Client-Platform: web`, the refresh token is delivered
ONLY as a cookie: `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`,
and is stripped from the JSON body. The web client never stores it — XSS
cannot read it, and SameSite=Strict + the path scope block CSRF replay.
Native apps keep body delivery and store the token in the device keychain
(SecureStore), which is the mobile equivalent.

Deployment constraint: web and API must share a registrable domain
(`app.mycura.io` / `api.mycura.io`) for Strict cookies to flow.

## 4. Security headers

Set by helmet in `main.ts` on every API response:

- `Content-Security-Policy`: `default-src 'self'`; `object-src 'none'`;
  `frame-ancestors 'none'` (inline allowance exists only for Swagger UI)
- `Strict-Transport-Security`: 180 days, includeSubDomains
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy`: geolocation, camera, microphone, payment all denied

**Web app edge must mirror these.** The SPA is static files; whatever serves
it (nginx, Caddy, CDN) needs the same header set, with a CSP of:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; connect-src 'self' https://api.<domain>;
frame-ancestors 'none'; object-src 'none'; base-uri 'self'
```

## 5. Field-level encryption

AES-256-GCM via a **versioned keyring** (`EncryptionService`): ciphertexts
carry a `v<N>:` prefix naming the key that wrote them. Currently encrypted:
MAR signatures, controlled-drug witness signatures, National Insurance
numbers, TOTP secrets. Add new sensitive identifiers through
`EncryptionService` and list the column in
`src/database/scripts/reencrypt-fields.ts`.

Keys: `ENCRYPTION_KEY` (+ `ENCRYPTION_KEY_VERSION`), retired keys in
`ENCRYPTION_KEYS_RETIRED`. Rotation procedure and key-separation guidance:
DATA-PROTECTION.md §6.

## 6. File uploads

Every upload endpoint MUST route the buffer through `validateUpload()`
(`common/security/upload-guard.util.ts`):

1. size cap (10 MB default, per-endpoint override)
2. extension allowlist (pdf, png, jpg, webp, heic, docx, xlsx, csv)
3. magic-byte sniffing — declared type must match actual bytes
4. random UUID storage filename — the client's name is discarded
5. ClamAV scan when `CLAMAV_HOST` is set (compose ships a `clamav` service)

Store uploads outside any web root, serve them with
`Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`,
never from a path the app server executes.

## 7. Monitoring & alerts

`SecurityMonitorService` (global) keeps sliding-window counters and POSTs to
`ALERT_WEBHOOK_URL` (Slack-compatible) when a threshold trips, with a 15-min
cooldown per signal:

| Signal | Threshold |
|---|---|
| Login failures (global or per-identity) | 10 / 5 min (5 per identity) |
| 403s per user/IP (privilege probing) | 5 / 5 min |
| 5xx responses | 20 / 5 min |
| Rejected uploads | 10 / 5 min |
| Backup failure | immediate (compose sidecar) |
| Replication stopped/lagging | checked every 5 min (`REPLICATION_MONITOR=true`, needs `GRANT pg_monitor`) |

## 8. Vulnerability scanning

- **CI** (`security` job): `pnpm audit`, gitleaks (committed secrets), and
  Trivy (fails the build on fixable CRITICAL/HIGH vulns in dependencies,
  Dockerfiles, compose files and workflows).
- **Dependabot**: weekly PRs for npm packages, GitHub Actions, and the API
  Docker base image (`.github/dependabot.yml`).
- OS packages: rebuild images weekly (Dependabot bumps the base image) and
  apply unattended security upgrades on any self-managed host.

### Patch-management SLAs

| Severity (CVSS / vendor rating) | Deadline to patch or mitigate |
|---|---|
| Critical, actively exploited | 48 hours |
| Critical / High | 7 days |
| Medium | 30 days (next scheduled release) |
| Low | 90 days / opportunistic |

Trivy failing CI on fixable CRITICAL/HIGH enforces the 7-day lane
mechanically — a PR cannot merge past a known fixable high-severity vuln.
Dependabot PRs count as the patch vehicle; merging them within the SLA is
part of the weekly routine.

## 9. Tamper-resistant records

The audit log (`audit_logs`) and consent history (`service_user_consents`)
are **append-only at the database level**: `UPDATE`, `DELETE` and `TRUNCATE`
are revoked from the application role, so neither buggy code, SQL injection,
nor a compromised API process can rewrite history. Only the owner role
(migrations and retention purges, never used by the API) retains write
access. Consent decisions and withdrawals are separate events; the current
position is derived, never edited.
