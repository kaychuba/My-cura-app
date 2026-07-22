import { useState } from 'react';
import { ANNUAL_DISCOUNT_PERCENT, PRICING_TIERS } from '@my-cura/shared-types';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PricingTierCard } from './components/PricingTierCard';
import { FinalCtaSection } from './components/FinalCtaSection';

const FAQS = [
  {
    q: 'Is there a free trial?',
    a: 'Yes — sign up and use your own private My-Cura free, with no card needed. Pick a plan when you’re ready to commit.',
  },
  {
    q: 'Can we bring data from our current software?',
    a: 'Yes. The import wizard takes CSV exports of service users, care workers and medications from other care-management systems, validates them, and maps them into My-Cura.',
  },
  {
    q: 'Does the price depend on how many visits we deliver?',
    a: 'No. Pricing is a flat monthly fee per agency based on your plan’s care-worker cap — never per visit, per client, or per payslip.',
  },
  {
    q: 'What happens if we grow past our plan’s cap?',
    a: 'Upgrade in the app at any time; the change takes effect immediately and billing adjusts pro-rata.',
  },
  {
    q: 'How is our data protected?',
    a: 'Tenant isolation is enforced in the database itself, administrators must use MFA, sensitive fields and all backups are encrypted, and every change is written to a tamper-resistant audit log.',
  },
];

export function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  usePageMeta({
    title: 'Pricing — My-Cura',
    description:
      'Simple flat pricing for UK care agencies. Starter, Professional and Enterprise plans — free trial, no card needed.',
  });

  return (
    <>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            Pricing that stays out of your way
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            One flat monthly fee per agency. Every plan includes the carer mobile app,
            unlimited service users, and all future updates.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-800">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billing === 'monthly'
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                billing === 'annual'
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Annual
              <span className={billing === 'annual' ? 'badge-green' : 'badge-teal'}>
                Save {ANNUAL_DISCOUNT_PERCENT}%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch max-w-4xl mx-auto">
          {PRICING_TIERS.map((tier) => (
            <PricingTierCard key={tier.tier} tier={tier} billing={billing} />
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">
            Common questions
          </h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="card p-5">
                <p className="font-semibold text-slate-900 dark:text-white mb-1.5">{q}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCtaSection />
    </>
  );
}
