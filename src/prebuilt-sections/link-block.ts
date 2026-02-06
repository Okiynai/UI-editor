import { SectionNode } from '@/OSDL/OSDL.types';

export interface PreBuiltSection {
  metadata: {
    id: string;
    sectionType: string;
    previewImage: string;
    originTheme: string;
  };
  schema: Omit<SectionNode, 'id' | 'name' | 'order'>;
}

export const linkBlockSection: PreBuiltSection = {
  metadata: {
    id: 'link',
    sectionType: 'link',
    previewImage: '/pre-built-sections/default_hero.png',
    originTheme: 'minimal-core'
  },
  schema: {
    type: 'section',
    params: {},
    layout: {
      mode: 'flow',
      padding: '1rem',
      margin: '0',
      width: '100%'
    },
    children: [
      {
        id: 'link-block-item',
        type: 'atom',
        atomType: 'Link',
        order: 0,
        params: {
          href: '/',
          content: 'Link label',
          color: '#0f172a',
          fontWeight: '600',
          textDecoration: 'underline'
        }
      }
    ]
  }
};
