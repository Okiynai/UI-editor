export interface PrebuiltSectionMetadata {
  id: string;
  sectionType: string;
  variant: string;
  version: string;
  category: 'navigation' | 'hero' | 'forms' | 'product' | 'content' | 'marketing' | 'footer';
  tags: string[];
  originThemeId: string;
  suitableThemes: string[];
  previewImage: string;
  schema: Record<string, any>;
  exampleProps: Record<string, any>;
  a11yLevel: 'basic' | 'enhanced' | 'strong';
  status: 'stable' | 'beta' | 'deprecated';
  description: string;
  displayName: string;
}

export interface PrebuiltSectionEntry {
  metadata: PrebuiltSectionMetadata;
  componentPath: string;
}

export interface PrebuiltSectionsRegistry {
  version: string;
  sections: PrebuiltSectionEntry[];
}
