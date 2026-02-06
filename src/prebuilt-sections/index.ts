import { textBlockSection } from './text-block';
import { imageBlockSection } from './image-block';
import { columnsTwoSection } from './columns-2';
import { gridThreeSection } from './grid-3';
import { buttonGroupSection } from './button-group';
import { linkBlockSection } from './link-block';

export const prebuiltSections: Record<string, any> = {
  'text-block': textBlockSection,
  'image-block': imageBlockSection,
  'columns-2': columnsTwoSection,
  'grid-3': gridThreeSection,
  'button-group': buttonGroupSection,
  'link': linkBlockSection
};

export type PrebuiltSectionId = string;
