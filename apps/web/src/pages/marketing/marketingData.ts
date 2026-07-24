import type { LucideIcon } from 'lucide-react';
import {
  Calendar, HeartHandshake, ClipboardList, Pill, Briefcase, CreditCard, BookOpen, Smartphone,
  Home, BedDouble, Building2, MoonStar, Coffee, Syringe,
} from 'lucide-react';

/**
 * Single source for the marketing site's feature/care-setting taxonomy:
 * consumed by the nav dropdowns AND the tabbed home-page sections, so a
 * dropdown item can never point at a tab that doesn't exist. Every entry
 * maps to a module or shift type that genuinely ships.
 */
export interface MarketingItem {
  slug: string;
  icon: LucideIcon;
  title: string;
  body: string;
  highlights: string[];
}

export const FEATURES: MarketingItem[] = [
  {
    slug: 'scheduling',
    icon: Calendar,
    title: 'Scheduling & Rostering',
    body: 'Build the week’s rota in minutes and let the system keep everyone honest — carers see new shifts instantly, and late clock-ins raise alerts before a visit is missed.',
    highlights: [
      'Drag-fast weekly rota with shift types for every care setting',
      'Instant shift visibility in the carer app',
      'Late clock-in and clock-out alerts, 15 minutes either side',
      'Managers can clock a worker in/out and stamp scheduled times',
    ],
  },
  {
    slug: 'care-management',
    icon: HeartHandshake,
    title: 'Care Management',
    body: 'Hour-by-hour care documentation with a traffic-light status board, so the office can see at a glance which visits are done, due or drifting.',
    highlights: [
      'Hourly care documentation against allocated hours',
      'Traffic-light oversight: green done, orange due, red missed',
      'Visit notes with mood, appetite, fluids and pain tracking',
      'Body maps and escalation levels that alert managers',
    ],
  },
  {
    slug: 'care-plans',
    icon: ClipboardList,
    title: 'Digital Care Plans',
    body: 'Everything about a person in one profile: conditions, contacts, consent and versioned care plans that activate with a click.',
    highlights: [
      'Full service-user profiles with clinical and family contacts',
      'Draft → active care plan lifecycle',
      'Consent recorded with Mental Capacity Act safeguards',
      'Allergies, conditions and communication needs up front',
    ],
  },
  {
    slug: 'medication',
    icon: Pill,
    title: 'Medication Management',
    body: 'A full eMAR built to CQC expectations — scheduled doses set by the office, signed by carers, witnessed for controlled drugs.',
    highlights: [
      'Admin-scheduled doses with exact date/times',
      'PRN medication always available to record, with repeat guards',
      'Initials as signature, encrypted at rest',
      'Witness required for controlled drugs; refusals alert managers',
    ],
  },
  {
    slug: 'hr',
    icon: Briefcase,
    title: 'HR Toolkit',
    body: 'The whole staff file in one place — from application to training expiry — without a filing cabinet.',
    highlights: [
      'Recruitment pipeline for new carers',
      'Training records with expiry alerts',
      'Leave requests and approvals',
      'Expenses submitted from the carer app',
    ],
  },
  {
    slug: 'payroll',
    icon: CreditCard,
    title: 'Invoicing & Payroll',
    body: 'GPS-verified visit hours flow straight into payroll and client invoicing — no re-keying, no disputed timesheets.',
    highlights: [
      'UK and US payroll engines built in',
      'Payslips delivered to the carer app',
      'Client invoicing from verified visit hours',
      'Stripe-ready subscription billing',
    ],
  },
  {
    slug: 'compliance',
    icon: BookOpen,
    title: 'Compliance & Audits',
    body: 'Evidence that writes itself: policies, incidents, whistleblowing and an audit trail that physically cannot be rewritten.',
    highlights: [
      'Policies published with staff acknowledgements',
      'Incident reporting with escalation',
      'Confidential whistleblowing channel to the owner',
      'Append-only, tamper-resistant audit log',
    ],
  },
  {
    slug: 'mobile-app',
    icon: Smartphone,
    title: 'Carer Mobile App',
    body: 'Everything a carer needs in their pocket — built for real rounds, including the ones with no signal.',
    highlights: [
      'Shifts, GPS clock-in/out and eMAR on the phone',
      'Visit notes, leave, payslips, expenses and training',
      'Offline queue syncs when signal returns',
      'Deep purple theme your carers will actually like',
    ],
  },
];

export const CARE_SETTINGS: MarketingItem[] = [
  {
    slug: 'home-care',
    icon: Home,
    title: 'Home & personal care',
    body: 'Classic domiciliary rounds: personal care visits, GPS-verified arrival at the doorstep, and hour-by-hour documentation.',
    highlights: [
      'Personal care and medication shift types',
      'GPS clock-in within metres of the front door',
      '3-hour missed-visit escalation',
    ],
  },
  {
    slug: 'live-in',
    icon: BedDouble,
    title: 'Live-in care',
    body: 'Long placements with continuous records — one carer, one home, and a complete history the whole team can see.',
    highlights: [
      'Live-in shift type with continuous scheduling',
      'Full care record shared across the rotation',
      'Handover notes between placements',
    ],
  },
  {
    slug: 'supported-living',
    icon: Building2,
    title: 'Supported living',
    body: 'Scheduled support across shared settings, with care plans, consent and incident reporting per person supported.',
    highlights: [
      'Per-person care plans in shared settings',
      'Consent with capacity safeguards',
      'Incident and safeguarding workflows',
    ],
  },
  {
    slug: 'nights',
    icon: MoonStar,
    title: 'Overnight & waking nights',
    body: 'Sleep-in and waking-night shifts roster like any other visit, so night cover never falls out of the record.',
    highlights: [
      'Overnight, sleep-in and waking-night shift types',
      'Night doses on the same eMAR',
      'Clock-out alerts at handover',
    ],
  },
  {
    slug: 'medication-visits',
    icon: Syringe,
    title: 'Medication-led visits',
    body: 'Short prompts and administration calls run on the eMAR with scheduled doses, PRN and controlled-drug safeguards.',
    highlights: [
      'Medication shift type for short calls',
      'Scheduled and PRN doses with repeat guards',
      'Witnessed controlled-drug administration',
    ],
  },
  {
    slug: 'companionship',
    icon: Coffee,
    title: 'Companionship & social care',
    body: 'Social visits and community support, documented with the same care record as personal care.',
    highlights: [
      'Social shift type on the same rota',
      'Mood and wellbeing tracked in visit notes',
      'Family-visible record keeping (coming to the family app)',
    ],
  },
];
