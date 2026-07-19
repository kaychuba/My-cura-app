# Record of Processing Activities (ROPA) — My-Cura Ltd (processor)

> **Status: DRAFT for review.** UK GDPR art. 30(2) record, kept by My-Cura
> Ltd as processor for its agency customers (controllers). Update whenever a
> processing activity, sub-processor or retention period changes.

Controller for each tenant's data: the care agency named in the tenant
record. Processor: My-Cura Ltd *(confirm entity, registered address, ICO
registration number)*. Contact: *(privacy lead)*.

| # | Activity | Data subjects | Categories | Special category? | Retention | Security measures |
|---|---|---|---|---|---|---|
| 1 | Care planning & visit records | Service users | Identity, contact, health conditions, care needs, visit notes, body maps | Yes — health | 8 years after care ends | RLS tenant isolation, MFA, audit log, encrypted backups |
| 2 | Medication administration (MAR) | Service users | Prescriptions, doses, administration outcomes, refusals, carer initials/signatures | Yes — health | 8 years after care ends | Append-only workflow, encrypted signatures, witness rules |
| 3 | Consent management | Service users, attorneys/deputies | Consent decisions, capacity assessments, decision-maker identity | Yes | Life of care record | Append-only at DB level |
| 4 | Incident & safeguarding reporting | Service users, staff | Incident details, escalations, whistleblowing reports | Yes | 8 years | Role-restricted access, audit log |
| 5 | Workforce management | Care workers, office staff | Identity, contact, right-to-work, training, DBS status | Possibly (art. 10) | 6 years after employment ends | RBAC, encrypted NI numbers |
| 6 | Scheduling & visit verification | Care workers | Rosters, GPS location at clock-in/out only, timestamps | No | 6 years (payroll evidence) | Purpose-limited GPS, fraud-flag review |
| 7 | Payroll & finance | Care workers, agencies | Pay rates, hours, payslips, invoices | No | 6 years + current (HMRC) | Encrypted NI numbers, RBAC |
| 8 | Platform authentication & audit | All users | Credentials (hashed), MFA secrets (encrypted), IP addresses, audit events | No | Audit 3 years | Argon2id, AES-256-GCM, append-only log |
| 9 | Data migration imports | Service users, staff | Legacy records from prior software | Yes | As category above | Validated import pipeline, RLS |
| 10 | Backups & disaster recovery | All above | Full database dumps | Yes | 30 days rolling | AES-256 encryption, restore drills |

## Sub-processors *(complete at deployment)*

| Sub-processor | Purpose | Location | Safeguard |
|---|---|---|---|
| *(cloud host — e.g. AWS eu-west-2)* | Hosting, storage, backups | UK/EU | DPA + SCCs if non-UK |
| Expo (EAS) | Mobile app build/update delivery (no personal data) | US | Code only, no PII |
| *(email provider)* | Transactional email | — | DPA |

## International transfers
None intended; hosting to be pinned to UK/EU regions. *(Confirm at deploy.)*
