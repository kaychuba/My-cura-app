# Incident Response Plan — My-Cura

> **Status: DRAFT for adoption.** What humans do when something goes wrong.
> Print-friendly on purpose. Test with a tabletop exercise twice a year.

**Incident commander (default):** Founder · **Deputy:** *(name)* ·
**Contact channel:** *(phone + email)* — keep a copy of this plan OUTSIDE
the systems it covers.

## 1. What counts as an incident
Suspected or actual: unauthorised access, data leak (any cross-tenant
visibility is automatically **critical**), ransomware/malware, defacement,
credential compromise, lost device with access, prolonged outage, alert
from the security monitor (login-failure spike, privilege probing, backup
failure, replication stopped), or a vulnerability report from outside.

## 2. Severity

| Level | Definition | Examples | Target response |
|---|---|---|---|
| SEV1 | Confirmed data breach or full outage | Cross-tenant leak, DB compromise | Act immediately, all hands |
| SEV2 | Likely compromise or partial outage | Admin account takeover, sustained attack | Within 4 hours |
| SEV3 | Contained/attempted | Blocked brute force, single flagged event | Within 2 business days |

## 3. The six steps

1. **Detect & log** — note the time, alert text, who noticed. Start an
   incident log (timestamped notes; screenshots before anything changes).
2. **Contain** — smallest action that stops the bleeding, in order of
   preference: disable the affected account(s) → rotate the exposed
   secret(s) → block the source at the edge → take the API offline
   (`docker compose stop api` / stop the process). For credential
   compromise: revoke sessions by rotating `JWT_SECRET`/`JWT_REFRESH_SECRET`
   (forces re-login for everyone).
3. **Assess** — what data, which tenants, what window? The append-only
   audit log and access patterns are the primary evidence — they cannot
   have been rewritten by the attacker via the app role.
4. **Notify** —
   - Affected **agency customers (controllers)**: without undue delay,
     within **48 h** per the DPA.
   - **ICO** (via the controller, or as processor supporting them): within
     **72 h** of awareness if risk to individuals — the controller decides,
     we provide the art. 33(3) facts.
   - Individuals: if high risk (controller-led).
   - Never speculate in notifications; state facts, scope, actions.
5. **Eradicate & recover** — patch the hole, restore from encrypted backup
   if integrity is in doubt (see BCP/DR plan §4 for the tested procedure),
   re-run the user-journey test suite before declaring recovery.
6. **Learn** — blameless post-mortem within 5 business days: timeline, root
   cause, what detection missed, actions with owners and dates. File in
   this folder as `postmortems/YYYY-MM-DD-<slug>.md`.

## 4. Evidence-handling
Preserve logs and the incident copy of the database dump before
remediation; record hashes of preserved artefacts; keep the incident log
contemporaneous — it is what regulators and customers will read.

## 5. External help
*(Retain/identify before launch: incident-response firm, legal counsel for
breach notification, cyber-insurance policy number and hotline.)*
