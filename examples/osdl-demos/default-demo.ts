import { PageDefinition, AtomNode, SectionNode, Node, DataSourceConfig, ComponentNode, DataRequirementConfig } from "@/OSDL.types";

export const getDemoPageDefinition = (routeParams: Record<string, string>): PageDefinition => {
  // Example dataSource for a dynamic product page
  const productPageDataSource: DataSourceConfig = {
    type: 'rql',
    sourceParams: {
      queries: {
        productDetail: {
          contract: 'product.get',
          params: {
            productId: routeParams.subdomain === 'test-product' ? 'prod_123_test' : (routeParams.productId || 'prod_default_001')
          },
          select: {
            name: true,
            description: true,
            price: true,
            imageUrl: true
          }
        }
      }
    }
  };

  const headerSection: SectionNode = {
    id: 'header-section',
    type: 'section',
    name: 'Page Header',
    order: 0,
    params: { 
      backgroundColor: 'var(--backgroundDark)', 
      color: 'var(--textLight)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
    },
    layout: {
      mode: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 'var(--spacing-medium) var(--spacing-xl)',
      height: '80px',
    },
    positioning: {
      position: 'sticky',
      top: '0',
      left: '0',
      right: '0',
      zIndex: 1000
    },
    children: [
      {
        id: 'logo-text',
        type: 'atom',
        atomType: 'Text',
        order: 0,
        name: 'Logo',
        params: {
          content: 'OkiynaiShops - {{ page.name }}', 
          tag: 'h3',
          fontSize: '30px',
          fontWeight: 'bold',
          fontFamily: 'var(--font-heading)',
          color: 'var(--primary)'
        }
      } as AtomNode,
      {
        id: 'nav-links-section',
        type: 'section',
        order: 1,
        name: 'Navigation Links Container',
        params: {},
        layout: {
          mode: 'flex',
          gap: 'var(--spacing-large)', 
          alignItems: 'center'
        },
        children: [
          { id: 'link-home', type: 'atom', atomType: 'Button', order: 0, params: { content: 'Home', tag: 'a', href: '#home', fontSize: '18px', color: 'var(--textLight)', padding: 'var(--spacing-small)', backgroundColor: 'transparent', border: 'none' } } as AtomNode,
          { id: 'link-products', type: 'atom', atomType: 'Button', order: 1, params: { content: 'Products', tag: 'a', href: '#products', fontSize: '18px', color: 'var(--textLight)', padding: 'var(--spacing-small)', backgroundColor: 'transparent', border: 'none' } } as AtomNode,
          { id: 'link-about', type: 'atom', atomType: 'Button', order: 2, params: { content: 'About Us', tag: 'a', href: '#about', fontSize: '18px', color: 'var(--textLight)', padding: 'var(--spacing-small)', backgroundColor: 'transparent', border: 'none' } } as AtomNode,
          { id: 'cta-button-header', type: 'atom', atomType: 'Button', order: 3, name: 'Header CTA Button', params: { content: 'Contact', tag: 'button', backgroundColor: 'var(--primary)', color: 'var(--textLight)', padding: 'var(--spacing-small) var(--spacing-medium)', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', border: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' } } as AtomNode
        ]
      } as SectionNode
    ]
  };
  
  const heroImage: AtomNode = {
    id: 'hero-image',
    type: 'atom',
    atomType: 'Image',
    order: 0,
    name: 'Hero Image Placeholder',
    params: {
      alt: 'Modern teal and white abstract background',
      src: "{{ data.product.imageUrl }}",
      width: '100%',
      height: '450px',
      objectFit: 'cover',
      backgroundColor: 'var(--backgroundSubtle)',
      placeholderText: 'Hero Image (e.g., Abstract Teal Design)',
      borderRadius: '12px',
      margin: '0 0 var(--spacing-large) 0',
      color: 'var(--textMedium)'
    },
    loadingBehavior: {
        placeholderType: 'skeleton',
        skeletonConfig: { shape: 'rect' }
    }
  };

  const heroTitle: AtomNode = {
    id: 'hero-title',
    type: 'atom',
    atomType: 'Text',
    order: 1,
    name: 'Hero Title',
    params: {
      content: "{{ data.product.name }}",
      tag: 'h1',
      fontSize: '60px',
      textAlign: 'center',
      color: 'var(--primary)',
      fontFamily: 'var(--font-heading)',
      fontWeight: 'bold',
      margin: '0 0 var(--spacing-medium) 0' 
    },
    responsiveOverrides: {
      mobile: {
        params: {
          content: "{{ data.product.name }}",
          fontSize: '36px'
        }
      }
    },
    localeOverrides: {
      'es-ES': {
        params: {
          content: "¡Producto {{ data.product.name }}!"
        }
      }
    },
    loadingBehavior: { 
        placeholderType: 'skeleton',
        skeletonConfig: {
            shape: 'text',
            lines: 1,
            color: 'var(--backgroundMedium)'
        }
    }
  };

  const heroSubtitle: AtomNode = {
    id: 'hero-subtitle',
    type: 'atom',
    atomType: 'Text',
    order: 2,
    name: 'Hero Subtitle',
    params: {
      content: "{{ data.product.description }}",
      tag: 'p',
      fontSize: '22px',
      textAlign: 'center',
      color: 'var(--textMedium)',
      fontFamily: 'var(--font-body)',
      maxWidth: '800px',
      margin: '0 auto var(--spacing-xl) auto'
    },
    loadingBehavior: { 
        placeholderType: 'skeleton',
        skeletonConfig: {
            shape: 'text',
            lines: 3
        }
    }
  };
  
  const flexWrapTestSection: SectionNode = {
    id: 'flex-wrap-test-section',
    type: 'section',
    name: 'Flex Wrap Test',
    order: 1, 
    params: {
      backgroundColor: 'var(--backgroundSubtle)',
      padding: 'var(--spacing-large)',
      margin: 'var(--spacing-large) 0',
      borderRadius: '8px',
    },
    layout: {
      mode: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--spacing-medium)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 'var(--spacing-medium)'
    },
    children: [
      { id: 'flex-wrap-title', type: 'atom', atomType: 'Text', order: 0, params: { content: 'Flex Wrap Showcase', tag: 'h2', fontSize: '32px', color: 'var(--primaryDarker)', fontFamily: 'var(--font-heading)', textAlign: 'center', width: '100%', margin: '0 0 var(--spacing-medium) 0', } } as AtomNode,
      ...(Array.from({ length: 6 }, (_, i) => ({ id: `flex-item-${i + 1}`, type: 'atom' as 'atom', atomType: 'Button', order: i + 1, name: `Flex Item ${i + 1}`, params: { content: `Item ${i + 1}`, backgroundColor: 'var(--primary)', color: 'var(--textLight)', padding: 'var(--spacing-medium) var(--spacing-large)', borderRadius: '6px', fontSize: '16px', minWidth: '150px', textAlign: 'center', border: 'none' } })) as AtomNode[]),
      { id: 'flex-wrap-description', type: 'atom', atomType: 'Text', order: 7, params: { content: 'These items are in a flex container with "flex-wrap: wrap". Reduce screen width to see them wrap.', tag: 'p', fontSize: '16px', color: 'var(--textMedium)', textAlign: 'center', width: '100%', margin: 'var(--spacing-medium) 0 0 0', } } as AtomNode
    ]
  };

  const columnAndGridTestSection: SectionNode = {
    id: 'column-grid-test-section',
    type: 'section',
    name: 'Column Flow & Grid Test',
    order: 2, 
    params: {
      backgroundColor: 'var(--backgroundLight)',
      padding: 'var(--spacing-large)',
      margin: 'var(--spacing-large) 0',
    },
    layout: {
      mode: 'flow',
    },
    children: [
      { id: 'column-grid-title', type: 'atom', atomType: 'Text', order: 0, params: { content: 'Column Layout & Responsive Grid', tag: 'h2', fontSize: '32px', color: 'var(--primaryDarker)', fontFamily: 'var(--font-heading)', textAlign: 'center', margin: '0 0 var(--spacing-large) 0', } } as AtomNode,
      {
        id: 'flex-column-sub-section',
        type: 'section',
        order: 1,
        name: 'Flex Column Demo',
        params: { backgroundColor: 'var(--backgroundSubtle)', padding: 'var(--spacing-medium)', borderRadius: '8px', margin: '0 0 var(--spacing-large) 0', },
        layout: { mode: 'flex', direction: 'column', alignItems: 'center', gap: 'var(--spacing-small)' },
        children: [
          { 
            id: 'col-item-1', 
            type: 'atom', 
            atomType: 'Text', 
            order: 0, 
            params: { content: 'Column Item 1 (Price: {{ data.product.price }})', fontSize: '18px', padding: 'var(--spacing-small)', backgroundColor: 'var(--primary)', color:'var(--textLight)', borderRadius:'4px' },
            loadingBehavior: {
                placeholderType: 'skeleton',
                skeletonConfig: { shape: 'text', lines: 1, color: 'var(--backgroundSubtle)'}
            }
          } as AtomNode, 
          { id: 'col-item-2', type: 'atom', atomType: 'Text', order: 1, params: { content: 'Column Item 2', fontSize: '18px', padding: 'var(--spacing-small)', backgroundColor: 'var(--primary)', color:'var(--textLight)', borderRadius:'4px' } } as AtomNode,
          { id: 'col-item-3', type: 'atom', atomType: 'Button', order: 2, params: { content: 'A Button in Column', tag: 'button', backgroundColor: 'var(--secondary)', color: 'var(--textLight)', padding: 'var(--spacing-small) var(--spacing-medium)', borderRadius: '6px', border:'none' } } as AtomNode,
        ]
      },
      {
        id: 'responsive-grid-sub-section',
        type: 'section',
        order: 2,
        name: 'Responsive Grid Demo',
        params: { backgroundColor: 'var(--backgroundSubtle)', padding: 'var(--spacing-medium)', borderRadius: '8px', },
        layout: { mode: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-medium)', },
        children: [
          ...(Array.from({ length: 4 }, (_, i) => ({
            id: `grid-item-${i + 1}`, type: 'section' as 'section', order: i, name: `Grid Cell ${i + 1}`,
            params: { backgroundColor: `var(--accent)`, padding: 'var(--spacing-medium)', borderRadius: '6px' },
            layout: { mode: 'flow', alignItems: 'center', justifyContent: 'center' }, 
            children: [
              { id: `grid-item-text-${i+1}`, type: 'atom', atomType: 'Text', order: 0, params: { content: `Grid Cell ${i + 1}`, fontSize: '18px', color: 'var(--textDark)', textAlign: 'center', } } as AtomNode
            ]
          })) as SectionNode[]),
        ]
      }
    ]
  };

  const flowTestSection: SectionNode = {
    id: 'flow-test-section',
    type: 'section',
    name: 'Flow Layout Test',
    order: 3, 
    params: { backgroundColor: 'var(--backgroundDark)', color: 'var(--textLight)', padding: 'var(--spacing-large)', margin: 'var(--spacing-large) 0', borderRadius: '8px', },
    layout: { mode: 'flow', maxWidth: '900px', margin: 'var(--spacing-large) auto', },
    children: [
      { id: 'flow-title', type: 'atom', atomType: 'Text', order: 0, params: { content: 'Testing "Flow" Layout', tag: 'h2', fontSize: '32px', fontFamily: 'var(--font-heading)', textAlign: 'center', margin: '0 0 var(--spacing-medium) 0', color: 'var(--primary)' } } as AtomNode,
      { id: 'flow-p1', type: 'atom', atomType: 'Text', order: 1, params: { content: 'This is a paragraph in a "flow" layout. Elements will stack vertically as expected in normal document flow. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', tag: 'p', fontSize: '18px', lineHeight: '1.6', margin: '0 0 var(--spacing-medium) 0', } } as AtomNode,
      { id: 'flow-image-placeholder', type: 'atom', atomType: 'Image', order: 2, name: 'Flow Image Placeholder', params: { alt: 'Placeholder image in flow layout', width: '100%', height: '250px', objectFit: 'cover', backgroundColor: 'var(--secondary)', placeholderText: 'Image (Flow Layout)', borderRadius: '8px', margin: '0 0 var(--spacing-medium) 0', color: 'var(--textLight)' } } as AtomNode,
      { id: 'flow-p2', type: 'atom', atomType: 'Text', order: 3, params: { content: 'Another paragraph to demonstrate stacking. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', tag: 'p', fontSize: '18px', lineHeight: '1.6', } } as AtomNode,
    ]
  };

  // NEW: Data Requirements Demo Section 1 - Related Products (Blocking)
  const relatedProductsSection: SectionNode = {
    id: 'related-products-section',
    type: 'section',
    name: 'Related Products Demo (Data Requirements)',
    order: 4,
    params: {
      backgroundColor: 'var(--backgroundLight)',
      padding: 'var(--spacing-xl)',
      margin: 'var(--spacing-large) 0',
      borderRadius: '12px',
      border: '2px solid var(--accent)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    layout: {
      mode: 'flow',
      maxWidth: '1000px',
      margin: '0 auto'
    },
    children: [
      {
        id: 'related-products-title',
        type: 'atom',
        atomType: 'Text',
        order: 0,
        params: {
          content: '🛍️ Related Products (Blocking Data Requirements)',
          tag: 'h2',
          fontSize: '28px',
          fontFamily: 'var(--font-heading)',
          color: 'var(--primary)',
          textAlign: 'center',
          margin: '0 0 var(--spacing-medium) 0'
        }
      },
      {
        id: 'related-products-intro',
        type: 'atom',
        atomType: 'Text',
        order: 1,
        params: {
          content: 'This section demonstrates BLOCKING data requirements. The content below will show a skeleton placeholder until the related products data is fetched.',
          tag: 'p',
          fontSize: '16px',
          color: 'var(--textMedium)',
          textAlign: 'center',
          margin: '0 0 var(--spacing-large) 0',
          fontStyle: 'italic'
        }
      },
      {
        id: 'related-products-display',
        type: 'atom',
        atomType: 'Text',
        order: 2,
        params: {
          content: 'Found {{ nodeData.relatedProducts.length }} related products in category "{{ data.product.categoryName }}":\n\n• {{ nodeData.relatedProducts[0].name }} - ${{ nodeData.relatedProducts[0].price }}\n• {{ nodeData.relatedProducts[1].name }} - ${{ nodeData.relatedProducts[1].price }}\n• {{ nodeData.relatedProducts[2].name }} - ${{ nodeData.relatedProducts[2].price }}',
          tag: 'div',
          fontSize: '18px',
          color: 'var(--textDark)',
          backgroundColor: 'var(--backgroundSubtle)',
          padding: 'var(--spacing-medium)',
          borderRadius: '8px',
          border: '1px solid var(--primary)',
          whiteSpace: 'pre-line',
          fontFamily: 'monospace'
        },
        dataRequirements: [
          {
            key: 'relatedProducts',
            source: {
              type: 'mockData',
              query: 'relatedProducts?categoryId={{ data.product.categoryId }}&excludeId={{ data.product.id }}',
              variables: { limit: 3 }
            },
            blocking: true,
            cacheDurationMs: 300000,
            defaultValue: []
          }
        ],
        loadingBehavior: {
          placeholderType: 'skeleton',
          skeletonConfig: {
            shape: 'rect',
            width: '100%',
            height: '120px',
            color: 'var(--accent)'
          }
        }
      }
    ]
  };

  // NEW: Data Requirements Demo Section 2 - User Reviews (Non-blocking)
  const userReviewsSection: SectionNode = {
    id: 'user-reviews-section',
    type: 'section',
    name: 'User Reviews Demo (Non-blocking Data Requirements)',
    order: 5,
    params: {
      backgroundColor: 'var(--backgroundSubtle)',
      padding: 'var(--spacing-xl)',
      margin: 'var(--spacing-large) 0',
      borderRadius: '12px',
      border: '2px solid var(--secondary)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    layout: {
      mode: 'flex',
      direction: 'column',
      maxWidth: '1000px',
      margin: '0 auto',
      gap: 'var(--spacing-medium)'
    },
    children: [
      {
        id: 'reviews-title',
        type: 'atom',
        atomType: 'Text',
        order: 0,
        params: {
          content: '⭐ Customer Reviews (Non-blocking Data Requirements)',
          tag: 'h2',
          fontSize: '28px',
          fontFamily: 'var(--font-heading)',
          color: 'var(--secondary)',
          textAlign: 'center'
        }
      },
      {
        id: 'reviews-intro',
        type: 'atom',
        atomType: 'Text',
        order: 1,
        params: {
          content: 'This section uses NON-BLOCKING data requirements. You\'ll see the content render immediately with default values, then update when the actual review data loads.',
          tag: 'p',
          fontSize: '16px',
          color: 'var(--textMedium)',
          textAlign: 'center',
          fontStyle: 'italic'
        }
      },
      {
        id: 'review-summary-display',
        type: 'atom',
        atomType: 'Text',
        order: 2,
        params: {
          content: '📊 Review Summary: {{ nodeData.reviewSummary.averageRating }}/5 stars ({{ nodeData.reviewSummary.totalReviews }} reviews)',
          tag: 'div',
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'var(--primary)',
          textAlign: 'center',
          backgroundColor: 'var(--backgroundLight)',
          padding: 'var(--spacing-medium)',
          borderRadius: '8px',
          border: '2px solid var(--primary)'
        },
        dataRequirements: [
          {
            key: 'reviewSummary',
            source: {
              type: 'mockData',
              query: 'reviewSummary?productId={{ data.product.id }}'
            },
            blocking: false,
            cacheDurationMs: 180000,
            defaultValue: {
              averageRating: 0,
              totalReviews: 0
            }
          }
        ],
      },
      {
        id: 'individual-reviews-display',
        type: 'atom',
        atomType: 'Text',
        order: 3,
        params: {
          content: '💬 Latest Reviews ({{ nodeData.userReviews.length }} shown):\n\n{{ nodeData.userReviews[0].author }}: "{{ nodeData.userReviews[0].comment }}" ({{ nodeData.userReviews[0].rating }}/5)\n\n{{ nodeData.userReviews[1].author }}: "{{ nodeData.userReviews[1].comment }}" ({{ nodeData.userReviews[1].rating }}/5)\n\n{{ nodeData.userReviews[2].author }}: "{{ nodeData.userReviews[2].comment }}" ({{ nodeData.userReviews[2].rating }}/5)',
          tag: 'div',
          fontSize: '16px',
          color: 'var(--textDark)',
          backgroundColor: 'var(--backgroundLight)',
          padding: 'var(--spacing-medium)',
          borderRadius: '8px',
          border: '1px solid var(--secondary)',
          whiteSpace: 'pre-line',
          lineHeight: '1.6'
        },
        dataRequirements: [
          {
            key: 'userReviews',
            source: {
              type: 'mockData',
              query: 'userReviews?productId={{ data.product.id }}'
            },
            blocking: false,
            cacheDurationMs: 180000,
            defaultValue: [
              { author: 'Loading...', comment: 'Reviews are loading...', rating: 0 },
              { author: 'Loading...', comment: 'Reviews are loading...', rating: 0 },
              { author: 'Loading...', comment: 'Reviews are loading...', rating: 0 }
            ]
          }
        ]
      }
    ]
  };

  // NEW: Multiple Data Requirements Demo Section
  const combinedDataSection: SectionNode = {
    id: 'combined-data-section',
    type: 'section',
    name: 'Multiple Data Requirements Demo',
    order: 6,
    params: {
      backgroundColor: 'var(--backgroundDark)',
      color: 'var(--textLight)',
      padding: 'var(--spacing-xl)',
      margin: 'var(--spacing-large) 0',
      borderRadius: '12px',
      border: '2px solid var(--accent)',
      boxShadow: '0 6px 16px rgba(0,0,0,0.2)'
    },
    layout: {
      mode: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: 'var(--spacing-large)',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    children: [
      {
        id: 'combined-data-title',
        type: 'atom',
        atomType: 'Text',
        order: 0,
        params: {
          content: '🔄 Complex Data Dependencies Demo',
          tag: 'h2',
          fontSize: '28px',
          fontFamily: 'var(--font-heading)',
          color: 'var(--accent)',
          textAlign: 'center',
          gridColumn: '1 / -1', // Span all columns
          margin: '0 0 var(--spacing-large) 0'
        }
      },
      {
        id: 'combined-intro',
        type: 'atom',
        atomType: 'Text',
        order: 1,
        params: {
          content: 'This section demonstrates a node with MULTIPLE data requirements, combining both blocking and non-blocking data fetching with complex dependencies.',
          tag: 'p',
          fontSize: '16px',
          color: 'var(--textLight)',
          textAlign: 'center',
          gridColumn: '1 / -1',
          fontStyle: 'italic',
          margin: '0 0 var(--spacing-large) 0'
        }
      },
      {
        id: 'complex-data-display',
        type: 'atom',
        atomType: 'Text',
        order: 2,
        params: {
          content: '🎯 Smart Recommendations for {{ data.product.name }}:\n\n🛍️ Related Items: {{ nodeData.relatedProducts.length }} products\n⭐ Reviews: {{ nodeData.reviewSummary.averageRating }}/5 ({{ nodeData.reviewSummary.totalReviews }} total)\n📈 Analytics: {{ nodeData.productAnalytics.views }} views, {{ nodeData.productAnalytics.purchases }} purchases\n\n💡 Recommendation: {{ nodeData.productAnalytics.recommendation }}',
          tag: 'div',
          fontSize: '16px',
          color: 'var(--textLight)',
          backgroundColor: 'rgba(255,255,255,0.1)',
          padding: 'var(--spacing-medium)',
          borderRadius: '8px',
          border: '1px solid var(--accent)',
          whiteSpace: 'pre-line',
          fontFamily: 'monospace',
          lineHeight: '1.6'
        },
        dataRequirements: [
          {
            key: 'relatedProducts',
            source: {
              type: 'mockData',
              query: 'relatedProducts?categoryId={{ data.product.categoryId }}&excludeId={{ data.product.id }}'
            },
            blocking: true,
            cacheDurationMs: 300000,
            defaultValue: []
          },
          {
            key: 'reviewSummary',
            source: {
              type: 'mockData',
              query: 'reviewSummary?productId={{ data.product.id }}'
            },
            blocking: false,
            cacheDurationMs: 180000,
            defaultValue: { averageRating: 0, totalReviews: 0 }
          },
          {
            key: 'productAnalytics',
            source: {
              type: 'mockData',
              query: 'productAnalytics?productId={{ data.product.id }}&categoryId={{ data.product.categoryId }}'
            },
            blocking: false,
            cacheDurationMs: 60000, // Shorter cache for analytics
            defaultValue: {
              views: 0,
              purchases: 0,
              recommendation: 'Loading recommendation...'
            }
          }
        ],
        loadingBehavior: {
          placeholderType: 'skeleton',
          skeletonConfig: {
            shape: 'rect',
            width: '100%',
            height: '180px',
            color: 'var(--accent)'
          }
        }
      }
    ]
  };

  const testCallToActionComponent: ComponentNode = {
    id: 'cta-component-test-1',
    type: 'component',
    componentType: 'CallToAction',
    order: 7, // Updated order
    name: 'Test CTA Component',
    params: {
      title: "Ready to Elevate Your Experience?",
      titleTag: 'h2',
      subtitle: "Join our community today and unlock exclusive benefits, early access to new features, and much more. Don't miss out!",
      buttonText: "Sign Up Now!",
      buttonHref: "/signup",
      buttonVariant: 'secondary',
      backgroundColor: "var(--primary-darker, #2c3e50)",
      textColor: "var(--textLight, #ecf0f1)",
      padding: "var(--spacing-xl)",
      borderRadius: "var(--border-radius-large)",
      textAlign: 'center',
      maxWidth: '700px',
      gap: 'var(--spacing-regular)'
    }
  };

  // =================================================================
  // NEW, MORE IMPRESSIVE SHOWCASE SECTIONS
  // =================================================================

  const fullScreenHeroSection: SectionNode = {
    id: 'fullscreen-hero',
    type: 'section',
    order: 10,
    name: 'Fullscreen Animated Hero',
    params: {
        backgroundColor: 'var(--backgroundDark)'
    },
    layout: {
        mode: 'flow',
        height: '100vh',
        width: '100%',
    },
    positioning: {
        position: 'relative'
    },
    children: [
        {
            id: 'hero-bg-image',
            type: 'atom',
            atomType: 'Image',
            order: 0,
            params: {
                src: 'https://images.pexels.com/photos/32314302/pexels-photo-32314302.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
                alt: 'Abstract mountain range background',
                objectFit: 'cover',
            },
            styles: {
                base: {
                    opacity: 0,
                }
            },
            layout: {
                width: '100%',
                height: '100%'
            },
            positioning: { position: 'absolute', top: '0', left: '0', zIndex: 1 },
            animations: [{
                id: 'bg-fade-in',
                trigger: { type: 'load' },
                keyframes: [ { offset: 0, styles: { opacity: 0 } }, { offset: 1, styles: { opacity: 0.3 } }],
                timing: { durationMs: 2000, easing: 'ease-in', fillMode: 'forwards' }
            }]
        } as AtomNode,
        {
            id: 'hero-content-layer',
            type: 'section',
            order: 1,
            params: {},
            layout: { mode: 'flex', direction: 'column', justifyContent: 'center', alignItems: 'center', gap: 'var(--spacing-medium)', width: '100%', height: '100%'},
            positioning: { position: 'absolute', top: '0', left: '0', zIndex: 2 },
            children: [
                {
                    id: 'hero-main-heading',
                    type: 'atom',
                    atomType: 'Text',
                    order: 0,
                    params: {
                        content: 'OSDL V3 Renderer',
                        tag: 'h1',
                        fontSize: 'clamp(3rem, 10vw, 6rem)',
                        color: 'var(--textLight)',
                        textShadow: '0 4px 10px rgba(0,0,0,0.5)'
                    },
                    animations: [{
                        id: 'main-heading-anim',
                        trigger: { type: 'load', delayMs: 300 },
                        keyframes: [ { offset: 0, styles: { opacity: 0, transform: 'translateY(50px) scale(0.9)' } }, { offset: 1, styles: { opacity: 1, transform: 'translateY(0) scale(1)' } }],
                        timing: { durationMs: 800, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fillMode: 'forwards' }
                    }]
                } as AtomNode,
                {
                    id: 'hero-sub-heading',
                    type: 'atom',
                    atomType: 'Text',
                    order: 1,
                    params: {
                        content: 'Bringing Designs to Life with Dynamic Interactions & Animations.',
                        tag: 'p',
                        fontSize: 'clamp(1rem, 4vw, 1.5rem)',
                        color: 'var(--textLight)',
                        textAlign: 'center',
                        maxWidth: '800px'
                    },
                    animations: [{
                        id: 'sub-heading-anim',
                        trigger: { type: 'load', delayMs: 600 },
                        keyframes: [ { offset: 0, styles: { opacity: 0, transform: 'translateY(30px)' } }, { offset: 1, styles: { opacity: 1, transform: 'translateY(0)' } }],
                        timing: { durationMs: 900, easing: 'ease-out', fillMode: 'forwards' }
                    }]
                } as AtomNode
            ]
        }
    ]
};

const marqueeSection: SectionNode = {
    id: 'marquee-section',
    type: 'section',
    order: 10.5,
    name: 'Sliding Text Marquee',
    params: {
        backgroundColor: 'var(--primary)',
        padding: 'var(--spacing-medium) 0',
        overflow: 'hidden'
    },
    layout: {
        mode: 'flow',
        width: '100%'
    },
    children: [
        {
            id: 'marquee-text',
            type: 'atom',
            atomType: 'Text',
            order: 0,
            params: {
                content: 'OSDL V3 SUPPORTS KEYFRAME ANIMATIONS • EASILY CREATE DYNAMIC EXPERIENCES • PERFECT FOR SCROLLING BANNERS AND MORE • OSDL V3 SUPPORTS KEYFRAME ANIMATIONS • EASILY CREATE DYNAMIC EXPERIENCES • PERFECT FOR SCROLLING BANNERS AND MORE • ',
                fontSize: '20px',
                color: 'var(--textLight)',
                whiteSpace: 'nowrap'
            },
            animations: [{
                id: 'marquee-anim',
                trigger: { type: 'load' },
                keyframes: [
                    { offset: 0, styles: { transform: 'translateX(100%)' } },
                    { offset: 1, styles: { transform: 'translateX(-100%)' } }
                ],
                timing: {
                    durationMs: 40000,
                    easing: 'linear',
                    iterations: 'infinite'
                }
            }]
        } as AtomNode
    ]
};

const scrollingStorySection: SectionNode = {
    id: 'scrolling-story',
    type: 'section',
    order: 11,
    name: 'Enhanced Scrolling Story',
    params: {
        backgroundColor: 'var(--backgroundSubtle)',
        padding: '100px var(--spacing-large)',
        overflow: 'hidden' // Prevents items from appearing outside their animation bounds
    },
    layout: {
        mode: 'flow',
        maxWidth: '1200px',
        margin: '0 auto',
        gap: '200px'
    },
    children: [
        {
            id: 'story-title', type: 'atom', atomType: 'Text', order: 0, params: { content: 'A Richer Narrative', tag: 'h2', fontSize: '52px', textAlign: 'center' },
            animations: [{ id: 'story-1-anim', trigger: { type: 'scroll_into_view' }, keyframes: [ { offset: 0, styles: { opacity: 0, transform: 'translateY(40px)' } }, { offset: 1, styles: { opacity: 1, transform: 'translateY(0)' } }], timing: { durationMs: 800, fillMode: 'forwards' }}]
        } as AtomNode,
        {
            id: 'story-2-cols', type: 'section', order: 1, params: {},
            layout: { mode: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: 'var(--spacing-large)' },
            children: [
                {
                    id: 'story-img-1', type: 'atom', atomType: 'Image', order: 0, params: { src: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', alt: 'Team collaborating', borderRadius: '12px' },
                    animations: [{ id: 'img-1-anim', trigger: { type: 'scroll_into_view' }, keyframes: [ { offset: 0, styles: { opacity: 0, transform: 'translateX(-100px) scale(0.8)' } }, { offset: 1, styles: { opacity: 1, transform: 'translateX(0) scale(1)' } }], timing: { durationMs: 1000, easing: 'ease-out', fillMode: 'forwards' }}]
                } as AtomNode,
                {
                    id: 'story-text-1', type: 'atom', atomType: 'Text', order: 1, params: { content: 'Combine animated text and images to create compelling layouts.', tag: 'p', fontSize: '24px' },
                    animations: [{ id: 'text-1-anim', trigger: { type: 'scroll_into_view', delayMs: 200 }, keyframes: [ { offset: 0, styles: { opacity: 0, transform: 'translateX(50px)' } }, { offset: 1, styles: { opacity: 1, transform: 'translateX(0)' } }], timing: { durationMs: 800, easing: 'ease-out', fillMode: 'forwards' }}]
                } as AtomNode,
            ]
        },
        {
            id: 'story-point-4',
            type: 'atom', atomType: 'Text', order: 3, params: { content: 'Creating an engaging narrative experience.', tag: 'h2', fontSize: '42px', textAlign: 'center' },
            animations: [{ id: 'story-4-anim', trigger: { type: 'scroll_into_view' }, keyframes: [ { offset: 0, styles: { opacity: 0, transform: 'scale(0.5)' } }, { offset: 1, styles: { opacity: 1, transform: 'scale(1)' } }], timing: { durationMs: 800, easing: 'ease-in-out', fillMode: 'forwards' }}]
        } as AtomNode
    ]
};

const interactiveGridSection: SectionNode = {
    id: 'interactive-grid',
    type: 'section',
    order: 12,
    name: 'Interactive Grid',
    params: { padding: 'var(--spacing-xl)' },
    layout: { mode: 'flow', maxWidth: '1200px', margin: '0 auto', gap: 'var(--spacing-large)' },
    children: [
        {
            id: 'interactive-title',
            type: 'atom', atomType: 'Text', order: 0,
            params: { content: 'Engage and Interact', tag: 'h2', fontSize: '48px', textAlign: 'center', fontFamily: 'var(--font-heading)', color: 'var(--primaryDarker)', margin: '0 0 var(--spacing-large) 0' }
        } as AtomNode,
        {
            id: 'interactive-grid-container',
            type: 'section',
            order: 1,
            params: {},
            layout: { mode: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-large)' },
            children: [
                {
                    id: 'grid-card-hover', type: 'section', order: 0, params: { backgroundColor: 'white', padding: 'var(--spacing-large)', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
                    layout: { mode: 'flow' },
                    interactionStates: {
                        hover: {
                            inlineStyles: { transform: 'translateY(-10px)', boxShadow: '0 12px 20px rgba(0,0,0,0.1)' },
                            transition: { properties: ['transform', 'box-shadow'], durationMs: 350, easing: 'ease' }
                        }
                    },
                    children: [ {id:'c1-t',type:'atom', atomType:'Text',order:0,params:{content:'Hover Effect', tag:'h3'}}, {id:'c1-p',type:'atom', atomType:'Text',order:1,params:{content:'A simple yet elegant hover effect.'}} ]
                } as SectionNode,
                {
                    id: 'grid-card-focus', type: 'section', order: 1, 
                    params: { 
                        backgroundColor: 'white', 
                        padding: 'var(--spacing-large)', 
                        borderRadius: '12px', 
                        borderWidth: '2px',
                        borderStyle: 'solid',
                        borderColor: 'transparent'
                    },
                    layout: { mode: 'flow' },
                    interactionStates: {
                        focus: { 
                            inlineStyles: { 
                                borderColor: 'var(--accent)', 
                                boxShadow: '0 0 0 4px rgba(230, 126, 34, 0.4)' 
                            },
                            transition: { properties: ['border-color', 'box-shadow'], durationMs: 250, easing: 'ease-in-out' }
                        }
                    },
                    children: [ {id:'c2-t',type:'atom', atomType:'Text',order:0,params:{content:'Focus Effect', tag:'h3'}}, {id:'c2-p',type:'atom', atomType:'Text',order:1,params:{content:'Click the button, then tab away to see the focus state.'}}, {id:'c2-b', type:'atom', atomType:'Button', order:2, params:{content:'Focusable Button', backgroundColor:'var(--primary)'}} ]
                } as SectionNode,
                {
                    id: 'grid-card-click', type: 'section', order: 2, params: { backgroundColor: 'white', padding: 'var(--spacing-large)', borderRadius: '12px', cursor: 'pointer' },
                    layout: { mode: 'flow' },
                    interactionStates: {
                        active: {
                            inlineStyles: { transform: 'scale(0.97)', backgroundColor: '#f0f0f0' },
                            transition: { properties: ['transform', 'background-color'], durationMs: 150, easing: 'ease-out' }
                        }
                    },
                    animations: [{
                        id: 'click-pop',
                        trigger: {type: 'click'},
                        keyframes: [ { offset: 0, styles: { transform: 'scale(1)' } }, { offset: 0.5, styles: { transform: 'scale(1.05)' } }, { offset: 1, styles: { transform: 'scale(1)' } } ],
                        timing: { durationMs: 400, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' }
                    }],
                    children: [ {id:'c3-t',type:'atom', atomType:'Text',order:0,params:{content:'Click Animation', tag:'h3'}}, {id:'c3-p',type:'atom', atomType:'Text',order:1,params:{content:'Click this card to trigger a pop animation.'}} ]
                } as SectionNode
            ]
        }
    ]
};

const conditionalContentSection: SectionNode = {
    id: 'conditional-section',
    type: 'section',
    order: 13,
    name: 'Conditional Content Zone',
    params: {
        backgroundColor: 'var(--backgroundDark)',
        padding: 'var(--spacing-xl)',
        color: 'var(--textLight)'
    },
    layout: { mode: 'flow', maxWidth: '1000px', margin: '0 auto', gap: 'var(--spacing-medium)' },
    children: [
        {
            id: 'conditional-title',
            type: 'atom', atomType: 'Text', order: 0,
            params: { content: 'Conditional Visibility', tag: 'h2', fontSize: '48px', textAlign: 'center', fontFamily: 'var(--font-heading)', color: 'var(--primary)' }
        } as AtomNode,
        {
            id: 'conditional-explanation',
            type: 'atom', atomType: 'Text', order: 1,
            params: { content: 'The visibility of the boxes below depends on the values in the mocked user context.', textAlign: 'center' }
        } as AtomNode,
        {
            id: 'conditional-container',
            type: 'section',
            order: 2,
            params: {},
            layout: { mode: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-large)', margin: 'var(--spacing-large) 0' },
            children: [
                {
                    id: 'visible-for-loggedin', type: 'section', order: 0, params: { backgroundColor: 'var(--secondary)', padding: 'var(--spacing-medium)', borderRadius: '8px' },
                    layout: {mode:'flow'},
                    visibility: { conditions: [{ contextPath: 'user.isLoggedIn', operator: 'equals', value: true }] },
                    children: [ { id:'v1-t', type:'atom', atomType:'Text', order:0, params:{content:'Visible because user.isLoggedIn is true.', tag:'h4', textAlign:'center'} } ]
                } as SectionNode,
                {
                    id: 'hidden-for-non-premium', type: 'section', order: 1, params: { backgroundColor: 'var(--backgroundMedium)', padding: 'var(--spacing-medium)', borderRadius: '8px' },
                    layout: {mode:'flow'},
                    visibility: { conditions: [{ contextPath: 'user.role', operator: 'equals', value: 'premium' }] },
                    children: [ { id:'v2-t', type:'atom', atomType:'Text', order:0, params:{content:'This should NOT be visible.', tag:'h4', textAlign:'center'} } ]
                } as SectionNode,
                {
                    id: 'visible-for-admin', type: 'section', order: 2, params: { backgroundColor: 'var(--accent)', padding: 'var(--spacing-medium)', borderRadius: '8px' },
                    layout: {mode:'flow'},
                    visibility: { conditions: [{ contextPath: 'user.isAdmin', operator: 'equals', value: true }] },
                    children: [ { id:'v3-t', type:'atom', atomType:'Text', order:0, params:{content:'Visible because user.isAdmin is true.', tag:'h4', textAlign:'center', color: 'var(--textDark)'} } ]
                } as SectionNode
            ]
        }
    ]
};

const viewportDependentSection: SectionNode = {
    id: 'viewport-section',
    type: 'section',
    order: 14, // Place it after other showcases
    name: 'Viewport-Dependent Content',
    params: { padding: 'var(--spacing-xl)', backgroundColor: 'var(--primaryDarker)' },
    layout: { mode: 'flow', maxWidth: '1200px', margin: '0 auto', gap: 'var(--spacing-medium)' },
    children: [
        {
            id: 'viewport-title', type: 'atom', atomType: 'Text', order: 0,
            params: { content: 'Responsive Visibility', tag: 'h2', fontSize: '48px', textAlign: 'center', color: 'var(--textLight)' }
        } as AtomNode,
        {
            id: 'viewport-explanation', type: 'atom', atomType: 'Text', order: 1,
            params: { content: 'This section renders different content based on viewport width. (Resize your browser to see it change)', textAlign: 'center', color: 'var(--primaryLighter)' }
        } as AtomNode,
        // --- Desktop Content ---
        {
            id: 'desktop-view', type: 'section', order: 2, params: { padding: 'var(--spacing-large)', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', margin:'var(--spacing-large) 0' },
            visibility: { conditions: [{ contextPath: 'viewport.width', operator: 'greaterThan', value: 768 }] },
            layout: { mode: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-large)', alignItems: 'center' },
            children: [
                { id: 'desktop-icon', type: 'atom', atomType: 'Text', order: 0, params: { content: '🖥️', fontSize: '80px' } } as AtomNode,
                { id: 'desktop-text', type: 'atom', atomType: 'Text', order: 1, params: { content: 'You are on a desktop-sized view (> 768px).', fontSize: '24px', color: 'white' } } as AtomNode
            ]
        } as SectionNode,
        // --- Mobile Content ---
        {
            id: 'mobile-view', type: 'section', order: 3, params: { padding: 'var(--spacing-large)', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', margin:'var(--spacing-large) 0' },
            visibility: { conditions: [{ contextPath: 'viewport.width', operator: 'lessThanOrEqual', value: 768 }] },
            layout: { mode: 'flow', gap: 'var(--spacing-medium)', alignItems: 'center' },
            children: [
                { id: 'mobile-icon', type: 'atom', atomType: 'Text', order: 0, params: { content: '📱', fontSize: '60px', textAlign: 'center' } } as AtomNode,
                { id: 'mobile-text', type: 'atom', atomType: 'Text', order: 1, params: { content: 'You are on a mobile-sized view (<= 768px).', fontSize: '20px', color: 'white', textAlign: 'center' } } as AtomNode
            ]
        } as SectionNode
    ]
};

const customComponentSection: SectionNode = {
    id: 'custom-component-section',
    type: 'section',
    order: 15,
    name: 'Custom React Component via CodeBlockNode',
    params: { padding: 'var(--spacing-xl)', backgroundColor: 'var(--backgroundSubtle)' },
    layout: { mode: 'flow', maxWidth: '1200px', margin: '0 auto', gap: 'var(--spacing-medium)' },
    children: [
        {
            id: 'custom-component-title', type: 'atom', atomType: 'Text', order: 0,
            params: { content: '🚀 Dynamic Component Showcase', tag: 'h2', fontSize: '48px', textAlign: 'center', fontFamily: 'var(--font-heading)', color: 'var(--primaryDarker)', margin: '0 0 var(--spacing-large) 0' }
        } as AtomNode,
        {
            id: 'custom-component-explanation',
            type: 'atom', atomType: 'Text', order: 1,
            params: { content: 'The component below is not a standard Atom. It is a custom React component loaded dynamically from a pre-compiled JS file using a CodeBlockNode. The props (like initial count and colors) are passed directly from the OSDL.', textAlign: 'center' }
        } as AtomNode,
        {
            id: 'custom-counter-component',
            type: 'codeblock',
            order: 2,
            name: 'Dynamic Counter',
            params: {
                language: 'react_component_jsx',
                // JSX source code that the backend can compile
                code: `function CustomCounter(props) {
    const { initialCount, borderColor, buttonColor, textColor, title } = props;
    const [count, setCount] = React.useState(initialCount || 0);

    const containerStyle = {
        padding: '20px',
        border: \`2px solid \${borderColor || '#ccc'}\`,
        borderRadius: '8px',
        textAlign: 'center',
        backgroundColor: '#f9f9f9',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        fontFamily: 'sans-serif',
        maxWidth: '400px',
        margin: '20px auto'
    };

    const buttonStyle = {
        padding: '10px 20px',
        fontSize: '16px',
        margin: '0 10px',
        cursor: 'pointer',
        backgroundColor: buttonColor || '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        transition: 'background-color 0.3s'
    };

    const countStyle = {
        fontSize: '2.5em',
        fontWeight: 'bold',
        margin: '20px 0',
        color: textColor || '#333'
    };

    return (
        <div style={containerStyle}>
            <h2 style={{ marginBottom: '15px' }}>{title || 'Custom Counter Component'}</h2>
            <p style={countStyle}>{count}</p>
            <div>
                <button style={buttonStyle} onClick={() => setCount(count + 1)}>
                    Increment
                </button>
                <button style={buttonStyle} onClick={() => setCount(count - 1)}>
                    Decrement
                </button>
            </div>
        </div>
    );
}

export default CustomCounter;`,
                // The URL that DynamicComponentLoader will fetch
                compiledComponentUrl: '/compiled_components/custom-counter-component_1640000000000.js',
                // Props to pass to the dynamically loaded component
                props: {
                    initialCount: 5,
                    borderColor: 'var(--accent)',
                    buttonColor: 'var(--secondary)',
                    textColor: 'var(--primaryDarker)',
                    title: 'Dynamically Loaded Counter'
                }
            },
            // The loading behavior for the code block itself, while the script is fetched
            loadingBehavior: {
                placeholderType: 'skeleton',
                skeletonConfig: {
                    shape: 'rect',
                    width: '444px', // (400px width + 20px padding * 2 + 2px border * 2)
                    height: '200px',
                    color: 'var(--backgroundMedium)'
                }
            }
        }
    ]
};

const otherCodeBlocksSection: SectionNode = {
    id: 'other-codeblocks-section',
    type: 'section',
    order: 16,
    name: 'HTML, CSS, and JS CodeBlock Demos',
    params: { padding: 'var(--spacing-xl)', backgroundColor: 'var(--backgroundLight)' },
    layout: { mode: 'flow', maxWidth: '1200px', margin: '0 auto', gap: 'var(--spacing-xl)' },
    children: [
        {
            id: 'other-codeblocks-title', type: 'atom', atomType: 'Text', order: 0,
            params: { content: 'HTML, CSS & JS Code Blocks', tag: 'h2', fontSize: '48px', textAlign: 'center', fontFamily: 'var(--font-heading)', color: 'var(--primaryDarker)', margin: '0 0 var(--spacing-large) 0' }
        },
        // --- HTML EMBED DEMO ---
        {
            id: 'html-embed-demo-container', type: 'section', order: 1,
            params: { border: '1px solid #ccc', borderRadius: '8px', padding: 'var(--spacing-medium)'},
            layout: { mode: 'flow', gap: 'var(--spacing-medium)'},
            children: [
                { id: 'html-demo-title', type: 'atom', atomType: 'Text', order: 0, params: { content: 'HTML Embed (Google Map)', tag: 'h3'}},
                {
                    id: 'google-map-wrapper', type: 'section', order: 1,
                    params: {},
                    layout: { mode: 'flow', height: '450px' },
                    children: [
                        {
                            id: 'google-map-embed', type: 'codeblock', order: 0,
                            params: {
                                language: 'html',
                                code: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.0192019893917!2d144.953735315922!3d-37.81720974208475!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad642af0f1154b7%3A0x5045675218ce7e0!2sFederation%20Square!5e0!3m2!1sen!2sau!4v1629864%20Federation%20Square" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`,
                                executionContext: 'iframe_sandboxed',
                                sandboxAttributes: ["allow-scripts", "allow-same-origin", "allow-forms"]
                            }
                        }
                    ]
                }
            ]
        },
        // --- SCOPED CSS DEMO ---
        {
            id: 'scoped-css-demo-container', type: 'section', order: 2,
            params: { 
                border: '1px solid #ccc', 
                borderRadius: '8px', 
                padding: 'var(--spacing-medium)',
                // Add a visual indicator to make it clear where the container is
                position: 'relative'
            },
            layout: { mode: 'flow', gap: 'var(--spacing-medium)'},
            children: [
                { 
                    id: 'css-demo-title', 
                    type: 'atom', 
                    atomType: 'Text', 
                    order: 0, 
                    params: { 
                        content: 'Scoped CSS (Custom Animation & Styles)', 
                        tag: 'h3'
                    }
                },
                
                // Debug info to show scope IDs
                {
                    id: 'css-debug-info',
                    type: 'atom',
                    atomType: 'Text',
                    order: 0.5,
                    params: {
                        content: 'Container scope ID: scoped-css-demo-container',
                        tag: 'div',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        backgroundColor: '#f8f8f8',
                        padding: '8px',
                        borderRadius: '4px'
                    }
                },
                
                // The content to be styled
                {
                    id: 'styled-by-css-block', 
                    type: 'section', 
                    order: 1,
                    params: { padding: 'var(--spacing-large)' },
                    layout: { mode: 'flex', justifyContent: 'space-around', alignItems: 'center'},
                    children: [
                        { 
                            id: 'css-target-1', 
                            type: 'atom', 
                            atomType: 'Text', 
                            order: 0, 
                            params: { 
                                content: 'Target 1 (hover me)', 
                                tag: 'p', 
                                padding: '20px', 
                                backgroundColor: '#eee'
                            }
                        },
                        { 
                            id: 'css-target-2', 
                            type: 'atom', 
                            atomType: 'Text', 
                            order: 1, 
                            params: { 
                                content: 'Target 2', 
                                tag: 'p', 
                                padding: '20px', 
                                backgroundColor: '#eee'
                            }
                        },
                        { 
                            id: 'css-target-3', 
                            type: 'atom', 
                            atomType: 'Text', 
                            order: 2, 
                            params: { 
                                content: 'Target 3', 
                                tag: 'p', 
                                padding: '20px', 
                                backgroundColor: '#eee'
                            }
                        }
                    ]
                },
                
                // The CSS code block LAST so it can style the elements above
                {
                    id: 'scoped-css-codeblock', 
                    type: 'codeblock', 
                    order: 2,
                    params: {
                        language: 'css',
                        // Force scoped style tag to ensure scoping works
                        executionContext: 'scoped_style_tag',
                        code: `
                            /* CSS Block #scoped-css-codeblock trying to style content within scoped-css-demo-container */
                            
                            /* 1. Apply a background to the styled-by-css-block section */
                            #styled-by-css-block {
                                background: linear-gradient(90deg, var(--primary), var(--secondary), var(--accent));
                                background-size: 200% 200%;
                                animation: rainbow-bg 10s ease infinite;
                                border-radius: 8px;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                                transition: transform 0.5s ease;
                            }
                            
                            /* Animation keyframes */
                            @keyframes rainbow-bg {
                                0% { background-position: 0% 50%; }
                                50% { background-position: 100% 50%; }
                                100% { background-position: 0% 50%; }
                            }
                            
                            /* 2. Add hover effect to the section */
                            #styled-by-css-block:hover {
                                transform: scale(1.02);
                            }
                            
                            /* 3. Style the first target paragraph */
                            #css-target-1-wrapper {
                                cursor: pointer;
                                transition: all 0.3s ease;
                            }
                            
                            #css-target-1-wrapper:hover {
                                transform: scale(1.2) rotate(-5deg);
                                background-color: var(--accent) !important;
                                color: white;
                                font-weight: bold;
                            }
                            
                            /* 4. Style the second target paragraph */
                            #css-target-2-wrapper {
                                color: var(--primaryDarker);
                                font-weight: bold;
                                border-bottom: 2px solid var(--primary);
                            }
                            
                            /* 5. Style the third target paragraph */
                            #css-target-3-wrapper {
                                text-decoration: underline;
                                color: var(--secondary);
                                font-style: italic;
                            }
                        `
                    }
                }
            ]
        },
        // --- JAVASCRIPT DEMO ---
        {
            id: 'javascript-demo-container', type: 'section', order: 3,
            params: { 
                border: '1px solid #ccc', 
                borderRadius: '8px', 
                padding: 'var(--spacing-medium)',
                position: 'relative' 
            },
            layout: { mode: 'flow', gap: 'var(--spacing-medium)'},
            children: [
                { 
                    id: 'js-demo-title', 
                    type: 'atom', 
                    atomType: 'Text', 
                    order: 0, 
                    params: { 
                        content: 'JavaScript DOM Manipulation', 
                        tag: 'h3'
                    }
                },
                
                // Debug info to show scope IDs
                {
                    id: 'js-debug-info',
                    type: 'atom',
                    atomType: 'Text',
                    order: 0.5,
                    params: {
                        content: 'Container scope ID: javascript-demo-container',
                        tag: 'div',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        backgroundColor: '#f8f8f8',
                        padding: '8px',
                        borderRadius: '4px'
                    }
                },
                
                {
                    id: 'js-interactive-area', 
                    type: 'section', 
                    order: 1, 
                    params: {
                        border: '1px dashed #ccc',
                        padding: '20px',
                        borderRadius: '8px'
                    },
                    layout: { mode: 'flex', gap: '20px', alignItems: 'center'},
                    children: [
                        { 
                            id: 'js-action-button', 
                            type: 'atom', 
                            atomType: 'Button', 
                            order: 0, 
                            params: { 
                                content: 'Click Me!', 
                                tag: 'button',
                                padding: '10px 20px',
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                borderRadius: '4px',
                                border: 'none',
                                cursor: 'pointer'
                            }
                        },
                        { 
                            id: 'js-output-text', 
                            type: 'atom', 
                            atomType: 'Text', 
                            order: 1, 
                            params: { 
                                content: 'I will change when you click the button.', 
                                tag: 'p',
                                minWidth: '200px'
                            }
                        }
                    ]
                },
                
                // The JavaScript block
                {
                    id: 'vanilla-js-codeblock', 
                    type: 'codeblock', 
                    order: 2,
                    params: {
                        language: 'javascript',
                        executionContext: 'direct_script',
                        code: `
                            // Add visible debug output to the page
                            const debugOutput = document.createElement('div');
                            debugOutput.style.backgroundColor = '#f8f8f8';
                            debugOutput.style.border = '1px solid #ddd';
                            debugOutput.style.padding = '10px';
                            debugOutput.style.margin = '10px 0';
                            debugOutput.style.fontFamily = 'monospace';
                            debugOutput.style.whiteSpace = 'pre-wrap';
                            debugOutput.style.fontSize = '12px';
                            
                            // Log initial information
                            debugOutput.innerHTML = \`Running JavaScript for node: \${nodeId}<br>\`;
                            debugOutput.innerHTML += \`Parent scopeId: \${scopeId || 'undefined'}<br>\`;
                            
                            // Find the parent container
                            const container = document.querySelector(\`[data-oskiynai-scope="\${scopeId}"]\`);
                            
                            if (!container) {
                                debugOutput.innerHTML += \`❌ ERROR: Container with scopeId="\${scopeId}" not found<br>\`;
                                document.body.appendChild(debugOutput);
                                return;
                            }
                            
                            debugOutput.innerHTML += \`✅ Found container with scopeId="\${scopeId}"<br>\`;
                            
                            // Find button and text elements
                            const buttonWrapper = container.querySelector('#js-action-button-wrapper');
                            const textWrapper = container.querySelector('#js-output-text-wrapper');
                            
                            // Debug all relevant elements for troubleshooting
                            debugOutput.innerHTML += \`All IDs in container: \${Array.from(container.querySelectorAll('[id]')).map(el => el.id).join(', ')}<br>\`;
                            
                            if (!buttonWrapper) {
                                debugOutput.innerHTML += \`❌ ERROR: Button wrapper '#js-action-button-wrapper' not found<br>\`;
                            } else {
                                debugOutput.innerHTML += \`✅ Found button wrapper<br>\`;
                                const button = buttonWrapper.querySelector('button');
                                if (!button) {
                                    debugOutput.innerHTML += \`❌ ERROR: Button element not found inside wrapper<br>\`;
                                } else {
                                    debugOutput.innerHTML += \`✅ Found button element<br>\`;
                                }
                            }
                            
                            if (!textWrapper) {
                                debugOutput.innerHTML += \`❌ ERROR: Text wrapper '#js-output-text-wrapper' not found<br>\`;
                            } else {
                                debugOutput.innerHTML += \`✅ Found text wrapper<br>\`;
                                const textElement = textWrapper.querySelector('p');
                                if (!textElement) {
                                    debugOutput.innerHTML += \`❌ ERROR: Paragraph element not found inside wrapper<br>\`;
                                } else {
                                    debugOutput.innerHTML += \`✅ Found paragraph element<br>\`;
                                }
                            }
                            
                            // Add the debug element to the bottom of the container
                            container.appendChild(debugOutput);
                            
                            // If we have both elements, set up the click handler
                            if (buttonWrapper && textWrapper) {
                                const button = buttonWrapper.querySelector('button');
                                const textElement = textWrapper.querySelector('p');
                                
                                if (button && textElement) {
                                    let clickCount = 0;
                                    
                                    button.addEventListener('click', () => {
                                        clickCount++;
                                        textElement.innerText = 'You clicked me ' + clickCount + ' time(s)!';
                                        textElement.style.color = 'var(--primary)';
                                        textElement.style.fontWeight = 'bold';
                                        textElement.style.transition = 'all 0.3s';
                                        textElement.style.transform = 'scale(1.1)';
                                        setTimeout(() => { textElement.style.transform = 'scale(1)'; }, 300);
                                        
                                        debugOutput.innerHTML += \`Button clicked: \${clickCount} time(s)<br>\`;
                                    });
                                    
                                    debugOutput.innerHTML += \`✅ Click handler successfully attached<br>\`;
                                }
                            }
                        `
                    }
                }
            ]
        }
    ]
};

const actionsAndFormSection: SectionNode = {
    id: 'actions-form-section',
    type: 'section',
    order: 17,
    name: 'Actions and Form Demo',
    params: {
      padding: 'var(--spacing-xl)',
      backgroundColor: 'var(--backgroundLight)',
      margin: 'var(--spacing-large) 0',
      borderRadius: '12px',
      border: '2px solid var(--primary)'
    },
    layout: {
      mode: 'flow',
      maxWidth: '800px',
      margin: '0 auto',
      gap: 'var(--spacing-medium)'
    },
    children: [
      {
        id: 'form-title',
        type: 'atom',
        atomType: 'Text',
        order: 0,
        params: {
          content: 'Contact Us (Actions Demo)',
          tag: 'h2',
          fontSize: '32px',
          textAlign: 'center',
          margin: '0 0 var(--spacing-large) 0'
        }
      },
      {
        id: 'contact-form',
        type: 'section',
        order: 1,
        name: 'Contact Form',
        htmlTag: 'form',
        isFormContext: true,
        params: {},
        layout: {
          mode: 'flow',
          gap: 'var(--spacing-medium)'
        },
        eventHandlers: {
          onSubmit: [
            {
              id: 'submit-form-data',
              type: 'submitData',
              params: {
                endpoint: '/api/mock-form-submit', // The mock API endpoint
                method: 'POST',
                body: {
                  email: '{{ formData.email }}',
                  message: '{{ formData.message }}'
                }
              },
              onSuccess: [
                {
                  id: 'show-success-message',
                  type: 'updateNodeState',
                  params: {
                    targetNodeId: 'form-success-message',
                    updates: {
                      visibility: { hidden: false }
                    }
                  }
                },
                {
                  id: 'hide-form-fields',
                  type: 'updateNodeState',
                  params: {
                    targetNodeId: 'form-fields-container',
                    updates: {
                      visibility: { hidden: true }
                    }
                  }
                }
              ],
              onError: [
                {
                    id: 'show-error-message',
                    type: 'updateNodeState',
                    params: {
                        targetNodeId: 'form-error-message',
                        updates: {
                            visibility: { hidden: false }
                        }
                    }
                }
              ]
            }
          ]
        },
        children: [
            {
                id: 'form-fields-container',
                type: 'section',
                order: 0,
                name: 'Form Fields',
                params: {},
                layout: {
                    mode: 'flow',
                    gap: 'var(--spacing-medium)'
                },
                children: [
                    {
                        id: 'email-input',
                        type: 'atom',
                        atomType: 'Input',
                        order: 0,
                        params: {
                          type: 'email',
                          name: 'email',
                          placeholder: 'Your Email Address (type "fail" in message to test error)',
                          required: true
                        }
                    },
                    {
                        id: 'message-input',
                        type: 'atom',
                        atomType: 'Input',
                        order: 1,
                        params: {
                          type: 'text',
                          name: 'message',
                          placeholder: 'Your Message',
                          required: true
                        }
                    },
                    {
                        id: 'submit-form-button',
                        type: 'atom',
                        atomType: 'Button',
                        order: 2,
                        params: {
                          content: 'Send Message',
                          buttonType: 'submit'
                        }
                    }
                ]
            },
            {
                id: 'form-success-message',
                type: 'atom',
                atomType: 'Text',
                order: 1,
                params: {
                  content: '✅ Thank you for your message! We will get back to you shortly.',
                  tag: 'div',
                  color: 'green',
                  padding: 'var(--spacing-medium)',
                  border: '1px solid green',
                  borderRadius: '8px',
                  backgroundColor: '#f0fff0'
                },
                visibility: {
                  hidden: true
                }
            },
            {
                id: 'form-error-message',
                type: 'atom',
                atomType: 'Text',
                order: 2,
                params: {
                  content: '❌ Something went wrong. Please try again.',
                  tag: 'div',
                  color: 'red',
                  padding: 'var(--spacing-medium)',
                  border: '1px solid red',
                  borderRadius: '8px',
                  backgroundColor: '#fff0f0'
                },
                visibility: {
                  hidden: true
                }
            }
        ]
      }
    ]
  };
	const stateDemoSection: SectionNode = {
	  id: 'state-management-demo',
	  type: 'section',
	  order: 20,
	  name: 'State Management Demo',
	  params: {
		padding: 'var(--spacing-xl)',
		backgroundColor: 'var(--backgroundSubtle)',
		margin: 'var(--spacing-large) 0',
		borderRadius: '12px'
	  },
	  layout: {
		mode: 'flow',
		maxWidth: '800px',
		margin: '0 auto',
		gap: 'var(--spacing-large)'
	  },
	  children: [
		{
		  id: 'state-demo-title',
		  type: 'atom',
		  atomType: 'Text',
		  order: 0,
		  params: {
			content: 'Client-Side State Demo',
			tag: 'h2',
			fontSize: '32px',
			textAlign: 'center',
			margin: '0 0 var(--spacing-large) 0'
		  }
		},
		// --- TABS DEMO ---
		{
		  id: 'tabs-container',
		  type: 'section',
		  order: 1,
		  name: 'Tabs Container',
		  state: {
			activeTab: 'tab1'
		  },
		  layout: { mode: 'flow', gap: 'var(--spacing-medium)' },
		  params: {},
		  children: [
			{
			  id: 'tab-buttons-container',
			  type: 'section',
			  order: 0,
              params: {},
			  layout: { mode: 'flex', gap: 'var(--spacing-small)' },
			  children: [
				// ... The tab buttons remain exactly the same ...
				{ id: 'button-for-tab1', type: 'atom', atomType: 'Button', order: 0, params: { content: 'Tab 1' }, eventHandlers: { onClick: [{ id: 'set-active-tab-1', type: 'updateState', params: { targetNodeId: 'tabs-container', updates: { activeTab: 'tab1' } } }] } },
				{ id: 'button-for-tab2', type: 'atom', atomType: 'Button', order: 1, params: { content: 'Tab 2' }, eventHandlers: { onClick: [{ id: 'set-active-tab-2', type: 'updateState', params: { targetNodeId: 'tabs-container', updates: { activeTab: 'tab2' } } }] } },
				{ id: 'button-for-tab3', type: 'atom', atomType: 'Button', order: 2, params: { content: 'Tab 3' }, eventHandlers: { onClick: [{ id: 'set-active-tab-3', type: 'updateState', params: { targetNodeId: 'tabs-container', updates: { activeTab: 'tab3' } } }] } }
			  ]
			},
			{
			  id: 'tabs-content-panels',
			  type: 'section',
			  order: 1,
			  layout: { mode: 'flow' },
              params: {},
			  children: [
				{
				  id: 'content-for-tab1',
				  type: 'atom',
				  atomType: 'Text',
				  order: 0,
				  params: { content: 'This is the content for the FIRST tab.' },
				  // FIXED: Use the new `states` binding to target the specific node.
				  visibility: {
					conditions: [{
					  contextPath: 'states.tabs-container.activeTab',
					  operator: 'equals',
					  value: 'tab1'
					}]
				  }
				},
				{
				  id: 'content-for-tab2',
				  type: 'atom',
				  atomType: 'Text',
				  order: 1,
				  params: { content: 'This is the content for the SECOND tab. It is different.' },
				  // FIXED: Use the new `states` binding.
				  visibility: {
					conditions: [{
					  contextPath: 'states.tabs-container.activeTab',
					  operator: 'equals',
					  value: 'tab2'
					}]
				  }
				},
				{
				  id: 'content-for-tab3',
				  type: 'atom',
				  atomType: 'Text',
				  order: 2,
				  params: { content: 'And this is the content for the THIRD and final tab.' },
				  // FIXED: Use the new `states` binding.
				  visibility: {
					conditions: [{
					  contextPath: 'states.tabs-container.activeTab',
					  operator: 'equals',
					  value: 'tab3'
					}]
				  }
				}
			  ]
			}
		  ]
		},
		// --- LIVE INPUT DEMO ---
		{
			id: 'live-input-container',
			type: 'section',
			order: 2,
			name: 'Live Input Container',
			state: {
				inputValue: 'Type something!'
			},
			layout: { mode: 'flow', gap: 'var(--spacing-medium)' },
			params: { marginTop: 'var(--spacing-xl)' },
			children: [
				{ id: 'live-input-title', type: 'atom', atomType: 'Text', order: 0, params: { content: 'Live State Preview', tag: 'h3' } },
				        {
          id: 'live-form-context',
          type: 'section',
          order: 1,
          isFormContext: true,
          htmlTag: 'div',
          params: {},
          layout: { mode: 'flow' },
          children: [
						{
							id: 'live-input-atom',
							type: 'atom',
							atomType: 'Input',
							order: 0,
							params: { name: 'liveInput', placeholder: 'Type here to see state change...' },
							eventHandlers: {
								onChange: [{
									id: 'update-live-text-state',
									type: 'updateState',
									params: {
										targetNodeId: 'live-input-container',
										updates: {
											// FIXED: Use the immediate event value, not the stale form data.
											inputValue: '{{ event.value }}'
										}
									}
								}]
							}
						}
					]
				},
				{
					id: 'live-preview-text',
					type: 'atom',
					atomType: 'Text',
					order: 2,
					 // FIXED: This now needs to look at its own parent's state, `parentState` is correct here.
					params: {
						content: "Container's state is: \"{{ parentState.inputValue }}\"",
						padding: 'var(--spacing-medium)',
						backgroundColor: 'var(--backgroundDark)',
						color: 'var(--textLight)',
						borderRadius: '8px',
						fontFamily: 'monospace'
					}
				}
			]
		}
	  ]
	};

// Advanced Expression Demo Section (Fully Corrected)
// PASTE THIS ENTIRE OBJECT INTO getDemoPageDefinition.ts

const advancedExpressionSection: SectionNode = {
  id: 'advanced-expression-section',
  type: 'section',
  order: 20.5,
  name: 'Advanced Expression Demos',
  params: {
    padding: 'var(--spacing-xl)',
    backgroundColor: 'var(--backgroundSubtle)',
    margin: 'var(--spacing-large) 0',
    borderRadius: '12px',
    border: '2px solid var(--accent)'
  },
  layout: {
    mode: 'flow',
    maxWidth: '800px',
    margin: '0 auto',
    gap: 'var(--spacing-large)'
  },
  state: {
    samplePrice: 2999, // Price in cents
    sampleProducts: [
      { name: 'Premium Widget', price: 1999, inStock: true, rating: 4.5 },
      { name: 'Deluxe Gadget', price: 2999, inStock: false, rating: 4.8 },
      { name: 'Basic Tool', price: 999, inStock: true, rating: 3.2 }
    ],
    currentIndex: 0,
    userScore: 85,
    threshold: 80
  },
  children: [
    {
      id: 'advanced-expr-title',
      type: 'atom',
      atomType: 'Text',
      order: 0,
      params: {
        content: 'Advanced Expression Syntax Demo',
        tag: 'h2',
        color: 'var(--primary)',
        fontSize: '28px',
        textAlign: 'center',
        marginBottom: 'var(--spacing-large)'
      }
    },
    {
      id: 'price-demo-container',
      type: 'section',
      order: 1,
      params: {
        backgroundColor: 'var(--backgroundLight)',
        padding: 'var(--spacing-large)',
        borderRadius: '8px',
        border: '2px solid var(--primary)'
      },
      layout: { mode: 'flow', gap: 'var(--spacing-medium)' },
      children: [
        {
          id: 'price-demo-title',
          type: 'atom',
          atomType: 'Text',
          order: 0,
          params: { content: 'Arithmetic & Formatting', tag: 'h3', color: 'var(--primary)', fontSize: '20px', fontWeight: 'bold' }
        },
        {
          id: 'price-display',
          type: 'atom',
          atomType: 'Text',
          order: 1,
          params: {
            // FIX: Use ternary operator for fallback. A ? A : B
            content: 'Price: ${{ toFixed(states["advanced-expression-section"].samplePrice / 100, 2) ? toFixed(states["advanced-expression-section"].samplePrice / 100, 2) : "0.00" }}',
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'var(--textDark)'
          }
        },
        {
          id: 'price-with-tax',
          type: 'atom',
          atomType: 'Text',
          order: 2,
          params: {
            content: 'With Tax (8.5%): ${{ toFixed((states["advanced-expression-section"].samplePrice * 1.085) / 100, 2) }}',
            fontSize: '16px',
            color: 'var(--textSecondary)'
          }
        }
      ]
    },
    {
      id: 'array-demo-container',
      type: 'section',
      order: 2,
      params: {
        backgroundColor: 'var(--backgroundLight)',
        padding: 'var(--spacing-large)',
        borderRadius: '8px',
        border: '2px solid var(--accent)'
      },
      layout: { mode: 'flow', gap: 'var(--spacing-medium)' },
      children: [
        {
          id: 'array-demo-title',
          type: 'atom',
          atomType: 'Text',
          order: 0,
          params: { content: 'Array Indexing & Fallbacks', tag: 'h3', color: 'var(--accent)', fontSize: '20px', fontWeight: 'bold' }
        },
        {
          id: 'first-product',
          type: 'atom',
          atomType: 'Text',
          order: 1,
          params: {
            // FIX: Use ternary operator
            content: 'First Product: {{ states["advanced-expression-section"].sampleProducts[0].name ? states["advanced-expression-section"].sampleProducts[0].name : "No Product" }}',
            fontSize: '16px',
            color: 'var(--textDark)'
          }
        },
        {
          id: 'current-product',
          type: 'atom',
          atomType: 'Text',
          order: 2,
          params: {
            // FIX: Use ternary operator
            content: 'Current Product: {{ states["advanced-expression-section"].sampleProducts[states["advanced-expression-section"].currentIndex].name ? states["advanced-expression-section"].sampleProducts[states["advanced-expression-section"].currentIndex].name : "Not Found" }}',
            fontSize: '16px',
            color: 'var(--textDark)'
          }
        },
        {
          id: 'out-of-bounds-product',
          type: 'atom',
          atomType: 'Text',
          order: 3,
          params: {
            // FIX: Use ternary operator
            content: 'Product #10: {{ states["advanced-expression-section"].sampleProducts[10] ? states["advanced-expression-section"].sampleProducts[10].name : "Out of bounds - fallback works!" }}',
            fontSize: '16px',
            color: 'black',
            fontWeight: 'bold'
          }
        }
      ]
    },
    // The rest of the section (comparisons, complex, controls) is already using correct syntax and does not need to be changed.
    {
      id: 'comparison-demo-container',
      type: 'section',
      order: 3,
      params: { backgroundColor: 'var(--backgroundLight)', padding: 'var(--spacing-large)', borderRadius: '8px', border: '2px solid var(--success)' },
      layout: { mode: 'flow', gap: 'var(--spacing-medium)' },
      children: [
        { id: 'comparison-demo-title', type: 'atom', atomType: 'Text', order: 0, params: { content: 'Advanced Comparisons', tag: 'h3', color: 'var(--success)', fontSize: '20px', fontWeight: 'bold' } },
        { id: 'score-comparison', type: 'atom', atomType: 'Text', order: 1, params: { content: 'Score Status: {{ states["advanced-expression-section"].userScore >= states["advanced-expression-section"].threshold ? "PASSED ✓" : "FAILED ✗" }}', fontSize: '16px', fontWeight: 'bold', color: '{{ states["advanced-expression-section"].userScore >= states["advanced-expression-section"].threshold ? "var(--success)" : "var(--error)" }}' } },
        { id: 'stock-status', type: 'atom', atomType: 'Text', order: 2, params: { content: 'First Product Stock: {{ states["advanced-expression-section"].sampleProducts[0].inStock ? "✓ In Stock" : "✗ Out of Stock" }}', fontSize: '16px', color: 'var(--textDark)' } },
        { id: 'rating-check', type: 'atom', atomType: 'Text', order: 3, params: { content: 'High Rating: {{ states["advanced-expression-section"].sampleProducts[1].rating > 4.5 ? "⭐ Excellent!" : "👍 Good" }}', fontSize: '16px', color: 'var(--textDark)' } }
      ]
    },
    {
      id: 'complex-demo-container',
      type: 'section',
      order: 4,
      params: { backgroundColor: 'var(--backgroundLight)', padding: 'var(--spacing-large)', borderRadius: '8px', border: '2px solid var(--warning)' },
      layout: { mode: 'flow', gap: 'var(--spacing-medium)' },
      children: [
        { id: 'complex-demo-title', type: 'atom', atomType: 'Text', order: 0, params: { content: 'Complex Nested Expressions', tag: 'h3', color: 'var(--warning)', fontSize: '20px', fontWeight: 'bold' } },
        { id: 'availability-summary', type: 'atom', atomType: 'Text', order: 1, params: { content: 'Summary: {{ states["advanced-expression-section"].sampleProducts[0].inStock && states["advanced-expression-section"].sampleProducts[0].price < 2000 ? "Affordable & Available!" : "Check other options" }}', fontSize: '16px', color: 'var(--textDark)' } },
        { id: 'price-range-check', type: 'atom', atomType: 'Text', order: 2, params: { content: 'Budget Category: {{ states["advanced-expression-section"].sampleProducts[0].price < 1500 ? "Budget" : (states["advanced-expression-section"].sampleProducts[0].price < 2500 ? "Mid-range" : "Premium") }}', fontSize: '16px', color: 'var(--textDark)' } }
      ]
    },
    {
      id: 'expression-controls',
      type: 'section',
      order: 5,
      params: { backgroundColor: 'var(--backgroundDark)', padding: 'var(--spacing-large)', borderRadius: '8px' },
      layout: { mode: 'flex', alignItems: 'center', gap: 'var(--spacing-medium)', flexWrap: 'wrap', justifyContent: 'center' },
      children: [
        { id: 'change-price-btn', type: 'atom', atomType: 'Button', order: 0, params: { content: 'Change Price to $49.99', backgroundColor: 'var(--primary)', color: 'white' }, eventHandlers: { onClick: [{ id: 'update-price', type: 'updateState', params: { targetNodeId: 'advanced-expression-section', updates: { samplePrice: 4999 } } }] } },
        { id: 'change-index-btn', type: 'atom', atomType: 'Button', order: 1, params: { content: 'Switch to Product #2', backgroundColor: 'var(--accent)', color: 'white' }, eventHandlers: { onClick: [{ id: 'update-index', type: 'updateState', params: { targetNodeId: 'advanced-expression-section', updates: { currentIndex: 1 } } }] } },
        { id: 'reset-demo-btn', type: 'atom', atomType: 'Button', order: 2, params: { content: 'Reset Demo', backgroundColor: 'var(--error)', color: 'white' }, eventHandlers: { onClick: [{ id: 'reset-demo', type: 'updateState', params: { targetNodeId: 'advanced-expression-section', updates: { samplePrice: 2999, currentIndex: 0 } } }] } }
      ]
    }
  ]
};

const moreStateDemosSection: SectionNode = {
  id: 'more-state-demos-section',
  type: 'section',
  order: 21,
  name: 'More State Demos',
  params: {
    padding: 'var(--spacing-xl)',
    backgroundColor: 'var(--backgroundLight)',
    margin: 'var(--spacing-large) 0',
    borderRadius: '12px',
    border: '2px solid var(--primary)'
  },
  layout: {
    mode: 'flow',
    maxWidth: '800px',
    margin: '0 auto',
    gap: 'var(--spacing-xl)'
  },
  children: [
    // Radio Group (unchanged, as we are debugging its engine)
    {
      id: 'radio-group-container',
      type: 'section',
      order: 0,
      name: 'Radio Group',
      state: { selectedValue: 'option1' },
      params: {},
      layout: { mode: 'flow', gap: 'var(--spacing-medium)' },
      children: [
        { id: 'radio-group-title', type: 'atom', atomType: 'Text', order: 0, params: { content: 'Radio Group State Demo', tag: 'h3' } },
        {
          id: 'radio-form-context', type: 'section', order: 1, isFormContext: true, htmlTag: 'div', params: {}, layout: { mode: 'flex', alignItems: 'center', gap: 'var(--spacing-large)' },
          children: [
            {
              id: 'radio-option-1-group', type: 'section', order: 0, params: {}, layout: { mode: 'flex', alignItems: 'center', gap: 'var(--spacing-small)' },
              children: [
                {
                  id: 'radio-input-1', type: 'atom', atomType: 'Input', order: 0,
                  params: { type: 'radio', name: 'demo-radio-group', value: 'option1', checked: "{{ states['radio-group-container'].selectedValue == 'option1' }}" },
                  eventHandlers: { onChange: [{ id: 'set-radio-state-1', type: 'updateState', params: { targetNodeId: 'radio-group-container', updates: { selectedValue: 'option1' } } }] }
                },
                { id: 'radio-label-1', type: 'atom', atomType: 'Text', order: 1, params: { content: 'Option 1' } }
              ]
            },
            {
              id: 'radio-option-2-group', type: 'section', order: 1, params: {}, layout: { mode: 'flex', alignItems: 'center', gap: 'var(--spacing-small)' },
              children: [
                {
                  id: 'radio-input-2', type: 'atom', atomType: 'Input', order: 0,
                  params: { type: 'radio', name: 'demo-radio-group', value: 'option2', checked: "{{ states['radio-group-container'].selectedValue == 'option2' }}" },
                  eventHandlers: { onChange: [{ id: 'set-radio-state-2', type: 'updateState', params: { targetNodeId: 'radio-group-container', updates: { selectedValue: 'option2' } } }] }
                },
                { id: 'radio-label-2', type: 'atom', atomType: 'Text', order: 1, params: { content: 'Option 2' } }
              ]
            }
          ]
        },
        { id: 'radio-preview-text', type: 'atom', atomType: 'Text', order: 2, params: { content: "Container state `selectedValue` is: {{ states['radio-group-container'].selectedValue }}", fontFamily: 'monospace' } }
      ]
    },
    // Collapsible
    {
      id: 'collapsible-container', type: 'section', order: 1, name: 'Collapsible Container', state: { isExpanded: false }, params: {}, layout: { mode: 'flow', gap: 'var(--spacing-medium)', padding: 'var(--spacing-medium)' },
      children: [
        {
          id: 'collapsible-header',
          type: 'section',
          order: 0,
          // FIX IS HERE: `cursor` is a style property, so it goes in `params`.
          params: {
            cursor: 'pointer',
            border: '1px solid #ccc',
            borderRadius: '8px'
          },
          layout: {
            mode: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          },
          eventHandlers: { onClick: [{ id: 'action-expand', type: 'updateState', params: { targetNodeId: 'collapsible-container', updates: { isExpanded: true } }, conditions: [{ contextPath: "states['collapsible-container'].isExpanded", operator: 'equals', value: false }] }, { id: 'action-collapse', type: 'updateState', params: { targetNodeId: 'collapsible-container', updates: { isExpanded: false } }, conditions: [{ contextPath: "states['collapsible-container'].isExpanded", operator: 'equals', value: true }] }] },
          children: [
            { id: 'collapsible-title', type: 'atom', atomType: 'Text', order: 0, params: { content: 'Click Me to Toggle', tag: 'h3' } },
            { id: 'collapsible-icon', type: 'atom', atomType: 'Text', order: 1, params: { content: '▶' }, visibility: { conditions: [{ contextPath: "states['collapsible-container'].isExpanded", operator: 'equals', value: false }] } },
            { id: 'collapsible-icon-expanded', type: 'atom', atomType: 'Text', order: 2, params: { content: '▼' }, visibility: { conditions: [{ contextPath: "states['collapsible-container'].isExpanded", operator: 'equals', value: true }] } }
          ]
        },
        {
          id: 'collapsible-content', type: 'section', order: 1,
          params: {},
          layout: { mode: 'flow' },
          visibility: { conditions: [{ contextPath: "states['collapsible-container'].isExpanded", operator: 'equals', value: true }] },
          children: [{ id: 'collapsible-text', type: 'atom', atomType: 'Text', order: 0, params: { content: 'This is the hidden content that appears when the section is expanded.' } }]
        }
      ]
    }
  ]
};

  const primitiveSceneSection: SectionNode = {
    id: 'primitive_scene_section',
    type: 'section',
    order: 9, 
    name: 'Primitive 3D Scene',
    params: {
      backgroundColor: '#1a1a2e' // A nice dark blue
    },
    layout: {
      mode: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '600px',
      padding: 'var(--spacing-large)',
    },
    children: [
      {
        id: 'primitive_scene_atom',
        type: 'atom',
        atomType: 'ThreeJSScene',
        order: 0,
        name: 'Abstract Scene',
        params: {
          sceneSetup: {
            cameraPosition: [0, 0, 7],
            backgroundColor: "#1a1a2e"
          },
          objects: [
            {
              id: 'central_sphere',
              type: 'sphere',
              position: [0, 0, 0],
              scale: [1.2, 1.2, 1.2],
              material: {
                type: 'standard',
                color: '#e94560' // A vibrant pink
              },
              animations: [
                {
                  id: 'spinY',
                  property: 'rotation.y',
                  loopType: 'repeat',
                  durationMs: 15000, 
                  keyframes: [{ time: 0, value: 0 }, { time: 1, value: 6.28318 }]
                }
              ]
            },
            {
              id: 'orbiting_torus',
              type: 'torus',
              position: [0, 0, 0],
              scale: [2.5, 2.5, 2.5],
              rotation: [1.57, 0, 0], // Rotate it to be flat
              material: {
                type: 'standard',
                color: '#0f3460' // A contrasting blue
              },
              animations: [
                {
                  id: 'spinZ',
                  property: 'rotation.z',
                  loopType: 'repeat',
                  durationMs: 10000, 
                  keyframes: [{ time: 0, value: 0 }, { time: 1, value: -6.28318 }]
                }
              ]
            }
          ],
          enableControls: true
        },
        positioning: {
          width: "100%",
          height: "100%"
        }
      } as AtomNode
    ]
  };

  const modalDemoSection: SectionNode = {
    id: 'modal-demo-section',
    type: 'section',
    order: 18,
    name: 'Interactive Modal Demo',
    params: {
      padding: 'var(--spacing-xl)',
      backgroundColor: 'var(--backgroundDark)',
      color: 'var(--textLight)',
      margin: 'var(--spacing-large) 0',
      borderRadius: '12px',
      border: '2px solid var(--secondary)'
    },
    layout: {
      mode: 'flow',
      maxWidth: '800px',
      margin: '0 auto',
      gap: 'var(--spacing-medium)',
      alignItems: 'center'
    },
    children: [
        {
            id: 'modal-demo-title',
            type: 'atom',
            atomType: 'Text',
            order: 0,
            params: {
              content: 'Interactive Modal (Actions Demo)',
              tag: 'h2',
              fontSize: '32px',
              textAlign: 'center',
              margin: '0 0 var(--spacing-large) 0'
            }
        },
        {
            id: 'open-modal-button',
            type: 'atom',
            atomType: 'Button',
            order: 1,
            params: {
                content: 'Open Modal',
                buttonType: 'button'
            },
            eventHandlers: {
                onClick: [{
                    id: 'action-open-modal',
                    type: 'openModal',
                    params: {
                        modalNodeId: 'demo-modal'
                    }
                }]
            }
        }
    ]
};

const demoModal: SectionNode = {
    id: 'demo-modal',
    type: 'section',
    order: 99, // Render it last in the DOM, but z-index will control visibility
    name: 'Demo Modal',
    params: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)'
    },
    visibility: {
        hidden: true
    },
    positioning: {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        zIndex: 2000
    },
    layout: {
        mode: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    },
    children: [
        {
            id: 'modal-content-area',
            type: 'section',
            order: 0,
            params: {
                backgroundColor: 'var(--backgroundLight)',
                padding: 'var(--spacing-xl)',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                width: 'clamp(300px, 80vw, 500px)'
            },
            layout: {
                mode: 'flow',
                gap: 'var(--spacing-medium)',
                alignItems: 'center'
            },
            children: [
                {
                    id: 'modal-title',
                    type: 'atom',
                    atomType: 'Text',
                    order: 0,
                    params: {
                        content: 'This is a Modal!',
                        tag: 'h3',
                        fontSize: '24px',
                        textAlign: 'center'
                    }
                },
                {
                    id: 'modal-body-text',
                    type: 'atom',
                    atomType: 'Text',
                    order: 1,
                    params: {
                        content: 'You triggered this modal using an OSDL action. You can close it by clicking the button below.',
                        textAlign: 'center'
                    }
                },
                {
                    id: 'close-modal-button',
                    type: 'atom',
                    atomType: 'Button',
                    order: 2,
                    params: {
                        content: 'Close',
                        buttonType: 'button'
                    },
                    eventHandlers: {
                        onClick: [{
                            id: 'action-close-modal',
                            type: 'closeModal',
                            params: {
                                modalNodeId: 'demo-modal'
                            }
                        }]
                    }
                }
            ]
        }
    ]
};

const rqlHelloSection: SectionNode = {
  id: "rql_hello_section",
  name: "RQL Hello Test",
  type: "section",
  order: 109,
  params: {
    padding: "2rem",
    backgroundColor: "var(--backgroundSubtle)"
  },
  layout: {
    mode: "flow",
  },
  children: [
    {
      id: "rql_hello_text_wrapper",
      type: "atom",
      atomType: "Text",
      order: 1,
      name: "RQL hello text",
      params: {
        tag: "h2",
        content: "Message from RQL Backend: {{ nodeData.greeting.hello.message }}"
      },
      loadingBehavior: {
        skeletonConfig: {
          lines: 1,
          shape: "text",
          width: "400px"
        },
        placeholderType: "skeleton"
      },
      dataRequirements: [
        {
          key: "greeting",
          source: {
            type: "rql",
            queries: {
              hello: {
                contract: "hello",
                select: {
                  message: true
                },
              }
            }
          },
          blocking: true
        }
      ]
    } as AtomNode
  ]
};

const rqlFeaturedProductSection: SectionNode = {
  id: "rql_featured_product_section",
  name: "RQL Featured Product",
  type: "section",
  order: 110,
  params: {
    backgroundColor: "var(--backgroundLight)"
  },
  layout: {
    gap: "1rem",
    mode: "flex",
    padding: "2rem",
    direction: "row",
    alignItems: "center"
  },
  children: [
    {
      id: "featured_product_image",
      type: "atom",
      atomType: "Image",
      order: 1,
      name: "Featured Product Image",
      params: {
        alt: "{{ nodeData.product.getPublicProduct.name }}",
        src: "{{ nodeData.product.getPublicProduct.images[0] }}",
        objectFit: "cover"
      },
      positioning: {
        width: "300px",
        height: "300px"
      },
      loadingBehavior: {
        placeholderType: 'skeleton',
        skeletonConfig: { shape: 'rect' }
      }
    } as AtomNode,
    {
      id: "featured_product_details",
      type: "section",
      order: 2,
      name: "Featured Product Details",
      params: {},
      layout: {
        gap: "0.5rem",
        mode: "flow"
      },
      children: [
        {
          id: "featured_product_name",
          type: "atom",
          atomType: "Text",
          order: 1,
          name: "Featured Product Name",
          params: {
            tag: "h3",
            content: "{{ nodeData.product.getPublicProduct.name }}",
            fontSize: "1.5rem"
          },
        } as AtomNode,
        {
          id: "featured_product_price",
          type: "atom",
          atomType: "Text",
          order: 2,
          name: "Featured Product Price",
          params: {
            content: "Price: {{ nodeData.product.getPublicProduct.price }} cents"
          },
        } as AtomNode,
        {
          id: "featured_product_desc",
          type: "atom",
          atomType: "Text",
          order: 3,
          name: "Featured Product Description",
          params: {
            content: "{{ nodeData.product.getPublicProduct.description }}",
            maxWidth: "500px"
          },
        } as AtomNode
      ]
    } as SectionNode
  ],
  loadingBehavior: {
    skeletonConfig: {
      shape: "rect",
      width: "100%",
      height: "300px"
    },
    placeholderType: "skeleton"
  },
  dataRequirements: [
    {
      key: "product",
      source: {
        type: "rql",
        queries: {
          getPublicProduct: {
            contract: "getPublicProduct",
            params: {
              productId: "6f3a16d3-4c3a-4591-be43-d8e9f6150b13"
            },
            select: {
              name: true,
              price: true,
              images: true,
              description: true
            },
          }
        }
      },
      blocking: true
    }
  ]
};

const rqlProductGridSection: SectionNode = {
  id: "rql_product_grid_section",
  name: "RQL Product Grid",
  type: "section",
  order: 111,
  params: {
    padding: "2rem"
  },
  layout: {
    gap: "1rem",
    mode: "flow",
  },
  children: [
    {
      id: "grid_title",
      type: "atom",
      atomType: "Text",
      order: 1,
      name: "Grid Title",
      params: {
        tag: "h2",
        content: "More Products"
      }
    } as AtomNode,
    {
      id: "product_grid_container",
      type: "section",
      order: 2,
      name: "Product Grid Container",
      params: {},
      layout: {
        mode: "grid",
        gap: "1rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))"
      },
      children: [
        ...Array.from({ length: 4 }, (_, i) => ({
          id: `product-card-${i}`,
          type: 'section',
          order: i,
          name: `Product Card ${i}`,
          params: {
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden'
          },
          visibility: {
            conditions: [
              {
                contextPath: `nodeData.productList.listPublicProducts[${i}]`,
                operator: 'exists',
              },
            ],
          },
          layout: { mode: 'flow' },
          children: [
            {
              id: `product-image-${i}`,
              type: 'atom',
              atomType: 'Image',
              order: 0,
              name: `Product Image ${i}`,
              params: {
                src: `{{ nodeData.productList.listPublicProducts[${i}].imageUrl }}`,
                alt: `{{ nodeData.productList.listPublicProducts[${i}].name }}`,
                height: '200px',
                width: '100%',
                objectFit: 'cover'
              }
            } as AtomNode,
            {
              id: `product-info-${i}`,
              type: 'section',
              order: 1,
              name: `Product Info ${i}`,
              params: { padding: '1rem' },
              layout: { mode: 'flow', gap: '0.5rem' },
              children: [
                {
                  id: `product-name-${i}`,
                  type: 'atom',
                  atomType: 'Text',
                  order: 0,
                  name: `Product Name ${i}`,
                  params: {
                    tag: 'h3',
                    content: `{{ nodeData.productList.listPublicProducts[${i}].name }}`,
                    fontSize: '1.1rem'
                  }
                } as AtomNode,
                {
                  id: `product-price-${i}`,
                  type: 'atom',
                  atomType: 'Text',
                  order: 1,
                  name: `Product Price ${i}`,
                  params: {
                    content: `Price: {{ nodeData.productList.listPublicProducts[${i}].price }} cents`
                  }
                } as AtomNode
              ]
            } as SectionNode
          ]
        } as SectionNode))
      ]
    } as SectionNode
  ],
  loadingBehavior: {
    placeholderType: "spinner"
  },
  dataRequirements: [
    {
      key: "productList",
      source: {
        type: "rql",
        queries: {
          listPublicProducts: {
            contract: "listPublicProducts",
            params: {
              limit: 4
            },
            select: {
              id: true,
              name: true,
              price: true,
              imageUrl: true
            },
          }
        }
      },
      blocking: true
    }
  ]
};

// Test repeater using states as source
const stateBasedRepeaterSection: SectionNode = {
  id: "state_repeater_test",
  name: "State-Based Repeater Test",
  type: "section",
  order: 113,
  layout: {
    gap: "1rem",
    mode: "flow"
  },
  params: {
    padding: "2rem",
    border: "2px solid red"
  },
  state: {
    localProducts: [
      { name: 'Local Widget A', price: 1500, inStock: true, rating: 4.2 },
      { name: 'Local Gadget B', price: 2500, inStock: false, rating: 4.7 }
    ]
  },
  children: [
    {
      id: "state_repeater_title",
      name: "State Repeater Title",
      type: "atom",
      order: 1,
      params: {
        tag: "h2",
        content: "Products from State (Repeater Test)"
      },
      atomType: "Text"
    } as AtomNode,
    {
      id: "state_repeater_container",
      name: "State Repeater Container",
      type: "section",
      order: 2,
      layout: {
        gap: "1rem",
        mode: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))"
      },
      params: {},
      children: [],
      repeater: {
        source: "state.localProducts",
        template: {
          id: "state_product_card_template",
          name: "State Product Card Template",
          type: "section",
          order: 0,
          layout: {
            mode: "flow"
          },
          params: {
            border: "1px solid #eee",
            overflow: "hidden",
            borderRadius: "8px",
            backgroundColor: "#fff",
            padding: "1rem"
          },
          children: [
            {
              id: "state_product_name",
              name: "State Product Name",
              type: "atom",
              order: 0,
              params: {
                tag: "h3",
                content: "{{ item.name }} (from state)",
                fontSize: "1.1rem",
                color: "green"
              },
              atomType: "Text"
            } as AtomNode,
            {
              id: "state_product_price",
              name: "State Product Price",
              type: "atom",
              order: 1,
              params: {
                content: "Price: ${{ item.price / 100 }}",
                color: "blue"
              },
              atomType: "Text"
            } as AtomNode,
            {
              id: "state_product_stock",
              name: "State Product Stock",
              type: "atom",
              order: 2,
              params: {
                content: "Stock: {{ item.inStock ? '✓ In Stock' : '✗ Out of Stock' }}",
                color: "{{ item.inStock ? 'green' : 'red' }}"
              },
              atomType: "Text"
            } as AtomNode
          ]
        }
      }
    } as SectionNode
  ]
};

const productGridWithRepeaterSection: SectionNode = {
  id: "product_grid_with_repeater",
  name: "Product Grid (Repeater)",
  type: "section",
  order: 112,
  layout: {
    gap: "1rem",
    mode: "flow"
  },
  params: {
    padding: "2rem"
  },
  children: [
    {
      id: "repeater_grid_title",
      name: "Grid Title",
      type: "atom",
      order: 1,
      params: {
        tag: "h2",
        content: "More Products (from Repeater)"
      },
      atomType: "Text"
    } as AtomNode,
    {
      id: "product_repeater_container",
      name: "Product Grid Container",
      type: "section",
      order: 2,
      layout: {
        gap: "1rem",
        mode: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))"
      },
      params: {},
      children: [],
      repeater: {
        source: "nodeData.productList.listPublicProducts.products",
        template: {
          id: "product_card_template",
          name: "Product Card Template",
          type: "section",
          order: 0,
          layout: {
            mode: "flow"
          },
          params: {
            border: "1px solid #eee",
            overflow: "hidden",
            borderRadius: "8px",
            backgroundColor: "#fff"
          },
          children: [
            {
              id: "product_image",
              name: "Product Image",
              type: "atom",
              order: 0,
              params: {
                alt: "{{ item.name }}",
                src: "{{ item.images[0] }}",
                width: "100%",
                height: "200px",
                objectFit: "cover"
              },
              atomType: "Image"
            } as AtomNode,
            {
              id: "product_info",
              name: "Product Info",
              type: "section",
              order: 1,
              layout: {
                gap: "0.5rem",
                mode: "flow"
              },
              params: {
                padding: "1rem"
              },
              children: [
                {
                  id: "product_name",
                  name: "Product Name",
                  type: "atom",
                  order: 0,
                  params: {
                    tag: "h3",
                    content: "{{ item.name }}",
                    fontSize: "1.1rem"
                  },
                  atomType: "Text"
                } as AtomNode,
                {
                  id: "product_price",
                  name: "Product Price",
                  type: "atom",
                  order: 1,
                  params: {
                    content: "Price: {{ item.price }} {{ item.currency }}"
                  },
                  atomType: "Text"
                } as AtomNode
              ]
            } as SectionNode
          ],
          interactionStates: {
            hover: {
              transition: {
                easing: "ease-in-out",
                durationMs: 250,
                properties: [
                  "transform",
                  "box-shadow"
                ]
              },
              inlineStyles: {
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                transform: "scale(1.03)"
              }
            }
          }
        }
      }
    } as SectionNode
  ],
  loadingBehavior: {
    placeholderType: "spinner",
    minLoaderDurationMs: 500
  },
  dataRequirements: [
    {
      key: "productList",
      source: {
        type: "rql",
        queries: {
          listPublicProducts: {
            params: {
              limit: 12
            },
            select: {
              products: true
            },
            contract: "products.get"
          }
        }
      },
      blocking: true
    }
  ]
};

const mainContentSection: SectionNode = {
    id: 'main-content-section',
    type: 'section',
    name: 'Main Content Area',
    order: 1,
    params: { 
      backgroundColor: 'var(--backgroundLight)',
      background: 'linear-gradient(135deg, var(--backgroundLight) 0%, var(--backgroundSubtle) 100%)'
    },
    layout: { 
      mode: 'flow', 
      padding: 'var(--spacing-xl) var(--spacing-large)', 
      minHeight: 'calc(100vh - 160px - 100px)', 
      width: '100%' 
    },
    children: [
      { 
        id: 'hero-content-container', 
        type: 'section', 
        order: 0, 
        params: {
          backgroundColor: 'rgba(255,255,255,0.8)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          padding: 'var(--spacing-xl)'
        }, 
        layout: { 
          mode: 'flow', 
          maxWidth: '1200px', 
          margin: 'var(--spacing-medium) auto var(--spacing-xl) auto' 
        }, 
        children: [heroImage, heroTitle, heroSubtitle] 
      } as SectionNode,
      { ...flexWrapTestSection, order: 1 },
      { ...columnAndGridTestSection, order: 2 },
      { ...flowTestSection, order: 3 },
      relatedProductsSection, // NEW: Blocking data requirements demo
      userReviewsSection, // NEW: Non-blocking data requirements demo
      combinedDataSection, // NEW: Multiple data requirements demo
      testCallToActionComponent,
      { 
        id: 'test-progress-bar', 
        type: 'atom', 
        atomType: 'ProgressBar', 
        order: 8, 
        params: { 
          value: 65, 
          max: 100, 
          barColor: 'var(--accent)', 
          trackColor: 'var(--backgroundDark)', 
          width: '80%', 
          height: '20px', 
          borderRadius: 'var(--spacing-small)' 
        }, 
        positioning: { 
          margin: 'var(--spacing-large) auto' 
        } 
      } as AtomNode,
      fullScreenHeroSection,
      marqueeSection,
      scrollingStorySection,
      interactiveGridSection,
      conditionalContentSection,
      viewportDependentSection,
      // primitiveSceneSection,
      customComponentSection,
      otherCodeBlocksSection,
      actionsAndFormSection,
	  stateDemoSection,
	  advancedExpressionSection,
	moreStateDemosSection,
      modalDemoSection,
      rqlHelloSection,
      rqlFeaturedProductSection,
      rqlProductGridSection,
      productGridWithRepeaterSection,
    ].filter(item => item.id !== 'showcase-section').sort((a,b) => a.order - b.order),
  };
  
  const footerText: AtomNode = {
    id: 'footer-text',
    type: 'atom',
    atomType: 'Text',
    order: 0,
    name: 'Copyright Text',
    params: { content: '© 2024 OkiynaiShops • Experience the Future of Design • All Rights Reserved', fontSize: '14px', textAlign: 'center', color: 'var(--textLight)', fontFamily: 'var(--font-body)' }
  };

  const footerSection: SectionNode = {
    id: 'footer-section',
    type: 'section',
    name: 'Page Footer',
    order: 2,
    params: { backgroundColor: 'var(--backgroundDark)', color: 'var(--textLight)', boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -2px rgba(0, 0, 0, 0.1)' },
    layout: { mode: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'var(--spacing-large) var(--spacing-xl)', height: '100px', width: '100%' },
    children: [footerText as AtomNode]
  };

  // Test repeater using external states with fallback
  const externalStateBasedRepeaterSection: SectionNode = {
    id: "external_state_repeater_test",
    name: "External State-Based Repeater Test",
    type: "section",
    order: 114,
    layout: {
      gap: "1rem",
      mode: "flow"
    },
    params: {
      padding: "2rem",
      border: "2px solid blue"
    },
    state: {
      fallbackProducts: [
        { name: 'Fallback Widget X', price: 1800, inStock: true, rating: 4.0 },
        { name: 'Fallback Gadget Y', price: 2200, inStock: true, rating: 4.5 }
      ]
    },
    children: [
      {
        id: "external_state_repeater_title",
        name: "External State Repeater Title",
        type: "atom",
        order: 1,
        params: {
          tag: "h2",
          content: "Products from External State (with fallback)"
        },
        atomType: "Text"
      } as AtomNode,
      {
        id: "external_state_repeater_container",
        name: "External State Repeater Container",
        type: "section",
        order: 2,
        layout: {
          gap: "1rem",
          mode: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))"
        },
        params: {},
        children: [],
        repeater: {
          source: "states[\"advanced-expression-section\"].sampleProducts",
          template: {
            id: "external_state_product_card_template",
            name: "External State Product Card Template",
            type: "section",
            order: 0,
            layout: {
              mode: "flow"
            },
            params: {
              border: "1px solid #eee",
              overflow: "hidden",
              borderRadius: "8px",
              backgroundColor: "#fff",
              padding: "1rem"
            },
            children: [
              {
                id: "external_state_product_name",
                name: "External State Product Name",
                type: "atom",
                order: 0,
                params: {
                  tag: "h3",
                  content: "{{ item.name }} (external state)",
                  fontSize: "1.1rem",
                  color: "purple"
                },
                atomType: "Text"
              } as AtomNode,
              {
                id: "external_state_product_price",
                name: "External State Product Price",
                type: "atom",
                order: 1,
                params: {
                  content: "Price: ${{ item.price / 100 }}",
                  color: "purple"
                },
                atomType: "Text"
              } as AtomNode
            ]
          }
        }
      } as SectionNode
    ]
  };

  const pageNodes: Node[] = [headerSection, mainContentSection, footerSection, demoModal, stateBasedRepeaterSection, externalStateBasedRepeaterSection];

  const mockPageDefinition: PageDefinition = {
    id: 'test-page-data-binding-v1',
    schemaVersion: 'osdl_v3.1',
    name: 'Okiynai Data Binding Test',
    route: '/test-data-binding',
    pageType: 'dynamic',
    dataSource: productPageDataSource, 
    nodes: pageNodes,
  };
  return mockPageDefinition;
} 
