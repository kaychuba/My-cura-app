import { SubscriptionTier } from './enums';

/**
 * Single source of truth for subscription tier pricing/features — consumed
 * by the public pricing page, the homepage pricing teaser, and the
 * authenticated Finance page's upgrade flow, so the numbers shown to a
 * prospect and the numbers shown to a paying customer can never drift apart.
 *
 * Purely display data: it does not touch the Stripe Price IDs in
 * apps/api/src/modules/finance/finance.service.ts. When real Stripe Prices
 * are provisioned, set their amounts to match the numbers here.
 */
export interface PricingTier {
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  /** GBP/month when billed monthly. null = no public price ("Contact us"). */
  monthlyPrice: number | null;
  /** GBP/month equivalent when billed annually. null = no public price. */
  annualMonthlyPrice: number | null;
  seatCap: string;
  features: string[];
  mostPopular?: boolean;
  ctaLabel: string;
}

/** Discount baked into annualMonthlyPrice vs monthlyPrice, for display (e.g. "Save 17%"). */
export const ANNUAL_DISCOUNT_PERCENT = 17;

export const PRICING_TIERS: PricingTier[] = [
  {
    tier: SubscriptionTier.STARTER,
    name: 'Starter',
    tagline: 'For small agencies getting started',
    monthlyPrice: 59,
    annualMonthlyPrice: 49,
    seatCap: 'Up to 10 care workers',
    features: ['Up to 10 care workers', 'Basic scheduling', 'GPS clock-in', 'Email support'],
    ctaLabel: 'Start free trial',
  },
  {
    tier: SubscriptionTier.PROFESSIONAL,
    name: 'Professional',
    tagline: 'Full compliance tooling for growing agencies',
    monthlyPrice: 149,
    annualMonthlyPrice: 124,
    seatCap: 'Up to 100 care workers',
    features: [
      'Up to 100 care workers',
      'Full MAR module',
      'UK + US payroll engines',
      'Incident management',
      'Priority support',
    ],
    mostPopular: true,
    ctaLabel: 'Start free trial',
  },
  {
    tier: SubscriptionTier.ENTERPRISE,
    name: 'Enterprise',
    tagline: 'For multi-branch and franchise operators',
    monthlyPrice: null,
    annualMonthlyPrice: null,
    seatCap: 'Unlimited care workers',
    features: [
      'Unlimited care workers',
      'AI care summaries',
      'White-label branding',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    ctaLabel: 'Contact sales',
  },
];
