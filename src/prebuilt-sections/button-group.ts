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

export const buttonGroupSection: PreBuiltSection = {
  metadata: {
    id: 'button-group',
    sectionType: 'cta',
    previewImage: '/pre-built-sections/default_hero.png',
    originTheme: 'minimal-core'
  },
  schema: {
    type: 'section',
    params: {},
    layout: {
      mode: 'flex',
      direction: 'row',
      gap: '0.75rem',
      justifyContent: 'flex-start',
      alignItems: 'center',
      padding: '1.5rem',
      margin: '0',
      width: '100%'
    },
    children: [
      {
        id: 'button-group-primary',
        type: 'atom',
        atomType: 'Button',
        order: 0,
        params: {
          content: 'Primary',
          background: '#0f172a',
          color: '#ffffff',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          fontSize: '0.95rem',
          fontWeight: '600',
          border: 'none',
          cursor: 'pointer'
        }
      },
      {
        id: 'button-group-secondary',
        type: 'atom',
        atomType: 'Button',
        order: 1,
        params: {
          content: 'Secondary',
          background: 'transparent',
          color: '#0f172a',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          fontSize: '0.95rem',
          fontWeight: '600',
          border: '1px solid #0f172a',
          cursor: 'pointer'
        }
      }
    ]
  }
};
