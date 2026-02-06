import { AtomNode, PageDefinition, SectionNode } from '@/OSDL/OSDL.types';

export const getDemoPageDefinition = (_routeParams: Record<string, string>): PageDefinition => {
  const navSection: SectionNode = {
    id: 'nav-section',
    type: 'section',
    name: 'Top Nav',
    order: 0,
    params: {
      backgroundColor: 'var(--backgroundLight)',
      borderBottom: '1px solid #e5e7eb'
    },
    layout: {
      mode: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      width: '100%'
    },
    children: [
      {
        id: 'nav-logo',
        type: 'atom',
        atomType: 'Text',
        order: 0,
        name: 'Logo',
        params: {
          content: 'Acme Studio',
          tag: 'h3',
          fontSize: '24px',
          fontWeight: '700',
          color: 'var(--textDark)'
        }
      } as AtomNode,
      {
        id: 'nav-links-wrap',
        type: 'section',
        order: 1,
        name: 'Nav Links',
        params: {},
        layout: {
          mode: 'flex',
          alignItems: 'center',
          gap: '12px'
        },
        children: [
          {
            id: 'nav-link-home',
            type: 'atom',
            atomType: 'Button',
            order: 0,
            params: {
              tag: 'a',
              href: '#',
              content: 'Home',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--textDark)',
              padding: '8px 10px'
            }
          } as AtomNode,
          {
            id: 'nav-link-about',
            type: 'atom',
            atomType: 'Button',
            order: 1,
            params: {
              tag: 'a',
              href: '#',
              content: 'About',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--textDark)',
              padding: '8px 10px'
            }
          } as AtomNode,
          {
            id: 'nav-link-contact',
            type: 'atom',
            atomType: 'Button',
            order: 2,
            params: {
              tag: 'a',
              href: '#',
              content: 'Contact',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--textDark)',
              padding: '8px 10px'
            }
          } as AtomNode,
          {
            id: 'nav-cta',
            type: 'atom',
            atomType: 'Button',
            order: 3,
            params: {
              content: 'Start Now',
              tag: 'button',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 14px',
              fontWeight: '600'
            }
          } as AtomNode
        ]
      } as SectionNode
    ]
  };

  const heroSection: SectionNode = {
    id: 'hero-section',
    type: 'section',
    name: 'Hero',
    order: 1,
    params: {
      backgroundColor: 'var(--backgroundLight)'
    },
    layout: {
      mode: 'flex',
      direction: 'column',
      alignItems: 'center',
      gap: '14px',
      padding: '56px 24px 48px 24px'
    },
    children: [
      {
        id: 'hero-kicker',
        type: 'atom',
        atomType: 'Text',
        order: 0,
        params: {
          content: 'Simple demo for editor workflows',
          tag: 'p',
          color: 'var(--textMedium)',
          fontSize: '14px'
        }
      } as AtomNode,
      {
        id: 'hero-title',
        type: 'atom',
        atomType: 'Text',
        order: 1,
        params: {
          content: 'Build and edit a landing page in minutes',
          tag: 'h1',
          fontSize: '48px',
          lineHeight: '1.1',
          maxWidth: '850px',
          textAlign: 'center',
          color: 'var(--textDark)',
          fontWeight: '700'
        },
        responsiveOverrides: {
          mobile: {
            params: {
              fontSize: '34px'
            }
          }
        }
      } as AtomNode,
      {
        id: 'hero-subtitle',
        type: 'atom',
        atomType: 'Text',
        order: 2,
        params: {
          content: 'This page is intentionally minimal so you can focus on layout, styles, text, and section editing.',
          tag: 'p',
          fontSize: '18px',
          maxWidth: '760px',
          textAlign: 'center',
          color: 'var(--textMedium)'
        }
      } as AtomNode,
      {
        id: 'hero-buttons',
        type: 'section',
        order: 3,
        name: 'Hero Buttons',
        params: {},
        layout: {
          mode: 'flex',
          gap: '12px',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap'
        },
        children: [
          {
            id: 'hero-primary-cta',
            type: 'atom',
            atomType: 'Button',
            order: 0,
            params: {
              content: 'Try Editor',
              tag: 'button',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 16px',
              fontWeight: '600'
            }
          } as AtomNode,
          {
            id: 'hero-secondary-cta',
            type: 'atom',
            atomType: 'Button',
            order: 1,
            params: {
              content: 'View Docs',
              tag: 'button',
              backgroundColor: 'transparent',
              color: 'var(--textDark)',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              padding: '12px 16px',
              fontWeight: '600'
            }
          } as AtomNode
        ]
      } as SectionNode,
      {
        id: 'hero-image',
        type: 'atom',
        atomType: 'Image',
        order: 4,
        params: {
          src: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1400&auto=format&fit=crop',
          alt: 'Demo hero visual',
          width: '100%',
          maxWidth: '1024px',
          height: '420px',
          objectFit: 'cover',
          borderRadius: '14px',
          margin: '8px 0 0 0'
        }
      } as AtomNode
    ]
  };

  const featuresSection: SectionNode = {
    id: 'features-section',
    type: 'section',
    name: 'Feature Cards',
    order: 2,
    params: {
      backgroundColor: 'var(--backgroundSubtle)'
    },
    layout: {
      mode: 'flow',
      padding: '48px 24px'
    },
    children: [
      {
        id: 'features-title',
        type: 'atom',
        atomType: 'Text',
        order: 0,
        params: {
          content: 'What you can edit quickly',
          tag: 'h2',
          fontSize: '34px',
          textAlign: 'center',
          color: 'var(--textDark)',
          margin: '0 0 10px 0'
        }
      } as AtomNode,
      {
        id: 'features-subtitle',
        type: 'atom',
        atomType: 'Text',
        order: 1,
        params: {
          content: 'Cards are great for testing duplicate, reorder, and spacing controls.',
          tag: 'p',
          textAlign: 'center',
          color: 'var(--textMedium)',
          margin: '0 0 24px 0'
        }
      } as AtomNode,
      {
        id: 'features-grid',
        type: 'section',
        order: 2,
        name: 'Features Grid',
        params: {},
        layout: {
          mode: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          maxWidth: '1100px',
          margin: '0 auto'
        },
        children: [
          {
            id: 'feature-card-1',
            type: 'section',
            order: 0,
            name: 'Feature Card 1',
            params: {
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '18px'
            },
            layout: {
              mode: 'flow',
              gap: '10px'
            },
            children: [
              {
                id: 'feature-1-title',
                type: 'atom',
                atomType: 'Text',
                order: 0,
                params: { content: 'Visual Editing', tag: 'h3', fontSize: '22px', color: 'var(--textDark)' }
              } as AtomNode,
              {
                id: 'feature-1-copy',
                type: 'atom',
                atomType: 'Text',
                order: 1,
                params: { content: 'Adjust spacing, alignment, and styling directly from the editor panel.', tag: 'p', color: 'var(--textMedium)' }
              } as AtomNode
            ]
          } as SectionNode,
          {
            id: 'feature-card-2',
            type: 'section',
            order: 1,
            name: 'Feature Card 2',
            params: {
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '18px'
            },
            layout: {
              mode: 'flow',
              gap: '10px'
            },
            children: [
              {
                id: 'feature-2-title',
                type: 'atom',
                atomType: 'Text',
                order: 0,
                params: { content: 'Section Control', tag: 'h3', fontSize: '22px', color: 'var(--textDark)' }
              } as AtomNode,
              {
                id: 'feature-2-copy',
                type: 'atom',
                atomType: 'Text',
                order: 1,
                params: { content: 'Duplicate, move, or delete blocks to test your editor flow quickly.', tag: 'p', color: 'var(--textMedium)' }
              } as AtomNode
            ]
          } as SectionNode,
          {
            id: 'feature-card-3',
            type: 'section',
            order: 2,
            name: 'Feature Card 3',
            params: {
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '18px'
            },
            layout: {
              mode: 'flow',
              gap: '10px'
            },
            children: [
              {
                id: 'feature-3-title',
                type: 'atom',
                atomType: 'Text',
                order: 0,
                params: { content: 'Responsive View', tag: 'h3', fontSize: '22px', color: 'var(--textDark)' }
              } as AtomNode,
              {
                id: 'feature-3-copy',
                type: 'atom',
                atomType: 'Text',
                order: 1,
                params: { content: 'Switch between desktop, tablet, and mobile to tune layouts fast.', tag: 'p', color: 'var(--textMedium)' }
              } as AtomNode
            ]
          } as SectionNode
        ]
      } as SectionNode
    ]
  };

  const promoSection: SectionNode = {
    id: 'promo-section',
    type: 'section',
    name: 'Promo Banner',
    order: 3,
    params: {
      backgroundColor: 'var(--primary)',
      color: 'white',
      borderRadius: '12px'
    },
    layout: {
      mode: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap',
      maxWidth: '1100px',
      margin: '32px auto',
      padding: '24px'
    },
    children: [
      {
        id: 'promo-text',
        type: 'atom',
        atomType: 'Text',
        order: 0,
        params: {
          content: 'Launch your next page faster with this editor-first starter.',
          tag: 'h3',
          color: 'white',
          fontSize: '26px',
          maxWidth: '720px'
        }
      } as AtomNode,
      {
        id: 'promo-button',
        type: 'atom',
        atomType: 'Button',
        order: 1,
        params: {
          content: 'Get Started',
          tag: 'button',
          backgroundColor: 'white',
          color: 'var(--primary)',
          border: 'none',
          borderRadius: '10px',
          padding: '12px 16px',
          fontWeight: '700'
        }
      } as AtomNode
    ]
  };

  const productSection: SectionNode = {
    id: 'products-section',
    type: 'section',
    name: 'Simple Product Grid',
    order: 4,
    params: {
      backgroundColor: 'var(--backgroundLight)'
    },
    layout: {
      mode: 'flow',
      padding: '20px 24px 48px 24px'
    },
    children: [
      {
        id: 'products-title',
        type: 'atom',
        atomType: 'Text',
        order: 0,
        params: {
          content: 'Featured Items',
          tag: 'h2',
          fontSize: '32px',
          textAlign: 'center',
          color: 'var(--textDark)',
          margin: '0 0 20px 0'
        }
      } as AtomNode,
      {
        id: 'products-grid',
        type: 'section',
        order: 1,
        name: 'Products Grid',
        params: {},
        layout: {
          mode: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          maxWidth: '1100px',
          margin: '0 auto'
        },
        children: [
          {
            id: 'product-card-1',
            type: 'section',
            order: 0,
            name: 'Product 1',
            params: {
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              overflow: 'hidden'
            },
            layout: { mode: 'flow' },
            children: [
              {
                id: 'product-1-image',
                type: 'atom',
                atomType: 'Image',
                order: 0,
                params: {
                  src: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&auto=format&fit=crop',
                  alt: 'Product 1',
                  width: '100%',
                  height: '180px',
                  objectFit: 'cover'
                }
              } as AtomNode,
              {
                id: 'product-1-content',
                type: 'section',
                order: 1,
                params: { padding: '14px' },
                layout: { mode: 'flow', gap: '8px' },
                children: [
                  { id: 'product-1-name', type: 'atom', atomType: 'Text', order: 0, params: { content: 'Classic Tee', tag: 'h4', fontSize: '18px', color: 'var(--textDark)' } } as AtomNode,
                  { id: 'product-1-price', type: 'atom', atomType: 'Text', order: 1, params: { content: '$24', tag: 'p', color: 'var(--textMedium)' } } as AtomNode
                ]
              } as SectionNode
            ]
          } as SectionNode,
          {
            id: 'product-card-2',
            type: 'section',
            order: 1,
            name: 'Product 2',
            params: {
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              overflow: 'hidden'
            },
            layout: { mode: 'flow' },
            children: [
              {
                id: 'product-2-image',
                type: 'atom',
                atomType: 'Image',
                order: 0,
                params: {
                  src: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=700&auto=format&fit=crop',
                  alt: 'Product 2',
                  width: '100%',
                  height: '180px',
                  objectFit: 'cover'
                }
              } as AtomNode,
              {
                id: 'product-2-content',
                type: 'section',
                order: 1,
                params: { padding: '14px' },
                layout: { mode: 'flow', gap: '8px' },
                children: [
                  { id: 'product-2-name', type: 'atom', atomType: 'Text', order: 0, params: { content: 'Canvas Shoes', tag: 'h4', fontSize: '18px', color: 'var(--textDark)' } } as AtomNode,
                  { id: 'product-2-price', type: 'atom', atomType: 'Text', order: 1, params: { content: '$49', tag: 'p', color: 'var(--textMedium)' } } as AtomNode
                ]
              } as SectionNode
            ]
          } as SectionNode,
          {
            id: 'product-card-3',
            type: 'section',
            order: 2,
            name: 'Product 3',
            params: {
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              overflow: 'hidden'
            },
            layout: { mode: 'flow' },
            children: [
              {
                id: 'product-3-image',
                type: 'atom',
                atomType: 'Image',
                order: 0,
                params: {
                  src: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=700&auto=format&fit=crop',
                  alt: 'Product 3',
                  width: '100%',
                  height: '180px',
                  objectFit: 'cover'
                }
              } as AtomNode,
              {
                id: 'product-3-content',
                type: 'section',
                order: 1,
                params: { padding: '14px' },
                layout: { mode: 'flow', gap: '8px' },
                children: [
                  { id: 'product-3-name', type: 'atom', atomType: 'Text', order: 0, params: { content: 'Summer Hat', tag: 'h4', fontSize: '18px', color: 'var(--textDark)' } } as AtomNode,
                  { id: 'product-3-price', type: 'atom', atomType: 'Text', order: 1, params: { content: '$19', tag: 'p', color: 'var(--textMedium)' } } as AtomNode
                ]
              } as SectionNode
            ]
          } as SectionNode,
          {
            id: 'product-card-4',
            type: 'section',
            order: 3,
            name: 'Product 4',
            params: {
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              overflow: 'hidden'
            },
            layout: { mode: 'flow' },
            children: [
              {
                id: 'product-4-image',
                type: 'atom',
                atomType: 'Image',
                order: 0,
                params: {
                  src: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop',
                  alt: 'Product 4',
                  width: '100%',
                  height: '180px',
                  objectFit: 'cover'
                }
              } as AtomNode,
              {
                id: 'product-4-content',
                type: 'section',
                order: 1,
                params: { padding: '14px' },
                layout: { mode: 'flow', gap: '8px' },
                children: [
                  { id: 'product-4-name', type: 'atom', atomType: 'Text', order: 0, params: { content: 'Sport Sneaker', tag: 'h4', fontSize: '18px', color: 'var(--textDark)' } } as AtomNode,
                  { id: 'product-4-price', type: 'atom', atomType: 'Text', order: 1, params: { content: '$74', tag: 'p', color: 'var(--textMedium)' } } as AtomNode
                ]
              } as SectionNode
            ]
          } as SectionNode
        ]
      } as SectionNode
    ]
  };

  const footerSection: SectionNode = {
    id: 'footer-section',
    type: 'section',
    name: 'Footer',
    order: 5,
    params: {
      backgroundColor: 'var(--backgroundDark)'
    },
    layout: {
      mode: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '14px',
      padding: '24px'
    },
    children: [
      {
        id: 'footer-brand',
        type: 'atom',
        atomType: 'Text',
        order: 0,
        params: {
          content: 'Acme Studio',
          tag: 'p',
          color: 'white',
          fontWeight: '600'
        }
      } as AtomNode,
      {
        id: 'footer-links',
        type: 'atom',
        atomType: 'Text',
        order: 1,
        params: {
          content: 'Privacy | Terms | Support',
          tag: 'p',
          color: 'rgba(255,255,255,0.85)'
        }
      } as AtomNode,
      {
        id: 'footer-copy',
        type: 'atom',
        atomType: 'Text',
        order: 2,
        params: {
          content: '(c) 2026 Acme Studio',
          tag: 'p',
          color: 'rgba(255,255,255,0.75)'
        }
      } as AtomNode
    ]
  };

  return {
    id: 'default-demo-home',
    schemaVersion: 'osdl_v3.1',
    name: 'Editor Demo - Simple Storefront',
    route: '/',
    pageType: 'static',
    nodes: [navSection, heroSection, featuresSection, promoSection, productSection, footerSection]
  };
};
