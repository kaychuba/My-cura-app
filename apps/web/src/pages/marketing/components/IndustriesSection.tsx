import { Home, BedDouble, Building2, MoonStar, Pill, Coffee } from 'lucide-react';

// Care settings the platform genuinely supports today (each is a shift type
// in the scheduling module — see ShiftType in @my-cura/shared-types).
const SETTINGS = [
  {
    icon: Home,
    title: 'Home & personal care',
    body: 'Classic domiciliary rounds: personal care visits, GPS-verified arrival at the doorstep, and hour-by-hour documentation.',
  },
  {
    icon: BedDouble,
    title: 'Live-in care',
    body: 'Long placements with continuous records — one carer, one home, and a complete history the whole team can see.',
  },
  {
    icon: Building2,
    title: 'Supported living',
    body: 'Scheduled support across shared settings, with care plans, consent and incident reporting per person supported.',
  },
  {
    icon: MoonStar,
    title: 'Overnight & waking nights',
    body: 'Sleep-in and waking-night shifts roster like any other visit, so night cover never falls out of the record.',
  },
  {
    icon: Pill,
    title: 'Medication-led visits',
    body: 'Short prompts and administration calls run on the eMAR with scheduled doses, PRN and controlled-drug safeguards.',
  },
  {
    icon: Coffee,
    title: 'Companionship & social care',
    body: 'Social visits and community support, documented with the same care record as personal care.',
  },
];

export function IndustriesSection() {
  return (
    <section
      id="who-its-for"
      className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-700 scroll-mt-20"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Care settings we work with
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            If it can be rostered, it can run on My-Cura.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SETTINGS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-6">
              <div className="w-10 h-10 rounded-lg bg-secondary-50 dark:bg-secondary-900/30 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-secondary-600 dark:text-secondary-300" />
              </div>
              <p className="font-semibold text-lg text-slate-900 dark:text-white mb-1.5">{title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
