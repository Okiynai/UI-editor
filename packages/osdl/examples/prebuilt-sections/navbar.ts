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

export const navbar: PreBuiltSection = {
  metadata: {
    id: 'navbar',
    sectionType: 'navbar',
    previewImage: '/previews/navbar-simple.jpg',
    originTheme: 'artisan-minimal'
  },
  schema: {
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
          margin: '0',
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
              color: '#1E5D5B',
              fontWeight: '500',
              textDecoration: 'none'
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
              color: '#1E5D5B',
              fontWeight: '500',
              textDecoration: 'none'
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
              color: '#1E5D5B',
              fontWeight: '500',
              textDecoration: 'none'
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
              color: '#1E5D5B',
              fontWeight: '500',
              textDecoration: 'none'
            }
          }
        ]
      },
      {
        id: 'navbar-actions',
        type: 'section',
        order: 2,
        params: {},
        layout: {
          mode: 'flex',
          direction: 'row',
          gap: '0.5rem',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '0',
          margin: '0',
          width: 'auto',
          height: 'auto'
        },
        children: [
          {
            id: 'cart-icon',
            type: 'atom',
            atomType: 'Button',
            order: 0,
            params: {
              content: '🛒',
              background: 'transparent',
              color: '#1E5D5B',
              borderRadius: '8px',
              width: '40px',
              height: '40px',
              border: 'none',
              cursor: 'pointer'
            }
          },
          {
            id: 'profile-icon',
            type: 'atom',
            atomType: 'Button',
            order: 1,
            params: {
              content: '👤',
              background: 'transparent',
              color: '#1E5D5B',
              borderRadius: '8px',
              width: '40px',
              height: '40px',
              border: 'none',
              cursor: 'pointer'
            }
          }
        ]
      }
    ]
  }
};
