import { SectionNode } from '../../../../../../OSDL/OSDL.types';

export interface PreBuiltSection {
  id: string;
  name: string;
  description: string;
  previewImage: string;
  section: Omit<SectionNode, 'id' | 'name' | 'order'>;
}

export const navbar: Omit<SectionNode, 'id' | 'name' | 'order'> = {
  type: 'section',
  params: {},
  layout: {
    mode: 'flex',
    direction: 'row',
    gap: '0',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 1rem',
    margin: '0',
    width: '100%',
    height: 'auto'
  },
  inlineStyles: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
  },
  children: [
    // Logo section
    {
      id: 'logo',
      type: 'atom',
      atomType: 'Image',
      order: 0,
      params: {
        src: 'https://ov2nyfoqxq.ufs.sh/f/4d9MMfWtrnN3SeA5NwIsFpdtxqfuzjbZowAneCirmYV548Ul',
        alt: 'Okiynai Logo',
        width: '120px',
        height: '40px',
        objectFit: 'contain'
      }
    },
    // Navigation links section
    {
      id: 'nav-links',
      type: 'section',
      order: 1,
      params: {},
      layout: {
        mode: 'flex',
        direction: 'row',
        gap: '2rem',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0',
        margin: '0 0 0 2rem',
        width: 'auto',
        height: 'auto'
      },
      children: [
        {
          id: 'nav-home',
          type: 'atom',
          atomType: 'Link',
          order: 0,
          params: {
            href: '/',
            content: 'Home',
            textDecoration: 'none',
            color: '#1E5D5B',
            fontWeight: '500'
          }
        },
        {
          id: 'nav-shop',
          type: 'atom',
          atomType: 'Link',
          order: 1,
          params: {
            href: '/shop',
            content: 'Shop',
            textDecoration: 'none',
            color: '#1E5D5B',
            fontWeight: '500'
          }
        },
        {
          id: 'nav-about',
          type: 'atom',
          atomType: 'Link',
          order: 2,
          params: {
            href: '/about',
            content: 'About',
            textDecoration: 'none',
            color: '#1E5D5B',
            fontWeight: '500'
          }
        },
        {
          id: 'nav-contact',
          type: 'atom',
          atomType: 'Link',
          order: 3,
          params: {
            href: '/contact',
            content: 'Contact',
            textDecoration: 'none',
            color: '#1E5D5B',
            fontWeight: '500'
          }
        }
      ]
    },
    // Action buttons section
    {
      id: 'action-buttons',
      type: 'section',
      order: 2,
      params: {},
      layout: {
        mode: 'flex',
        direction: 'row',
        gap: '0.25rem',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '0',
        margin: '0',
        width: 'auto',
        height: 'auto'
      },
              children: [
          {
            id: 'cart-button',
            type: 'atom',
            atomType: 'Button',
            order: 0,
            params: {
              content: '',
              icon: 'ShoppingCart',
              iconSize: 18,
              iconColor: '#1E5D5B',
              background: 'transparent',
              border: 'none',
              padding: '0.75rem',
              cursor: 'pointer',
              borderRadius: '8px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }
          },
          {
            id: 'profile-button',
            type: 'atom',
            atomType: 'Button',
            order: 1,
            params: {
              content: '',
              icon: 'User',
              iconSize: 18,
              iconColor: '#1E5D5B',
              background: 'transparent',
              border: 'none',
              padding: '0.75rem',
              cursor: 'pointer',
              borderRadius: '8px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }
          }
        ]
    }
  ]
};

export const heroSection: Omit<SectionNode, 'id' | 'name' | 'order'> = {
  type: 'section',
  params: {
    marginLeft: '16px',
    marginRight: '16px'
  },
      layout: {
      mode: 'flex',
      direction: 'column',
      gap: '0',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem',
      margin: '2rem auto',
      width: 'auto',
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
    // Background Image
    {
      id: 'hero-background',
      type: 'atom',
      atomType: 'Image',
      order: 0,
      params: {
        src: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop&crop=center',
        alt: 'Hero Background',
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }
    },
    // Overlay Container
    {
      id: 'hero-overlay',
      type: 'section',
      order: 1,
      params: {},
      layout: {
        mode: 'flex',
        direction: 'column',
        gap: '0',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '2rem',
        margin: '0',
        width: '100%',
        height: '100%'
      },
      inlineStyles: {
        position: 'absolute',
        top: '0',
        left: '0',
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.7) 100%)',
        borderRadius: '24px',
        zIndex: 10,
        pointerEvents: 'auto'
      },
              children: [
          // Left navigation button
          {
            id: 'hero-nav-left',
            type: 'atom',
            atomType: 'Button',
            order: 0,
                          params: {
                content: '',
                icon: 'ChevronLeft',
                iconSize: 24,
                iconColor: 'white',
                background: 'rgba(0, 0, 0, 0.8)',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)',
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 20
              }
          },
          // Right navigation button
          {
            id: 'hero-nav-right',
            type: 'atom',
            atomType: 'Button',
            order: 1,
                          params: {
                content: '',
                icon: 'ChevronRight',
                iconSize: 24,
                iconColor: 'white',
                background: 'rgba(0, 0, 0, 0.8)',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)',
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 20
              }
          },
        // Middle content section
        {
          id: 'hero-content',
          type: 'section',
          order: 1,
          params: {
            textAlign: 'center',
            marginTop: 'auto',
            marginBottom: 'auto'
          },
          layout: {
            mode: 'flex',
            direction: 'column',
            gap: '2rem',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0',
            margin: '0',
            width: '100%',
            height: 'auto'
          },
          inlineStyles: {
            pointerEvents: 'auto'
          },
          children: [
            {
              id: 'hero-title',
              type: 'atom',
              atomType: 'Text',
              order: 0,
              params: {
                content: 'Welcome to Okiynai',
                tag: 'h1',
                color: 'white',
                fontSize: '3.5rem',
                fontWeight: '700',
                textAlign: 'center',
                margin: '0',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                display: 'block',
                width: '100%'
              }
            },
            {
              id: 'hero-subtitle',
              type: 'atom',
              atomType: 'Text',
              order: 1,
              params: {
                content: 'Discover unique artisanal products from independent creators',
                tag: 'p',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '1.25rem',
                textAlign: 'center',
                margin: '0',
                maxWidth: '600px',
                lineHeight: '1.6',
                display: 'block',
                width: '100%'
              }
            },
            {
              id: 'hero-cta',
              type: 'atom',
              atomType: 'Button',
              order: 2,
              params: {
                content: 'Start Shopping',
                background: '#D0F0E8',
                color: '#1E5D5B',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.3s ease'
              }
            }
          ]
        },
        // Bottom section with bullet indicators
        {
          id: 'hero-bottom',
          type: 'section',
          order: 2,
          params: {},
          layout: {
            mode: 'flex',
            direction: 'row',
            gap: '0.5rem',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0',
            margin: '0',
            width: 'auto',
            height: 'auto'
          },
          inlineStyles: {
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20
          },
          children: [
            {
              id: 'bullet-1',
              type: 'atom',
              atomType: 'Button',
              order: 0,
              params: {
                content: '',
                icon: 'Circle',
                iconSize: 12,
                iconColor: 'rgba(255, 255, 255, 0.8)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0'
              }
            },
            {
              id: 'bullet-2',
              type: 'atom',
              atomType: 'Button',
              order: 1,
              params: {
                content: '',
                icon: 'Circle',
                iconSize: 12,
                iconColor: 'rgba(255, 255, 255, 0.3)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0'
              }
            },
            {
              id: 'bullet-3',
              type: 'atom',
              atomType: 'Button',
              order: 2,
              params: {
                content: '',
                icon: 'Circle',
                iconSize: 12,
                iconColor: 'rgba(255, 255, 255, 0.3)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0'
              }
            }
          ]
        }
      ]
    }
  ]
};

// Pre-built sections with metadata
export const preBuiltSections: PreBuiltSection[] = [
  {
    id: 'navbar',
    name: 'Navigation Bar',
    description: 'A clean navigation bar with logo, menu links, and action buttons',
    previewImage: '/pre-built-sections/default_navbar.png',
    section: navbar
  },
  {
    id: 'heroSection',
    name: 'Hero Section',
    description: 'A stunning hero section with background image, overlay content, and call-to-action',
    previewImage: '/pre-built-sections/default_hero.png',
    section: heroSection
  }
]; 