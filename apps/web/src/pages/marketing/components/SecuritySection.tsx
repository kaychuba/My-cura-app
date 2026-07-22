import { KeyRound, Lock, Database, FileSearch, ShieldCheck, Server } from 'lucide-react';

// Only claims that are true of the shipped product today (see docs/SECURITY.md).
const SECURITY_POINTS = [
  {
    icon: KeyRound,
    title: 'Mandatory MFA for admins',
    body: 'Every administrator and manager account must use an authenticator app — enforced by the server, not by policy alone.',
  },
  {
    icon: Database,
    title: 'Tenant isolation at the database',
    body: 'Row-level security means one agency’s data is invisible to every other agency — even to buggy code.',
  },
  {
    icon: FileSearch,
    title: 'Tamper-resistant audit trail',
    body: 'Care record changes, medication actions and consent decisions are logged append-only. History cannot be rewritten.',
  },
  {
    icon: Lock,
    title: 'Encryption everywhere it matters',
    body: 'Signatures, identifiers and 2FA secrets are field-encrypted; every backup is encrypted and restore-tested.',
  },
  {
    icon: ShieldCheck,
    title: 'UK GDPR by design',
    body: 'Statutory retention schedules, consent with Mental Capacity Act safeguards, and a documented data-protection programme.',
  },
  {
    icon: Server,
    title: 'Resilient by routine',
    body: 'Nightly encrypted backups with alerting, minuted restore drills, and a written continuity plan.',
  },
];

export function SecuritySection() {
  return (
    <section className="bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-white">
            Health data deserves an eggshell, not a promise
          </h2>
          <p className="mt-3 text-primary-100">
            My-Cura holds special-category health data, so security is built into the
            architecture — not bolted on for the sales page.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECURITY_POINTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[12px] bg-white/10 backdrop-blur-sm border border-white/15 p-5">
              <Icon className="w-5 h-5 text-secondary-200 mb-3" />
              <p className="font-semibold text-white mb-1">{title}</p>
              <p className="text-sm text-primary-100">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
