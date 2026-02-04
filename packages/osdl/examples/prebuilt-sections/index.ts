import { navbar } from './navbar';
import { heroSection } from './hero';

export const prebuiltSections: Record<string, any> = {
  'navbar': navbar,
  'hero-section': heroSection
};

export type PrebuiltSectionId = string;
