# Information Security Policy — My-Cura Ltd

> **Status: DRAFT for adoption.** The organisational wrapper around the
> technical controls in docs/SECURITY.md. Review annually.

**Owner:** Founder/CEO *(until a security lead is appointed)* ·
**Applies to:** everyone with access to My-Cura systems, code or customer
data · **Adopted:** *(date)*

## 1. Purpose & scope
Protect the confidentiality, integrity and availability of customer data
(especially special-category health data), the platform, and company
systems. Covers production, development, endpoints, and third-party
services.

## 2. Principles
Least privilege · defence in depth · secure by default · everything
auditable · no security exceptions without written, time-boxed acceptance
by the owner of this policy.

## 3. Access control
- Production access is limited to named individuals; every human account is
  personal (no shared logins) and uses MFA.
- Platform administrator roles require MFA — enforced by the software, not
  by convention.
- Access is reviewed quarterly and revoked the same day a person leaves.

## 4. Data handling
- Customer data lives only in production systems — never on laptops, in
  spreadsheets, chat tools, or personal accounts.
- Demo/test environments use synthetic data only.
- Retention and destruction follow docs/DATA-PROTECTION.md §2.

## 5. Secrets
Secrets exist only in environment configuration or a secret manager; never
in the repository, tickets or chat (enforced by CI secret scanning). Keys
rotate annually and immediately on suspected compromise or leaver with
access.

## 6. Endpoints
Company/dev machines: full-disk encryption on, OS auto-updates on, screen
lock ≤ 5 min, password manager required.

## 7. Software development
All changes flow through version control and CI (tests, dependency and
secret scanning); patching follows the SLAs in docs/SECURITY.md §8;
production deploys are recorded.

## 8. Suppliers
New suppliers handling personal data require a DPA and a security review
before use; the sub-processor list in the ROPA is kept current.

## 9. Incidents
Follow the Incident Response Plan (incident-response-plan.md). Everyone's
first duty on suspecting an incident is to report it immediately — blame
comes nowhere; silence is the only failure.

## 10. Compliance
This policy operationalises UK GDPR art. 32 and aligns with Cyber
Essentials. Breaches of this policy are treated as conduct matters.
