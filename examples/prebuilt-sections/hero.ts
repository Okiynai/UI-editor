import { SectionNode } from '@/OSDL.types';

export interface PreBuiltSection {
  metadata: {
    id: string;
    sectionType: string;
    previewImage: string;
    originTheme: string;
  };
  schema: Omit<SectionNode, 'id' | 'name' | 'order'>;
}

export const heroSection: PreBuiltSection = {
  metadata: {
    id: 'heroSection',
    sectionType: 'hero',
    previewImage: '/previews/hero-centered.jpg',
    originTheme: 'artisan-minimal'
  },
  schema: {
    type: 'section',
    params: {},
    layout: {
      mode: 'flex',
      direction: 'column',
      gap: '0',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem',
      margin: '2rem auto',
      width: 'auto',
      height: 'auto',
      minHeight: '300px',
      maxHeight: '600px'
    },
    inlineStyles: {
      position: 'relative',
      borderRadius: '24px',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
      aspectRatio: '16/9'
    },
    children: [
      {
        id: 'hero-background',
        type: 'atom',
        atomType: 'Image',
        order: 0,
        params: {
          src: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
          alt: 'Hero Background',
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }
      },
      {
        id: 'hero-overlay',
        type: 'section',
        order: 1,
        params: {},
        layout: {
          mode: 'flex',
          direction: 'column',
          gap: '0',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0',
          margin: '0',
          width: '100%',
          height: '100%'
        },
        positioning: {
          position: 'absolute',
          top: '0',
          left: '0'
        },
        inlineStyles: {
          background: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4))'
        },
        children: [
          {
            id: 'hero-content',
            type: 'section',
            order: 0,
            params: {},
            layout: {
              mode: 'flex',
              direction: 'column',
              gap: '2rem',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '0',
              margin: '0',
              width: 'auto',
              height: 'auto'
            },
            children: [
              {
                id: 'hero-title',
                type: 'atom',
                atomType: 'Text',
                order: 0,
                params: {
                  content: 'Welcome to Your Store',
                  tag: 'h1',
                  color: 'white',
                  fontSize: '3.5rem',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }
              },
              {
                id: 'hero-subtitle',
                type: 'atom',
                atomType: 'Text',
                order: 1,
                params: {
                  content: 'Discover amazing products crafted with care',
                  tag: 'p',
                  color: 'white',
                  fontSize: '1.25rem',
                  textAlign: 'center'
                }
              },
              {
                id: 'hero-cta',
                type: 'atom',
                atomType: 'Button',
                order: 2,
                params: {
                  content: 'Shop Now',
                  background: '#D0F0E8',
                  color: '#1E5D5B',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer'
                }
              }
            ]
          }
        ]
      }
    ]
  }
};
