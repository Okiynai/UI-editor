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

export const imageBlockSection: PreBuiltSection = {
  metadata: {
    id: 'image-block',
    sectionType: 'media',
    previewImage: '/pre-built-sections/default_hero.png',
    originTheme: 'minimal-core'
  },
  schema: {
    type: 'section',
    params: {},
    layout: {
      mode: 'flex',
      direction: 'column',
      gap: '0.75rem',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      padding: '2rem',
      margin: '0',
      width: '100%'
    },
    children: [
      {
        id: 'image-block-image',
        type: 'atom',
        atomType: 'Image',
        order: 0,
        params: {
          src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&h=800&fit=crop',
          alt: 'Product image',
          width: '100%',
          height: 'auto',
          objectFit: 'cover'
        }
      },
      {
        id: 'image-block-caption',
        type: 'atom',
        atomType: 'Text',
        order: 1,
        params: {
          content: 'Short caption for the image',
          tag: 'p',
          fontSize: '0.95rem',
          color: '#475569'
        }
      }
    ]
  }
};
