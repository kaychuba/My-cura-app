import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PRICING_TIERS } from '@my-cura/shared-types';

export function PricingTeaserSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
          Simple, flat pricing
        </h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          One monthly fee per agency. No per-visit charges, no surprises.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.tier}
            className={`card p-5 text-center ${
              tier.mostPopular ? 'border-2 border-primary-500 dark:border-primary-400' : ''
            }`}
          >
            <p className="font-semibold text-slate-900 dark:text-white">{tier.name}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {tier.monthlyPrice !== null ? (
                <>
                  £{tier.monthlyPrice}
                  <span className="text-sm font-normal text-slate-400">/mo</span>
                </>
              ) : (
                <span className="text-lg">Let's talk</span>
              )}
            </p>
            <p className="mt-1 text-xs text-slate-500">{tier.seatCap}</p>
          </div>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link to="/pricing" className="btn-ghost inline-flex items-center gap-2 text-sm">
          Compare plans in full <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
