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

export const gridThreeSection: PreBuiltSection = {
  metadata: {
    id: 'grid-3',
    sectionType: 'layout',
    previewImage: '/pre-built-sections/default_hero.png',
    originTheme: 'minimal-core'
  },
  schema: {
    type: 'section',
    params: {},
    layout: {
      mode: 'grid',
      gap: '1.5rem',
      padding: '2rem',
      margin: '0',
      width: '100%',
      gridColumns: 3,
      gridColumnsUnit: 'fr'
    },
    children: [
      {
        id: 'grid-card-1',
        type: 'section',
        order: 0,
        params: {},
        layout: {
          mode: 'flex',
          direction: 'column',
          gap: '0.5rem',
          padding: '1rem',
          margin: '0',
          width: '100%'
        },
        inlineStyles: {
          border: '1px solid #e2e8f0',
          borderRadius: '12px'
        },
        children: [
          {
            id: 'grid-card-1-title',
            type: 'atom',
            atomType: 'Text',
            order: 0,
            params: {
              content: 'Card 1',
              tag: 'h4',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#0f172a'
            }
          },
          {
            id: 'grid-card-1-body',
            type: 'atom',
            atomType: 'Text',
            order: 1,
            params: {
              content: 'Short supporting text for this card.',
              tag: 'p',
              fontSize: '0.9rem',
              color: '#475569'
            }
          }
        ]
      },
      {
        id: 'grid-card-2',
        type: 'section',
        order: 1,
        params: {},
        layout: {
          mode: 'flex',
          direction: 'column',
          gap: '0.5rem',
          padding: '1rem',
          margin: '0',
          width: '100%'
        },
        inlineStyles: {
          border: '1px solid #e2e8f0',
          borderRadius: '12px'
        },
        children: [
          {
            id: 'grid-card-2-title',
            type: 'atom',
            atomType: 'Text',
            order: 0,
            params: {
              content: 'Card 2',
              tag: 'h4',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#0f172a'
            }
          },
          {
            id: 'grid-card-2-body',
            type: 'atom',
            atomType: 'Text',
            order: 1,
            params: {
              content: 'Short supporting text for this card.',
              tag: 'p',
              fontSize: '0.9rem',
              color: '#475569'
            }
          }
        ]
      },
      {
        id: 'grid-card-3',
        type: 'section',
        order: 2,
        params: {},
        layout: {
          mode: 'flex',
          direction: 'column',
          gap: '0.5rem',
          padding: '1rem',
          margin: '0',
          width: '100%'
        },
        inlineStyles: {
          border: '1px solid #e2e8f0',
          borderRadius: '12px'
        },
        children: [
          {
            id: 'grid-card-3-title',
            type: 'atom',
            atomType: 'Text',
            order: 0,
            params: {
              content: 'Card 3',
              tag: 'h4',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#0f172a'
            }
          },
          {
            id: 'grid-card-3-body',
            type: 'atom',
            atomType: 'Text',
            order: 1,
            params: {
              content: 'Short supporting text for this card.',
              tag: 'p',
              fontSize: '0.9rem',
              color: '#475569'
            }
          }
        ]
      }
    ]
  }
};
