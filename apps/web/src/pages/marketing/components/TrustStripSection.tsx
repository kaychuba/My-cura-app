import { Lock, ShieldCheck, Database, FileSearch, HardDriveDownload } from 'lucide-react';

/**
 * Where an established vendor shows a client-logo bar, we show the security
 * facts a care buyer actually checks — every one true of the shipped product.
 */
const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'UK GDPR compliant' },
  { icon: Lock, label: 'Mandatory MFA for admins' },
  { icon: Database, label: 'Tenant data isolation' },
  { icon: FileSearch, label: 'Tamper-resistant audit trail' },
  { icon: HardDriveDownload, label: 'Encrypted, restore-tested backups' },
];

export function TrustStripSection() {
  return (
    <section className="border-y border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {TRUST_ITEMS.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400"
          >
            <Icon className="w-4 h-4 text-secondary-500" />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
