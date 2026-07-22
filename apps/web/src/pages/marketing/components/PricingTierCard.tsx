import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import type { PricingTier } from '@my-cura/shared-types';

// Placeholder inbox — swap when a real sales address exists.
const SALES_MAILTO = 'mailto:sales@mycura.app?subject=My-Cura%20Enterprise';

export function PricingTierCard({
  tier,
  billing,
}: {
  tier: PricingTier;
  billing: 'monthly' | 'annual';
}) {
  const price = billing === 'annual' ? tier.annualMonthlyPrice : tier.monthlyPrice;

  return (
    <div
      className={`card p-6 flex flex-col ${
        tier.mostPopular ? 'border-2 border-primary-500 dark:border-primary-400 relative' : ''
      }`}
    >
      {tier.mostPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full">
          Most popular
        </span>
      )}

      <p className="font-semibold text-lg text-slate-900 dark:text-white">{tier.name}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tier.tagline}</p>

      <div className="mt-5 mb-1">
        {price !== null ? (
          <>
            <span className="text-4xl font-bold text-slate-900 dark:text-white">£{price}</span>
            <span className="text-sm text-slate-400"> /month</span>
          </>
        ) : (
          <span className="text-2xl font-bold text-slate-900 dark:text-white">Let's talk</span>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-5">
        {price !== null
          ? billing === 'annual'
            ? `£${(price * 12).toLocaleString('en-GB')}/year, billed annually`
            : 'Billed monthly, cancel any time'
          : 'Tailored to your group'}
      </p>

      <ul className="space-y-2 flex-1 mb-6">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <CheckCircle className="w-4 h-4 text-accent-500 flex-shrink-0 mt-0.5" />
            {feature}
          </li>
        ))}
      </ul>

      {tier.monthlyPrice !== null ? (
        <Link to="/signup" className="btn-primary text-center text-sm py-2.5">
          {tier.ctaLabel}
        </Link>
      ) : (
        <a href={SALES_MAILTO} className="btn-secondary text-center text-sm py-2.5">
          {tier.ctaLabel}
        </a>
      )}
    </div>
  );
}
