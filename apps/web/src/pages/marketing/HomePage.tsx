import { usePageMeta } from '../../hooks/usePageMeta';
import { HeroSection } from './components/HeroSection';
import { FeaturesSection } from './components/FeaturesSection';
import { SecuritySection } from './components/SecuritySection';
import { PricingTeaserSection } from './components/PricingTeaserSection';
import { FinalCtaSection } from './components/FinalCtaSection';

export function HomePage() {
  usePageMeta({
    title: 'My-Cura — Care Management Software for UK Domiciliary Care Agencies',
    description:
      'Rostering, medication (MAR), GPS-verified visits, payroll and CQC-ready compliance in one platform. Free trial, no card needed.',
  });

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <SecuritySection />
      <PricingTeaserSection />
      <FinalCtaSection />
    </>
  );
}
