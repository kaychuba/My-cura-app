import { TabbedShowcase } from './TabbedShowcase';
import { FEATURES } from '../marketingData';

export function FeaturesSection() {
  return (
    <TabbedShowcase
      id="features"
      hashPrefix="feature"
      heading="My-Cura features"
      subheading="Every operational need of a care provider, covered in one system. Pick a feature to explore it."
      items={FEATURES}
    />
  );
}
