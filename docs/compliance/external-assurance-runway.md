# External Assurance Runway — pen test & Cyber Essentials

> What to buy, when, and what to hand the assessors. These are the two
> items on the compliance checklist that cannot be built in-house.

## 1. Cyber Essentials (do first — cheapest credibility)

Self-assessed questionnaire (~£320–£600 via an IASME certification body,
e.g. IASME directly). Care agencies and councils ask for this
before anything else. Do **CE** now; **CE Plus** (adds an external audit,
~£1.5–2.5k) once deployed.

How the five CE control themes map to what already exists:

| CE theme | Evidence |
|---|---|
| Firewalls | Deployment checklist: cloud security groups, Postgres on private network (deploy-gated) |
| Secure configuration | Hardened headers/CSP, no default credentials anywhere (boot fails without env secrets), least-privilege DB roles |
| User access control | RBAC + server-enforced MFA for admins + quarterly access review (infosec policy §3) |
| Malware protection | ClamAV upload scanning; endpoint AV on company machines *(confirm)* |
| Security update management | Patch SLAs (SECURITY.md §8), Dependabot + Trivy CI gate |

Scope note for the questionnaire: cloud infrastructure + the founder's
work machine(s). Keep endpoint answers honest (disk encryption, auto-update).

## 2. Independent penetration test (before real customer data)

- **Budget:** £3,000–£8,000 for this scope from a CREST-accredited UK firm.
- **Timing:** after cloud deployment, before first real agency onboards.
- **Scope to request:** web app + API (authenticated, all roles),
  mobile API surface, multi-tenant isolation attack (give them two test
  tenants and ask them to cross), authentication (MFA bypass attempts,
  session handling), infrastructure/config review.
- **Give them:** staging environment with seeded synthetic data, 2 accounts
  per role per tenant, docs/SECURITY.md, API docs (Swagger), this repo
  under NDA if white-box (recommended — cheaper and deeper).
- **Aftercare:** fix criticals/highs within the patch SLAs, request a
  retest letter, keep the report + letter for enterprise/council
  procurement questionnaires.

## 3. Later (customer-driven)
- **ISO 27001** — only when a contract demands it (~£10–20k + audits);
  the infosec policy set here is the seed of the ISMS.
- **DSPT (NHS Data Security & Protection Toolkit)** — required if any NHS
  data flows arrive; the controls above cover most of "Standards Met".
- **DTAC** (NHS Digital Technology Assessment Criteria) — for NHS
  procurement; keep in view when selling into ICBs.
