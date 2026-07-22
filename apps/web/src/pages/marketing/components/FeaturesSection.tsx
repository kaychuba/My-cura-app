import {
  Calendar, Pill, MapPin, Heart, CreditCard, AlertTriangle, BookOpen, Smartphone,
} from 'lucide-react';

// Every card maps 1:1 to a module that actually exists in the product.
const FEATURES = [
  {
    icon: Calendar,
    title: 'Scheduling & rostering',
    body: 'Plan shifts in minutes; carers see them instantly and get alerts if a clock-in is running late.',
  },
  {
    icon: Pill,
    title: 'Medication (MAR)',
    body: 'Admin-scheduled doses, PRN medication, initials-signed records and witness checks for controlled drugs.',
  },
  {
    icon: MapPin,
    title: 'GPS-verified visits',
    body: 'Clock-in and out at the doorstep. Out-of-range or duplicate events are flagged for manager review.',
  },
  {
    icon: Heart,
    title: 'Care plans & records',
    body: 'Service-user profiles, hourly care documentation with traffic-light status, visit notes and body maps.',
  },
  {
    icon: CreditCard,
    title: 'Payroll built in',
    body: 'UK and US payroll engines turn verified visit hours into payslips without re-keying.',
  },
  {
    icon: AlertTriangle,
    title: 'Incidents & safeguarding',
    body: 'Incident reporting with escalation, whistleblowing channel, and manager alerts on refused medication.',
  },
  {
    icon: BookOpen,
    title: 'Compliance & audit trail',
    body: 'Policies with acknowledgements, consent records, and a tamper-resistant audit log of every change.',
  },
  {
    icon: Smartphone,
    title: 'Carer mobile app',
    body: 'Shifts, MAR, notes, leave, payslips and training in a carer’s pocket — with offline support for patchy signal.',
  },
];

export function FeaturesSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
          Everything an agency runs on
        </h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          One system from the first rostered visit to the payslip it generates.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-5">
            <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-3">
              <Icon className="w-5 h-5 text-primary-500 dark:text-primary-300" />
            </div>
            <p className="font-semibold text-slate-900 dark:text-white mb-1">{title}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
