import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock } from 'lucide-react';

const DEMO_MAILTO = 'mailto:hello@mycura.app?subject=My-Cura%20demo%20request';

export function FinalCtaSection() {
  return (
    <section className="bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-white">
          See it working before you commit to anything
        </h2>
        <p className="mt-3 text-primary-100">
          Book a demo with us and walk through a real agency's day — or start your own
          private My-Cura now and import your data straight from your old software.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={DEMO_MAILTO}
            className="inline-flex items-center gap-2 bg-white text-primary-600 hover:bg-primary-50 font-medium px-6 py-3 rounded-lg transition-colors text-base"
          >
            <CalendarClock className="w-4 h-4" /> Book a demo
          </a>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 border border-white/40 text-white hover:bg-white/10 font-medium px-6 py-3 rounded-lg transition-colors text-base"
          >
            Start your free trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <p className="mt-3 text-sm text-primary-200">No card required.</p>
      </div>
    </section>
  );
}
