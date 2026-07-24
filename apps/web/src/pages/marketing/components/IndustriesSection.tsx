import { TabbedShowcase } from './TabbedShowcase';
import { CARE_SETTINGS } from '../marketingData';

export function IndustriesSection() {
  return (
    <TabbedShowcase
      id="who-its-for"
      hashPrefix="setting"
      heading="Care settings we work with"
      subheading="If it can be rostered, it can run on My-Cura. Pick your setting."
      items={CARE_SETTINGS}
      tone="tinted"
    />
  );
}
