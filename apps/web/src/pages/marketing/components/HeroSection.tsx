import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarCheck, MapPin, Pill, Users } from 'lucide-react';

// Placeholder inbox — swap when a real demo-booking flow exists.
const DEMO_MAILTO = 'mailto:hello@mycura.app?subject=My-Cura%20demo%20request';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* soft brand wash behind the hero */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-50 to-white dark:from-slate-800/60 dark:to-slate-900 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 lg:pt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
          <span className="badge-teal inline-block mb-4">Built for UK domiciliary care</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
            One platform. One record. Every visit.
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-xl">
            My-Cura is a single digital care ecosystem for home-care agencies — rostering,
            medication, care records, payroll and compliance managed in one place, from the
            office desk to the carer's pocket.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href={DEMO_MAILTO} className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base">
              Book a demo <ArrowRight className="w-4 h-4" />
            </a>
            <Link to="/signup" className="btn-secondary px-6 py-3 text-base">
              Start free trial
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-400">Free trial, no card needed.</p>
        </motion.div>

        {/* Static product-style preview built from the app's own components */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="hidden md:block"
          aria-hidden="true"
        >
          <div className="card p-5 space-y-4 shadow-modal">
            <div className="flex items-center justify-between">
              <p className="section-header">Today at Willow Court Care</p>
              <span className="badge-green">On track</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: CalendarCheck, label: 'Visits today', value: '38' },
                { icon: Users, label: 'Carers out', value: '12' },
                { icon: Pill, label: 'Doses due', value: '9' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="stat-card !p-4">
                  <Icon className="w-4 h-4 text-primary-400" />
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                { time: '08:00', who: 'Doris W. — morning care', status: 'Completed', color: 'badge-green' },
                { time: '12:30', who: 'Arthur P. — lunch & meds', status: 'In progress', color: 'badge-blue' },
                { time: '17:00', who: 'May T. — evening visit', status: 'Scheduled', color: 'badge-amber' },
              ].map((row) => (
                <div
                  key={row.time}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2"
                >
                  <span className="font-mono text-xs text-slate-400">{row.time}</span>
                  <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 truncate">{row.who}</span>
                  <span className={row.color}>{row.status}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-secondary-500" />
              GPS-verified clock-ins · MAR signed with carer initials
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
