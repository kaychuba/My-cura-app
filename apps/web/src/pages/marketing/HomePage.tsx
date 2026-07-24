import { usePageMeta } from '../../hooks/usePageMeta';
import { HeroSection } from './components/HeroSection';
import { TrustStripSection } from './components/TrustStripSection';
import { FeaturesSection } from './components/FeaturesSection';
import { IndustriesSection } from './components/IndustriesSection';
import { SecuritySection } from './components/SecuritySection';
import { PricingTeaserSection } from './components/PricingTeaserSection';
import { FinalCtaSection } from './components/FinalCtaSection';

export function HomePage() {
  usePageMeta({
    title: 'My-Cura — Care Management Software for UK Domiciliary Care Agencies',
    description:
      'One platform, one record for every visit: rostering, eMAR medication, GPS-verified visits, payroll and CQC-ready compliance. Free trial, no card needed.',
  });

  return (
    <>
      <HeroSection />
      <TrustStripSection />
      <FeaturesSection />
      <IndustriesSection />
      <SecuritySection />
      <PricingTeaserSection />
      <FinalCtaSection />
    </>
  );
}
