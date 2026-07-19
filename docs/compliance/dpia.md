# Data Protection Impact Assessment (DPIA) — My-Cura Platform

> **Status: DRAFT for review** — complete the owner fields and have it
> reviewed before processing real service-user data. A DPIA is mandatory
> here (UK GDPR art. 35): large-scale processing of special-category health
> data of vulnerable people.

| | |
|---|---|
| Processing owner | My-Cura Ltd *(confirm legal entity)* |
| DPO / privacy lead | *(name — appoint before go-live)* |
| Assessment date | 2026-07-19 (draft) |
| Review cycle | Annually, and on any significant change |

## 1. What the processing is

My-Cura is a multi-tenant SaaS care-management platform for UK domiciliary
care agencies. Each agency (the **controller**) records: service-user
demographics, care needs and care plans, visit notes, medication records
(MAR), incidents/safeguarding, consent decisions, staff employment/payroll
data, and GPS clock-in/out locations of care workers during shifts.
My-Cura Ltd is the **processor** hosting and operating the platform.

Data subjects: service users (often elderly/vulnerable adults), their
emergency contacts, care workers, agency office staff.

Special-category data: health data (conditions, medications, care notes,
body maps), plus safeguarding material. Criminal-offence data may appear in
recruitment (DBS status) — *(confirm scope)*.

## 2. Why it is necessary

Agencies are legally obliged (CQC regulations, Health and Social Care Act
2008) to maintain accurate, timely care records. Lawful bases: controller's
legal obligation & legitimate interests for operations; art. 9(2)(h)
(health/social care provision) with art. 9(3) safeguards for
special-category data; explicit consent recorded per service user for
optional purposes (photography, wider data sharing).

## 3. Risks to individuals

| # | Risk | Likelihood | Severity |
|---|---|---|---|
| R1 | Cross-tenant leak: one agency sees another's patients | Low | Very high |
| R2 | Account takeover of an admin (stolen password) | Medium | Very high |
| R3 | Care records altered/deleted to hide neglect | Low | Very high |
| R4 | Lost/undecryptable backups after an incident | Medium | High |
| R5 | Staff device theft exposing mobile session | Medium | Medium |
| R6 | GPS tracking of carers beyond what is necessary | Medium | Medium |
| R7 | Consent processed without capacity safeguards | Medium | High |
| R8 | Data kept longer than lawful retention | Medium | Medium |

## 4. Mitigations already implemented (verified in code/tests)

| Risk | Mitigation |
|---|---|
| R1 | Postgres row-level security on every tenant table; API roles cannot bypass it (no BYPASSRLS); tenant isolation covered by automated tests (unit + live journey suite) |
| R2 | Mandatory TOTP MFA for owner/manager/admin roles (enforced server-side); Argon2id hashing; common-password denylist; login rate limiting 5/15 min; login-failure spike alerts |
| R3 | Append-only audit log and consent history (UPDATE/DELETE revoked at DB level); MAR double-recording refused; witness required for controlled drugs |
| R4 | Nightly AES-256-encrypted backups, 30-day retention, failure alerting; restore drills minuted (see restore-drill-log.md) |
| R5 | Tokens in the device keychain (SecureStore); refresh validated server-side before the UI opens; sessions revocable |
| R6 | GPS captured **only** at clock-in/out events for shifts, not continuous tracking; distance stored, purpose-limited to visit verification |
| R7 | Consent module enforces Mental Capacity Act framing: decisions on someone's behalf require a named attorney/deputy/best-interests decision-maker AND a recorded capacity assessment |
| R8 | Documented retention schedule with statutory bases; soft-delete then purge policy (DATA-PROTECTION.md §2) |

## 5. Residual risks and planned actions

1. Platform not yet deployed behind TLS (development stage) — **blocker for
   any real data**; resolved by the production deployment checklist.
2. Independent penetration test not yet performed — scheduled pre-launch.
3. Field-level encryption covers signatures/NI numbers/TOTP secrets;
   evaluate extending to condition summaries at rest.
4. DPO/privacy-lead appointment outstanding.

**Conclusion (draft):** with the production deployment checklist completed
and the pen test passed, residual risk is acceptable. Real service-user
data must not be processed before items 1–2 are closed.

*Sign-off:* ____________________  *Date:* ________
