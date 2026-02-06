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

export const columnsTwoSection: PreBuiltSection = {
  metadata: {
    id: 'columns-2',
    sectionType: 'layout',
    previewImage: '/pre-built-sections/default_hero.png',
    originTheme: 'minimal-core'
  },
  schema: {
    type: 'section',
    params: {},
    layout: {
      mode: 'flex',
      direction: 'row',
      gap: '2rem',
      justifyContent: 'space-between',
      alignItems: 'stretch',
      padding: '2rem',
      margin: '0',
      width: '100%'
    },
    children: [
      {
        id: 'column-left',
        type: 'section',
        order: 0,
        params: {},
        layout: {
          mode: 'flex',
          direction: 'column',
          gap: '0.75rem',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          padding: '0',
          margin: '0',
          width: '100%'
        },
        children: [
          {
            id: 'column-left-title',
            type: 'atom',
            atomType: 'Text',
            order: 0,
            params: {
              content: 'Left column',
              tag: 'h3',
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#0f172a'
            }
          },
          {
            id: 'column-left-body',
            type: 'atom',
            atomType: 'Text',
            order: 1,
            params: {
              content: 'Add your content here. Keep it compact and scannable.',
              tag: 'p',
              fontSize: '0.95rem',
              color: '#475569'
            }
          }
        ]
      },
      {
        id: 'column-right',
        type: 'section',
        order: 1,
        params: {},
        layout: {
          mode: 'flex',
          direction: 'column',
          gap: '0.75rem',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          padding: '0',
          margin: '0',
          width: '100%'
        },
        children: [
          {
            id: 'column-right-title',
            type: 'atom',
            atomType: 'Text',
            order: 0,
            params: {
              content: 'Right column',
              tag: 'h3',
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#0f172a'
            }
          },
          {
            id: 'column-right-body',
            type: 'atom',
            atomType: 'Text',
            order: 1,
            params: {
              content: 'This is the second column. Use it for details or a list.',
              tag: 'p',
              fontSize: '0.95rem',
              color: '#475569'
            }
          }
        ]
      }
    ]
  }
};
