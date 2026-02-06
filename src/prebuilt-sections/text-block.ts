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

export const textBlockSection: PreBuiltSection = {
  metadata: {
    id: 'text-block',
    sectionType: 'text',
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
        id: 'text-block-eyebrow',
        type: 'atom',
        atomType: 'Text',
        order: 0,
        params: {
          content: 'Section Label',
          tag: 'p',
          fontSize: '0.875rem',
          fontWeight: '600',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#64748b'
        }
      },
      {
        id: 'text-block-title',
        type: 'atom',
        atomType: 'Text',
        order: 1,
        params: {
          content: 'A clear, focused headline',
          tag: 'h2',
          fontSize: '2rem',
          fontWeight: '700',
          lineHeight: '1.2',
          color: '#0f172a'
        }
      },
      {
        id: 'text-block-body',
        type: 'atom',
        atomType: 'Text',
        order: 2,
        params: {
          content: 'Use this block for concise messaging. Keep it short and punchy for maximum clarity.',
          tag: 'p',
          fontSize: '1rem',
          lineHeight: '1.6',
          color: '#334155'
        }
      },
      {
        id: 'text-block-cta',
        type: 'atom',
        atomType: 'Button',
        order: 3,
        params: {
          content: 'Primary Action',
          background: '#0f172a',
          color: '#ffffff',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          fontSize: '0.95rem',
          fontWeight: '600',
          border: 'none',
          cursor: 'pointer'
        }
      }
    ]
  }
};
