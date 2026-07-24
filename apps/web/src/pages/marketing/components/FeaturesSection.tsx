import {
  Calendar, HeartHandshake, ClipboardList, Pill, Briefcase, CreditCard, BookOpen, Smartphone,
} from 'lucide-react';

// Every card maps 1:1 to modules that actually exist in the product.
const FEATURES = [
  {
    icon: Calendar,
    title: 'Scheduling & Rostering',
    body: 'Build the week’s rota in minutes. Carers see new shifts instantly, and late clock-ins trigger alerts before a visit is missed.',
  },
  {
    icon: HeartHandshake,
    title: 'Care Management',
    body: 'Hourly care documentation with traffic-light status, visit notes, body maps and manager oversight of every visit.',
  },
  {
    icon: ClipboardList,
    title: 'Digital Care Plans',
    body: 'Rich service-user profiles with conditions, contacts, consent records and versioned care plans — no paper folders.',
  },
  {
    icon: Pill,
    title: 'Medication Management',
    body: 'Full eMAR: admin-scheduled doses, PRN medication, initials-signed records, witness checks for controlled drugs and refusal alerts.',
  },
  {
    icon: Briefcase,
    title: 'HR Toolkit',
    body: 'Recruitment pipeline, training records with expiry tracking, leave management and expenses — the whole staff file in one place.',
  },
  {
    icon: CreditCard,
    title: 'Invoicing & Payroll',
    body: 'GPS-verified visit hours flow straight into UK and US payroll engines and client invoicing without re-keying.',
  },
  {
    icon: BookOpen,
    title: 'Compliance & Audits',
    body: 'Policies with acknowledgements, incident reporting, whistleblowing and a tamper-resistant audit trail of every change.',
  },
  {
    icon: Smartphone,
    title: 'Carer Mobile App',
    body: 'Shifts, GPS clock-in, eMAR, notes, payslips and training in a carer’s pocket — with offline support for patchy signal.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">My-Cura features</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Every operational need of a care provider, covered in one system.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-6">
            <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4">
              <Icon className="w-5 h-5 text-primary-500 dark:text-primary-300" />
            </div>
            <p className="font-semibold text-lg text-slate-900 dark:text-white mb-1.5">{title}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
