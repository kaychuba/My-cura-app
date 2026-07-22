import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function FinalCtaSection() {
  return (
    <section className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
          Your own private My-Cura in minutes
        </h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Create your agency, add your carers and service users — or import them
          straight from your old software.
        </p>
        <Link
          to="/signup"
          className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base mt-8"
        >
          Start your free trial <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="mt-3 text-sm text-slate-400">No card required.</p>
      </div>
    </section>
  );
}
