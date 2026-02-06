import { PageDefinition, AtomNode, SectionNode, Node, DataSourceConfig, ComponentNode } from "@/OSDL.types";

export const getBrandBreederDemo = (routeParams: Record<string, string>): PageDefinition => {
  
  // Header with logo and navigation
  const headerSection: SectionNode = {
    id: 'header-section',
    type: 'section',
    name: 'Brand Breeder Header',
    order: 0,
    params: { 
      backgroundColor: '#f8f6f0',
      borderBottom: '1px solid #000'
    },
    layout: {
      mode: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 25px',
      height: '60px',
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
        id: 'brand-logo',
        type: 'atom',
        atomType: 'Text',
        order: 0,
        name: 'Brand Breeder Logo',
        params: {
          content: 'BRAND BREEDER', 
          tag: 'h1',
          fontSize: '18px',
          fontWeight: 'bold',
          fontFamily: 'serif',
          color: '#2c2c2c',
          letterSpacing: '1.5px'
        },
        localeOverrides: {
          'es-ES': {
            params: {
              content: 'CRIADOR DE MARCAS'
            }
          }
        }
      } as AtomNode,
      {
        id: 'header-nav',
        type: 'section',
        order: 1,
        name: 'Header Navigation',
        params: {},
        layout: {
          mode: 'flex',
          gap: '30px', 
          alignItems: 'center'
        },
        children: [
          { id: 'nav-news', type: 'atom', atomType: 'Button', order: 0, params: { content: 'NEWS', tag: 'a', href: '#news', fontSize: '12px', color: '#666', padding: '4px 0', backgroundColor: 'transparent', border: 'none', letterSpacing: '1px', fontWeight: '500' } } as AtomNode,
          { id: 'header-separator', type: 'atom', atomType: 'Text', order: 1, params: { content: '|', fontSize: '16px', color: '#ccc', margin: '0 15px' } } as AtomNode,
          { id: 'header-icon', type: 'atom', atomType: 'Text', order: 2, params: { content: '🐄', fontSize: '20px' } } as AtomNode
        ]
      } as SectionNode
    ]
  };

  // Main content container - with proper border styling
  const mainContentSection: SectionNode = {
    id: 'main-content',
    type: 'section',
    name: 'Main Content Area',
    order: 1,
    params: { 
      backgroundColor: '#f8f6f0'
    },
    layout: {
      mode: 'grid',
      gridTemplateColumns: '2fr 1fr',
	  gridTemplateRows: '1fr',
      height: 'calc(80vh - 120px)',
      gap: '0'
    },
    children: [
      // Left side - Video section
      {
        id: 'video-section',
        type: 'section',
        order: 0,
        name: 'Brand Video Section',
        params: {
          backgroundColor: '#f8f6f0',
          border: '1px solid #000',
          borderRight: '0.5px solid #000',
          position: 'relative',
          overflow: 'hidden'
        },
        layout: {
          mode: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0',
		  width: '100%',
		  height: '100%',
        },
        positioning: {
          position: 'relative'
        },
        children: [
          // Video element
          {
            id: 'brand-video',
            type: 'atom',
            atomType: 'Video',
            order: 0,
            params: {
              src: 'https://cdn.sanity.io/files/tduq6a61/production/eb1464783807f72a5e8da096e949e5c7ae7de2d3.mp4',
              autoplay: true,
              loop: true,
              muted: true,
              playsInline: true,
              controls: false,
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }
          } as AtomNode
        ]
      } as SectionNode,

      // Right side - News sections stacked vertically
      {
        id: 'news-sections',
        type: 'section',
        order: 1,
        name: 'News Sections',
        params: {},
        layout: {
          mode: 'flex',
          direction: 'column',
          gap: '0'
        },
        children: [
          // Top news section - Eclipse
          {
            id: 'eclipse-section',
            type: 'section',
            order: 0,
            name: 'Eclipse News Section',
            params: {
              backgroundColor: '#f8f6f0',
              border: '1px solid #000',
              borderBottom: '0.5px solid #000',
              position: 'relative',
              overflow: 'hidden'
            },
            layout: {
              mode: 'flex',
              direction: 'column',
              justifyContent: 'center',
              padding: '30px',
              height: '50%'
            },
            positioning: {
              position: 'relative'
            },
            children: [
              // Yellow overlay that slides from bottom
              {
                id: 'eclipse-yellow-overlay',
                type: 'atom',
                atomType: 'Text',
                order: 0,
                params: {
                  content: '',
                  backgroundColor: '#e6b800',
                  opacity: '0',
                  transform: 'translateY(100%)'
                },
                positioning: {
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  zIndex: 1
                },
                animations: [
                  {
                    id: 'eclipse-overlay-in',
                    trigger: { type: 'hover', targetElementId: 'eclipse-section' },
                    keyframes: [
                      { offset: 0, styles: { opacity: 0, transform: 'translateY(100%)' } },
                      { offset: 1, styles: { opacity: 0.9, transform: 'translateY(0%)' } }
                    ],
                    timing: { durationMs: 400, easing: 'ease-out', fillMode: 'forwards' }
                  }
                ]
              } as AtomNode,
              {
                id: 'eclipse-content-wrapper',
                type: 'section',
                order: 1,
                name: 'Eclipse Content Wrapper',
                params: {},
                layout: {
                  mode: 'flex',
                  direction: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  width: '100%'
                },
                positioning: { zIndex: 2 },
                children: [
                  {
                    id: 'eclipse-top-content',
                    type: 'section',
                    order: 0,
                    name: 'Eclipse Top Content',
                    params: {},
                    layout: {
                      mode: 'flex',
                      direction: 'column',
                      alignItems: 'flex-start'
                    },
                    children: [
                      {
                        id: 'eclipse-news-tag',
                        type: 'atom',
                        atomType: 'Text',
                        order: 0,
                        params: {
                          content: 'NEWS',
                          fontSize: '14px',
                          color: '#666',
                          letterSpacing: '1px',
                          fontWeight: '500',
                          margin: '0 0 15px 0'
                        }
                      } as AtomNode,
                      {
                        id: 'eclipse-title',
                        type: 'atom',
                        atomType: 'Text',
                        order: 1,
                        params: {
                          content: 'ECLIPSE promoted among the 10 Italian Gins of the Summer!',
                          fontSize: '28px',
                          color: '#2c2c2c',
                          lineHeight: '1.3',
                          fontWeight: '500'
                        }
                      } as AtomNode
                    ]
                  } as SectionNode,
                  {
                    id: 'eclipse-bottom-content',
                    type: 'section',
                    order: 1,
                    name: 'Eclipse Bottom Content',
                    params: {},
                    layout: {
                      mode: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'flex-end',
                      width: '100%'
                    },
                    children: [
                      {
                        id: 'eclipse-date',
                        type: 'atom',
                        atomType: 'Text',
                        order: 0,
                        params: {
                          content: '04/08/2022',
                          fontSize: '14px',
                          color: '#666',
                          letterSpacing: '0.5px'
                        }
                      } as AtomNode
                    ]
                  } as SectionNode
                ]
              } as SectionNode
            ]
          } as SectionNode,

          // Bottom news section - Avamposti
          {
            id: 'avamposti-section',
            type: 'section',
            order: 1,
            name: 'Avamposti News Section',
            params: {
              backgroundColor: '#f8f6f0',
              border: '1px solid #000',
              borderTop: '0.5px solid #000',
              position: 'relative',
              overflow: 'hidden'
            },
            layout: {
              mode: 'flex',
              direction: 'column',
              justifyContent: 'center',
              padding: '30px',
              height: '50%'
            },
            positioning: {
              position: 'relative'
            },
            children: [
              // Yellow overlay that slides from top
              {
                id: 'avamposti-yellow-overlay',
                type: 'atom',
                atomType: 'Text',
                order: 0,
                params: {
                  content: '',
                  backgroundColor: '#e6b800',
                  opacity: '0',
                  transform: 'translateY(-100%)'
                },
                positioning: {
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  zIndex: 1
                },
                animations: [
                  {
                    id: 'avamposti-overlay-in',
                    trigger: { type: 'hover', targetElementId: 'avamposti-section' },
                    keyframes: [
                      { offset: 0, styles: { opacity: 0, transform: 'translateY(-100%)' } },
                      { offset: 1, styles: { opacity: 0.9, transform: 'translateY(0%)' } }
                    ],
                    timing: { durationMs: 400, easing: 'ease-out', fillMode: 'forwards' }
                  }
                ]
              } as AtomNode,
              {
                id: 'avamposti-content-wrapper',
                type: 'section',
                order: 1,
                name: 'Avamposti Content Wrapper',
                params: {},
                layout: {
                  mode: 'flex',
                  direction: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  width: '100%'
                },
                positioning: { zIndex: 2 },
                children: [
                  {
                    id: 'avamposti-top-content',
                    type: 'section',
                    order: 0,
                    name: 'Avamposti Top Content',
                    params: {},
                    layout: {
                      mode: 'flex',
                      direction: 'column',
                      alignItems: 'flex-start'
                    },
                    children: [
                      {
                        id: 'avamposti-news-tag',
                        type: 'atom',
                        atomType: 'Text',
                        order: 0,
                        params: {
                          content: 'NEWS',
                          fontSize: '14px',
                          color: '#666',
                          letterSpacing: '1px',
                          fontWeight: '500',
                          margin: '0 0 15px 0'
                        }
                      } as AtomNode,
                      {
                        id: 'avamposti-title',
                        type: 'atom',
                        atomType: 'Text',
                        order: 1,
                        params: {
                          content: 'Avamposti, the new trends in Wine & Spirits by Spazio Di Paolo.',
                          fontSize: '28px',
                          color: '#2c2c2c',
                          lineHeight: '1.3',
                          fontWeight: '500'
                        }
                      } as AtomNode
                    ]
                  } as SectionNode,
                  {
                    id: 'avamposti-bottom-content',
                    type: 'section',
                    order: 1,
                    name: 'Avamposti Bottom Content',
                    params: {},
                    layout: {
                      mode: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'flex-end',
                      width: '100%'
                    },
                    children: [
                      {
                        id: 'avamposti-date',
                        type: 'atom',
                        atomType: 'Text',
                        order: 0,
                        params: {
                          content: '05/08/2022',
                          fontSize: '14px',
                          color: '#666',
                          letterSpacing: '0.5px'
                        }
                      } as AtomNode
                    ]
                  } as SectionNode
                ]
              } as SectionNode
            ]
          } as SectionNode
        ]
      } as SectionNode
    ]
  };

  // Product Grid Section with door-opening effects
  const productGridSection: SectionNode = {
    id: 'product-grid',
    type: 'section',
    order: 3,
    name: 'Product Grid',
    params: {
      backgroundColor: '#f8f6f0',
      borderTop: '1px solid #000'
    },
    layout: {
      mode: 'flex',
      direction: 'row',
      gap: '0'
    },
    children: [
      // Tall section on the left
      {
        id: 'tall-album-section',
        type: 'section',
        order: 0,
        name: 'Album di Famiglia',
        params: {
          backgroundColor: '#f8f6f0',
          border: '1px solid #000',
          position: 'relative',
          overflow: 'hidden',
          width: '50%',
          height: '800px'
        },
        layout: {
          mode: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        },
        positioning: { position: 'relative' },
        children: [
          // Door overlay (splits and opens from center)
          {
            id: 'album-door-left',
            type: 'atom',
            atomType: 'Text',
            order: 0,
            params: {
              content: '',
              backgroundColor: '#2c2c2c',
              transform: 'translateX(0%)'
            },
            positioning: {
              position: 'absolute',
              top: '0',
              left: '0',
              width: '50%',
              height: '100%',
              zIndex: 3
            },
            animations: [{
              id: 'album-door-left-open',
              trigger: { type: 'hover', targetElementId: 'tall-album-section' },
              keyframes: [
                { offset: 0, styles: { transform: 'translateX(0%)' } },
                { offset: 1, styles: { transform: 'translateX(-100%)' } }
              ],
              timing: { durationMs: 600, easing: 'ease-out', fillMode: 'forwards' }
            }]
          } as AtomNode,
          {
            id: 'album-door-right',
            type: 'atom',
            atomType: 'Text',
            order: 1,
            params: {
              content: '',
              backgroundColor: '#2c2c2c',
              transform: 'translateX(0%)'
            },
            positioning: {
              position: 'absolute',
              top: '0',
              right: '0',
              width: '50%',
              height: '100%',
              zIndex: 3
            },
            animations: [{
              id: 'album-door-right-open',
              trigger: { type: 'hover', targetElementId: 'tall-album-section' },
              keyframes: [
                { offset: 0, styles: { transform: 'translateX(0%)' } },
                { offset: 1, styles: { transform: 'translateX(100%)' } }
              ],
              timing: { durationMs: 600, easing: 'ease-out', fillMode: 'forwards' }
            }]
          } as AtomNode,
          {
            id: 'album-logo',
            type: 'atom',
            atomType: 'Image',
            order: 2,
            params: {
              src: 'https://i.imgur.com/mxBDYgB.png',
              alt: 'Album di Famiglia logo',
              width: '70%',
              objectFit: 'contain'
            },
            positioning: { zIndex: 2 }
          } as AtomNode
        ]
      } as SectionNode,
      
      // Right column with 4 equal sections
      {
        id: 'right-sections-container',
        type: 'section',
        order: 1,
        name: 'Right Sections Container',
        params: {
          width: '50%',
          height: '800px'
        },
        layout: {
          mode: 'flex',
          direction: 'column',
          gap: '0'
        },
        children: [
          // First small section - Roma
          {
            id: 'roma-section',
            type: 'section',
            order: 0,
            name: 'Roma Wine',
            params: {
              backgroundColor: '#f8f6f0',
              border: '1px solid #000',
              position: 'relative',
              overflow: 'hidden',
              height: '200px'
            },
            layout: {
              mode: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px'
            },
            positioning: { position: 'relative' },
            children: [
              {
                id: 'roma-door-left',
                type: 'atom',
                atomType: 'Text',
                order: 0,
                params: {
                  content: '',
                  backgroundColor: '#2c2c2c',
                  transform: 'translateX(0%)'
                },
                positioning: {
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '50%',
                  height: '100%',
                  zIndex: 3
                },
                animations: [{
                  id: 'roma-door-left-open',
                  trigger: { type: 'hover', targetElementId: 'roma-section' },
                  keyframes: [
                    { offset: 0, styles: { transform: 'translateX(0%)' } },
                    { offset: 1, styles: { transform: 'translateX(-100%)' } }
                  ],
                  timing: { durationMs: 600, easing: 'ease-out', fillMode: 'forwards' }
                }]
              } as AtomNode,
              {
                id: 'roma-door-right',
                type: 'atom',
                atomType: 'Text',
                order: 1,
                params: {
                  content: '',
                  backgroundColor: '#2c2c2c',
                  transform: 'translateX(0%)'
                },
                positioning: {
                  position: 'absolute',
                  top: '0',
                  right: '0',
                  width: '50%',
                  height: '100%',
                  zIndex: 3
                },
                animations: [{
                  id: 'roma-door-right-open',
                  trigger: { type: 'hover', targetElementId: 'roma-section' },
                  keyframes: [
                    { offset: 0, styles: { transform: 'translateX(0%)' } },
                    { offset: 1, styles: { transform: 'translateX(100%)' } }
                  ],
                  timing: { durationMs: 600, easing: 'ease-out', fillMode: 'forwards' }
                }]
              } as AtomNode,
              {
                id: 'roma-text',
                type: 'atom',
                atomType: 'Text',
                order: 2,
                params: {
                  content: 'ROMA<br/>WHITE WINE',
                  fontSize: '16px',
                  color: '#2c2c2c',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  letterSpacing: '1px'
                },
                positioning: { zIndex: 2 }
              } as AtomNode
            ]
          } as SectionNode,
          
          // Second small section - Puglia
          {
            id: 'puglia-section',
            type: 'section',
            order: 1,
            name: 'Puglia Wine',
            params: {
              backgroundColor: '#f8f6f0',
              border: '1px solid #000',
              position: 'relative',
              overflow: 'hidden',
              height: '200px'
            },
            layout: {
              mode: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px'
            },
            positioning: { position: 'relative' },
            children: [
              {
                id: 'puglia-door-left',
                type: 'atom',
                atomType: 'Text',
                order: 0,
                params: {
                  content: '',
                  backgroundColor: '#2c2c2c',
                  transform: 'translateX(0%)'
                },
                positioning: {
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '50%',
                  height: '100%',
                  zIndex: 3
                },
                animations: [{
                  id: 'puglia-door-left-open',
                  trigger: { type: 'hover', targetElementId: 'puglia-section' },
                  keyframes: [
                    { offset: 0, styles: { transform: 'translateX(0%)' } },
                    { offset: 1, styles: { transform: 'translateX(-100%)' } }
                  ],
                  timing: { durationMs: 600, easing: 'ease-out', fillMode: 'forwards' }
                }]
              } as AtomNode,
              {
                id: 'puglia-door-right',
                type: 'atom',
                atomType: 'Text',
                order: 1,
                params: {
                  content: '',
                  backgroundColor: '#2c2c2c',
                  transform: 'translateX(0%)'
                },
                positioning: {
                  position: 'absolute',
                  top: '0',
                  right: '0',
                  width: '50%',
                  height: '100%',
                  zIndex: 3
                },
                animations: [{
                  id: 'puglia-door-right-open',
                  trigger: { type: 'hover', targetElementId: 'puglia-section' },
                  keyframes: [
                    { offset: 0, styles: { transform: 'translateX(0%)' } },
                    { offset: 1, styles: { transform: 'translateX(100%)' } }
                  ],
                  timing: { durationMs: 600, easing: 'ease-out', fillMode: 'forwards' }
                }]
              } as AtomNode,
              {
                id: 'puglia-text',
                type: 'atom',
                atomType: 'Text',
                order: 2,
                params: {
                  content: 'PUGLIA<br/>PRIMITIVO BIO',
                  fontSize: '16px',
                  color: '#2c2c2c',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  letterSpacing: '1px'
                },
                positioning: { zIndex: 2 }
              } as AtomNode
            ]
          } as SectionNode,
          
          // Third small section - Eclipse
          {
            id: 'eclipse-product-section',
            type: 'section',
            order: 2,
            name: 'Eclipse Product',
            params: {
              backgroundColor: '#f8f6f0',
              border: '1px solid #000',
              position: 'relative',
              overflow: 'hidden',
              height: '200px'
            },
            layout: {
              mode: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px'
            },
            positioning: { position: 'relative' },
            children: [
              {
                id: 'eclipse-product-door-left',
                type: 'atom',
                atomType: 'Text',
                order: 0,
                params: {
                  content: '',
                  backgroundColor: '#2c2c2c',
                  transform: 'translateX(0%)'
                },
                positioning: {
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '50%',
                  height: '100%',
                  zIndex: 3
                },
                animations: [{
                  id: 'eclipse-product-door-left-open',
                  trigger: { type: 'hover', targetElementId: 'eclipse-product-section' },
                  keyframes: [
                    { offset: 0, styles: { transform: 'translateX(0%)' } },
                    { offset: 1, styles: { transform: 'translateX(-100%)' } }
                  ],
                  timing: { durationMs: 600, easing: 'ease-out', fillMode: 'forwards' }
                }]
              } as AtomNode,
              {
                id: 'eclipse-product-door-right',
                type: 'atom',
                atomType: 'Text',
                order: 1,
                params: {
                  content: '',
                  backgroundColor: '#2c2c2c',
                  transform: 'translateX(0%)'
                },
                positioning: {
                  position: 'absolute',
                  top: '0',
                  right: '0',
                  width: '50%',
                  height: '100%',
                  zIndex: 3
                },
                animations: [{
                  id: 'eclipse-product-door-right-open',
                  trigger: { type: 'hover', targetElementId: 'eclipse-product-section' },
                  keyframes: [
                    { offset: 0, styles: { transform: 'translateX(0%)' } },
                    { offset: 1, styles: { transform: 'translateX(100%)' } }
                  ],
                  timing: { durationMs: 600, easing: 'ease-out', fillMode: 'forwards' }
                }]
              } as AtomNode,
              {
                id: 'eclipse-product-text',
                type: 'atom',
                atomType: 'Text',
                order: 2,
                params: {
                  content: 'ECLIPSE<br/>DRY GIN',
                  fontSize: '16px',
                  color: '#2c2c2c',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  letterSpacing: '1px'
                },
                positioning: { zIndex: 2 }
              } as AtomNode
            ]
          } as SectionNode,
          
          // Fourth small section - Votiva
          {
            id: 'votiva-product-section',
            type: 'section',
            order: 3,
            name: 'Votiva Product',
            params: {
              backgroundColor: '#f8f6f0',
              border: '1px solid #000',
              position: 'relative',
              overflow: 'hidden',
              height: '200px'
            },
            layout: {
              mode: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px'
            },
            positioning: { position: 'relative' },
            children: [
              {
                id: 'votiva-product-door-left',
                type: 'atom',
                atomType: 'Text',
                order: 0,
                params: {
                  content: '',
                  backgroundColor: '#2c2c2c',
                  transform: 'translateX(0%)'
                },
                positioning: {
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '50%',
                  height: '100%',
                  zIndex: 3
                },
                animations: [{
                  id: 'votiva-product-door-left-open',
                  trigger: { type: 'hover', targetElementId: 'votiva-product-section' },
                  keyframes: [
                    { offset: 0, styles: { transform: 'translateX(0%)' } },
                    { offset: 1, styles: { transform: 'translateX(-100%)' } }
                  ],
                  timing: { durationMs: 600, easing: 'ease-out', fillMode: 'forwards' }
                }]
              } as AtomNode,
              {
                id: 'votiva-product-door-right',
                type: 'atom',
                atomType: 'Text',
                order: 1,
                params: {
                  content: '',
                  backgroundColor: '#2c2c2c',
                  transform: 'translateX(0%)'
                },
                positioning: {
                  position: 'absolute',
                  top: '0',
                  right: '0',
                  width: '50%',
                  height: '100%',
                  zIndex: 3
                },
                animations: [{
                  id: 'votiva-product-door-right-open',
                  trigger: { type: 'hover', targetElementId: 'votiva-product-section' },
                  keyframes: [
                    { offset: 0, styles: { transform: 'translateX(0%)' } },
                    { offset: 1, styles: { transform: 'translateX(100%)' } }
                  ],
                  timing: { durationMs: 600, easing: 'ease-out', fillMode: 'forwards' }
                }]
              } as AtomNode,
              {
                id: 'votiva-product-text',
                type: 'atom',
                atomType: 'Text',
                order: 2,
                params: {
                  content: 'VOTIVA<br/>PREMIUM VODKA',
                  fontSize: '16px',
                  color: '#2c2c2c',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  letterSpacing: '1px'
                },
                positioning: { zIndex: 2 }
              } as AtomNode
            ]
          } as SectionNode
        ]
      } as SectionNode
    ]
  };

  // Animated scrolling text banner 
  const scrollingBannerSection: SectionNode = {
    id: 'scrolling-banner',
    type: 'section',
    order: 2,
    name: 'Animated Text Banner',
    params: {
      backgroundColor: '#f8f6f0',
      padding: '20px 0',
      overflow: 'hidden',
      borderTop: '1px solid #000',
      borderBottom: '1px solid #000',
	  position: 'relative'        
    },
    layout: {
      mode: 'flow',
      width: '100%'
    },
    children: [
      {
        id: 'banner-text',
        type: 'atom',
        atomType: 'Text',
        order: 0,
        params: {
          // content: 'WHO DO YOU THINK I AM? ● THE WORLD IS A PLAYGROUND. ● WHO DO YOU THINK I AM? ● THE WORLD IS A PLAYGROUND. ● WHO DO YOU THINK I AM? ● THE WORLD IS A PLAYGROUND. ● WHO DO YOU THINK I AM? ● THE WORLD IS A PLAYGROUND. ● ',
          content: 'WHO DO YOU THINK I AM? ● THE WORLD IS A PLAYGROUND. ',
          fontSize: '48px',
          color: '#2c2c2c',
          whiteSpace: 'nowrap',
		  display: 'inline-block',      
		  position: 'absolute',          
		  left: '100%',                  
		  top: '50%',                    
		  transform: 'translateY(-50%)', 
          fontWeight: '400',
          letterSpacing: '2px',
          fontFamily: 'Inter, sans-serif',
          fontStyle: 'italic'
        },
        animations: [{
          id: 'banner-scroll',
          trigger: { type: 'load' },
          keyframes: [
            { offset: 0, styles: { transform: 'translateX(100%)' } },
            { offset: 1, styles: { transform: 'translateX(-100%)' } }
          ],
          timing: {
            durationMs: 30000,
            easing: 'linear',
            iterations: 'infinite'
          }
        }]
      } as AtomNode
    ]
  };

  // Bottom navigation bar (now sticky)
  const bottomNavSection: SectionNode = {
    id: 'bottom-nav',
    type: 'section',
    name: 'Bottom Navigation',
    order: 4,
    params: { 
      backgroundColor: '#e6b800',
      borderTop: '2px solid #d4af37'
    },
    layout: {
      mode: 'flex',
      // justifyContent: 'center',
      // alignItems: 'center',
      padding: '15px 40px',
      gap: '50px'
    },
    positioning: {
      position: 'sticky',
      bottom: '0',
      left: '0',
      right: '0',
      zIndex: 1000
    },
    children: [
      { id: 'nav-wine', type: 'atom', atomType: 'Button', order: 0, params: { content: 'WINE', tag: 'a', href: '#wine', fontSize: '12px', color: '#2c2c2c', backgroundColor: 'transparent', border: 'none', letterSpacing: '2px', fontWeight: 'bold' } } as AtomNode,
      { id: 'nav-spirits', type: 'atom', atomType: 'Button', order: 1, params: { content: 'SPIRITS', tag: 'a', href: '#spirits', fontSize: '12px', color: '#2c2c2c', backgroundColor: 'transparent', border: 'none', letterSpacing: '2px', fontWeight: 'bold' } } as AtomNode,
      { id: 'nav-brands', type: 'atom', atomType: 'Button', order: 2, params: { content: 'BRANDS', tag: 'a', href: '#brands', fontSize: '12px', color: '#2c2c2c', backgroundColor: 'transparent', border: 'none', letterSpacing: '2px', fontWeight: 'bold' } } as AtomNode,
      { id: 'nav-about', type: 'atom', atomType: 'Button', order: 3, params: { content: 'ABOUT', tag: 'a', href: '#about', fontSize: '12px', color: '#2c2c2c', backgroundColor: 'transparent', border: 'none', letterSpacing: '2px', fontWeight: 'bold' } } as AtomNode,
      { id: 'nav-news-bottom', type: 'atom', atomType: 'Button', order: 4, params: { content: 'NEWS', tag: 'a', href: '#news', fontSize: '12px', color: '#2c2c2c', backgroundColor: 'transparent', border: 'none', letterSpacing: '2px', fontWeight: 'bold' } } as AtomNode
    ]
  };

  // Footer section with newsletter subscription
  const footerSection: SectionNode = {
    id: 'footer-section',
    type: 'section',
    name: 'Footer Section',
    order: 5,
    params: { 
      backgroundColor: '#ece9e0',
      borderTop: '1px solid #000'
    },
    layout: {
      mode: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '25px 40px',
    },
    children: [
      // Left side - Footer links
      {
        id: 'footer-links',
        type: 'section',
        order: 0,
        name: 'Footer Links',
        params: {},
        layout: {
          mode: 'flex',
          gap: '30px',
          alignItems: 'center'
        },
        children: [
          { 
            id: 'privacy-policy-link', 
            type: 'atom', 
            atomType: 'Button', 
            order: 0, 
            params: { 
              content: 'PRIVACY POLICY', 
              tag: 'a', 
              href: '#privacy', 
              fontSize: '12px', 
              color: '#2c2c2c', 
              backgroundColor: 'transparent', 
              border: 'none', 
              letterSpacing: '1px',
              fontWeight: '400'
            } 
          } as AtomNode,
          { 
            id: 'terms-link', 
            type: 'atom', 
            atomType: 'Button', 
            order: 1, 
            params: { 
              content: 'TERMS AND CONDITIONS', 
              tag: 'a', 
              href: '#terms', 
              fontSize: '12px', 
              color: '#2c2c2c', 
              backgroundColor: 'transparent', 
              border: 'none', 
              letterSpacing: '1px',
              fontWeight: '400'
            } 
          } as AtomNode,
          { 
            id: 'contact-link', 
            type: 'atom', 
            atomType: 'Button', 
            order: 2, 
            params: { 
              content: 'CONTACT', 
              tag: 'a', 
              href: '#contact', 
              fontSize: '12px', 
              color: '#2c2c2c', 
              backgroundColor: 'transparent', 
              border: 'none', 
              letterSpacing: '1px',
              fontWeight: '400'
            } 
          } as AtomNode
        ]
      } as SectionNode,

      // Middle - Newsletter subscription
      {
        id: 'newsletter-section',
        type: 'section',
        order: 1,
        name: 'Newsletter Subscription',
        params: {},
        layout: {
          mode: 'flex',
          direction: 'column',
          gap: '10px'
        },
        children: [
          {
            id: 'newsletter-heading',
            type: 'section',
            order: 0,
            name: 'Newsletter Heading',
            params: {},
            layout: {
              mode: 'flex',
              direction: 'column',
              gap: '2px'
            },
            children: [
              {
                id: 'newsletter-title',
                type: 'atom',
                atomType: 'Text',
                order: 0,
                params: {
                  content: 'HEY YOU! JOIN US!',
                  fontSize: '32px',
                  color: '#2c2c2c',
                  fontWeight: '400',
                  fontFamily: 'serif',
                  fontStyle: 'italic'
                }
              } as AtomNode,
              {
                id: 'newsletter-subtitle',
                type: 'atom',
                atomType: 'Text',
                order: 1,
                params: {
                  content: 'Subscribe & enjoy',
                  fontSize: '14px',
                  color: '#666',
                  fontWeight: '400',
                  marginBottom: '5px'
                }
              } as AtomNode
            ]
          } as SectionNode,
          {
            id: 'newsletter-form',
            type: 'section',
            order: 1,
            name: 'Newsletter Form',
            params: {},
            layout: {
              mode: 'flex',
              alignItems: 'flex-start',
              gap: '15px'
            },
            children: [
              {
                id: 'email-input-container',
                type: 'section',
                order: 0,
                name: 'Email Input Container',
                params: {},
                layout: {
                  mode: 'flex',
                  direction: 'column',
                  gap: '8px'
                },
                children: [
                  {
                    id: 'email-input',
                    type: 'atom',
                    atomType: 'Input',
                    order: 0,
                    params: {
                      placeholder: 'Your email *',
                      type: 'email',
                      required: true,
                      width: '260px',
                      padding: '8px 0',
                      fontSize: '14px',
                      border: 'none',
                      borderBottom: '1px solid #2c2c2c',
                      backgroundColor: 'transparent',
                      outline: 'none',
                      color: '#2c2c2c'
                    }
                  } as AtomNode,
                  {
                    id: 'privacy-checkbox-container',
                    type: 'section',
                    order: 1,
                    name: 'Privacy Checkbox Container',
                    params: {},
                    layout: {
                      mode: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    },
                    children: [
                      {
                        id: 'privacy-checkbox',
                        type: 'atom',
                        atomType: 'Input',
                        order: 0,
                        params: {
                          type: 'checkbox',
                          width: '14px',
                          height: '14px'
                        }
                      } as AtomNode,
                      {
                        id: 'privacy-label',
                        type: 'atom',
                        atomType: 'Text',
                        order: 1,
                        params: {
                          content: 'I consent the data treatment and',
                          fontSize: '11px',
                          color: '#666'
                        }
                      } as AtomNode,
                      {
                        id: 'privacy-link',
                        type: 'atom',
                        atomType: 'Button',
                        order: 2,
                        params: {
                          content: 'Privacy Policy',
                          tag: 'a',
                          href: '#privacy',
                          fontSize: '11px',
                          color: '#2c2c2c',
                          backgroundColor: 'transparent',
                          border: 'none',
                          textDecoration: 'none'
                        }
                      } as AtomNode
                    ]
                  } as SectionNode
                ]
              } as SectionNode,
              {
                id: 'subscribe-button-container',
                type: 'section',
                order: 1,
                name: 'Subscribe Button Container',
                params: {},
                layout: {
                  mode: 'flex',
                  alignItems: 'center',
                  marginTop: '5px'
                },
                children: [
                  {
                    id: 'hand-icon',
                    type: 'atom',
                    atomType: 'Text',
                    order: 0,
                    params: {
                      content: '👉',
                      fontSize: '24px',
                      marginRight: '5px',
                      transform: 'scaleX(-1)'
                    }
                  } as AtomNode,
                  {
                    id: 'subscribe-button',
                    type: 'atom',
                    atomType: 'Button',
                    order: 1,
                    params: {
                      content: 'SUBSCRIBE',
                      fontSize: '14px',
                      color: '#2c2c2c',
                      backgroundColor: 'transparent',
                      border: 'none',
                      fontWeight: '600',
                      letterSpacing: '1px',
                      cursor: 'pointer'
                    }
                  } as AtomNode
                ]
              } as SectionNode
            ]
          } as SectionNode
        ]
      } as SectionNode,

      // Right side - Language selector
      {
        id: 'language-selector',
        type: 'atom',
        atomType: 'Button',
        order: 2,
        params: {
          content: 'ENG',
          fontSize: '12px',
          color: '#2c2c2c',
          backgroundColor: 'transparent',
          border: 'none',
          letterSpacing: '1px',
          fontWeight: '500'
        }
      } as AtomNode
    ]
  };

  const pageNodes: Node[] = [headerSection, mainContentSection, scrollingBannerSection, productGridSection, bottomNavSection, footerSection];

  const brandBreederPageDefinition: PageDefinition = {
    id: 'brand-breeder-demo',
    schemaVersion: 'osdl_v3.1',
    name: 'Brand Breeder Demo',
    route: '/brand-breeder',
    pageType: 'static',
    nodes: pageNodes,
  };

  return brandBreederPageDefinition;
}; 
