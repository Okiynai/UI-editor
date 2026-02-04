import { PageDefinition, SectionNode, AtomNode, Node, DataSourceConfig } from "@/OSDL.types";

// Product Detail Demo (dynamic) — pulls a single product via RQL and renders a PDP
export const getProductPageDemo = (routeParams: Record<string, string>): PageDefinition => {
  const dataSource: DataSourceConfig = {
    type: 'rql',
    sourceParams: {
      queries: {
        productDetail: {
          contract: 'product.get',
          params: {
            // Demo: lock to a known product so route params aren't required in editor
            productId: '5ad98923-44b5-4baf-ba74-26585315f2d5',
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currency: true,
            images: true,
            stockCount: true
          }
        }
      }
    }
  };

  // Navbar (copied from okiynai-classic-demo)
  const navbar: SectionNode = {
    id: "classic-navbar",
    type: "section",
    name: "Navbar",
    order: 0,
    state: { isMenuOpen: false },
    layout: {
      mode: "flex",
      direction: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 24px",
      height: "64px",
      width: "100%"
    },
    params: {
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #e5e7eb"
    },
    positioning: {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      zIndex: 50
    },
    children: [
      // Left side - Navigation links
      {
        id: "navbar-links",
        type: "section",
        order: 0,
        layout: {
          mode: "flex",
          direction: "row",
          gap: "32px",
          alignItems: "center"
        },
        params: {},
        responsiveOverrides: {
          mobile: {
            inlineStyles: {
              display: "none"
            }
          }
        },
        children: [
          {
            id: "navbar-link-home",
            type: "atom",
            atomType: "Link",
            order: 0,
            params: {
              href: "/",
              content: "Home",
              color: "#374151",
            fontSize: "14px",
              fontWeight: "500"
            }
          } as AtomNode,
          {
            id: "navbar-link-products",
            type: "atom",
            atomType: "Link",
            order: 1,
            params: {
              href: "/products",
              content: "Products",
              color: "#374151",
            fontSize: "14px",
              fontWeight: "500"
            }
          } as AtomNode,
          {
            id: "navbar-link-about",
            type: "atom",
            atomType: "Link",
            order: 2,
            params: {
              href: "/about",
              content: "About",
              color: "#374151",
            fontSize: "14px",
              fontWeight: "500"
            }
          } as AtomNode
        ]
      } as SectionNode,
      // Center - Company logo
      {
        id: "navbar-logo",
        type: "atom",
        atomType: "Image",
        order: 1,
        params: {
          src: "https://ov2nyfoqxq.ufs.sh/f/4d9MMfWtrnN30CZYjxXuLRQYxKH1e8cTFm42Cqiyr7EUJ96B",
          alt: "Okiynai Logo",
          width: "120px",
          height: "40px",
          marginRight: "132px",
          objectFit: "cover"
        }
      } as AtomNode,
      // Right side - User icon and shopping cart
      {
        id: "navbar-actions",
        type: "section",
        order: 2,
        layout: {
          mode: "flex",
          direction: "row",
          gap: "16px",
          alignItems: "center"
        },
        params: {},
        children: [
          {
            id: "navbar-cart-icon",
            type: "component",
            componentType: "Cart",
            order: 1,
            params: {
              size: "24px",
              color: "#374151"
            }
          } as any,
          {
            id: "navbar-user-icon",
            type: "component",
            componentType: "ModalButton",
            order: 0,
            params: {
              size: "24px",
              color: "#374151"
            }
          } as any,
          {
            id: "navbar-menu-icon",
            type: "atom",
            atomType: "Icon",
            order: 2,
            params: {
              iconName: "Menu",
              size: 24,
              color: "#1E5D5B",
              style: { cursor: "pointer", display: "none" }
            },
            responsiveOverrides: {
              mobile: {
                params: {
                  style: { display: "block" }
                }
              }
            },
            eventHandlers: {
              onClick: [
                {
                  id: "open-mobile-menu",
                  type: "updateState",
                  params: {
                    targetNodeId: "classic-navbar",
                    updates: { isMenuOpen: true }
                  }
                },
                {
                  id: "drawer-slide-in",
                  type: "updateNodeState",
                  params: {
                    targetNodeId: "navbar-mobile-drawer",
                    updates: { inlineStyles: { right: "0" } }
                  }
                },
                {
                  id: "show-overlay-on-open",
                  type: "updateNodeState",
                  params: {
                    targetNodeId: "navbar-mobile-overlay",
                    updates: { visibility: { hidden: false } }
                  }
                }
              ]
            }
          } as any,
        ]
      } as SectionNode
      ,
      // Mobile menu overlay (backdrop)
      {
        id: "navbar-mobile-overlay",
        type: "section",
        order: 3,
        layout: { mode: "flow" },
        params: {},
        positioning: {
          position: "fixed",
          top: "0",
          left: "0",
          right: "0",
          bottom: "0",
          zIndex: 49
        },
        inlineStyles: {
          backgroundColor: "rgba(0,0,0,0.5)"
        },
        visibility: {
          hidden: true
        },
        eventHandlers: {
          onClick: [
            {
              id: "close-menu-overlay",
              type: "updateState",
              params: {
                targetNodeId: "classic-navbar",
                updates: { isMenuOpen: false }
              }
            },
            {
              id: "hide-overlay-on-close",
              type: "updateNodeState",
              params: {
                targetNodeId: "navbar-mobile-overlay",
                updates: { visibility: { hidden: true } }
              }
            },
            {
              id: "drawer-slide-out-overlay",
              type: "updateNodeState",
              params: {
                targetNodeId: "navbar-mobile-drawer",
                updates: { inlineStyles: { right: "-280px" } }
              }
            }
          ]
        },
        children: []
      } as SectionNode,
      // Mobile menu drawer (slides from right)
      {
        id: "navbar-mobile-drawer",
        type: "section",
        order: 4,
        layout: {
          mode: "flex",
          direction: "column",
          gap: "0"
        },
        params: {
          backgroundColor: "#ffffff",
          borderLeft: "1px solid #e5e7eb"
        },
        positioning: {
          position: "fixed",
          top: "0",
          zIndex: 50
        },
        inlineStyles: {
          width: "280px",
          height: "100dvh",
          boxShadow: "-2px 0 10px rgba(0,0,0,0.1)",
          transition: "right 0.3s ease",
          right: "-280px"
        },
        visibility: {
          expression: "{{ viewport.width < 768 }}"
        },
        children: [
          {
            id: "mobile-menu-header",
            type: "section",
            order: 0,
            layout: {
              mode: "flex",
              direction: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 16px"
            },
            params: {},
            children: [
              {
                id: "mobile-menu-title",
                type: "atom",
                atomType: "Text",
                order: 0,
                params: {
                  content: "Menu",
                  fontWeight: "600",
                  fontSize: "16px"
                }
              } as AtomNode,
              {
                id: "mobile-menu-close",
                type: "atom",
                atomType: "Icon",
                order: 1,
                params: {
                  iconName: "X",
                  size: 20,
                  color: "#374151",
                  style: { cursor: "pointer" }
                },
                eventHandlers: {
                  onClick: [
                    {
                      id: "close-mobile-menu-x",
                      type: "updateState",
                      params: {
                        targetNodeId: "classic-navbar",
                        updates: { isMenuOpen: false }
                      }
                    },
                    {
                      id: "hide-overlay-on-x",
                      type: "updateNodeState",
                      params: {
                        targetNodeId: "navbar-mobile-overlay",
                        updates: { visibility: { hidden: true } }
                      }
                    },
                    {
                      id: "drawer-slide-out-x",
                      type: "updateNodeState",
                      params: {
                        targetNodeId: "navbar-mobile-drawer",
                        updates: { inlineStyles: { right: "-280px" } }
                      }
                    }
                  ]
                }
              } as AtomNode
            ]
          } as SectionNode,
          {
            id: "mobile-menu-links",
            type: "section",
            order: 1,
            layout: {
              mode: "flow"
            },
            params: {},
            children: [
              {
                id: "mobile-menu-link-home",
                type: "atom",
                atomType: "Link",
                order: 0,
                params: {
                  href: "/",
                  content: "Home",
                  display: "block",
                  padding: "14px 16px",
                  color: "#374151"
                },
                interactionStates: {
                  hover: { inlineStyles: { backgroundColor: "#f3f4f6" } }
                }
              } as AtomNode,
              {
                id: "mobile-menu-link-products",
                type: "atom",
                atomType: "Link",
                order: 1,
                params: {
                  href: "/products",
                  content: "Products",
                  display: "block",
                  padding: "14px 16px",
                  color: "#374151"
                },
                interactionStates: {
                  hover: { inlineStyles: { backgroundColor: "#f3f4f6" } }
                }
              } as AtomNode,
              {
                id: "mobile-menu-link-about",
                type: "atom",
                atomType: "Link",
                order: 2,
                params: {
                  href: "/about",
                  content: "About",
                  display: "block",
                  padding: "14px 16px",
                  color: "#374151"
                },
                interactionStates: {
                  hover: { inlineStyles: { backgroundColor: "#f3f4f6" } }
                }
              } as AtomNode
            ]
          } as SectionNode
        ]
      } as SectionNode
    ]
  };

  // Navbar spacer to preserve layout under fixed navbar
  const navbarSpacer: SectionNode = {
    id: "classic-navbar-spacer",
    type: "section",
    name: "NavbarSpacer",
    order: 1,
    layout: {
      mode: "flow",
      height: "64px"
    },
    params: {},
    children: []
  } as SectionNode;

  // Main product section using React component
  const main: SectionNode = {
    id: 'pdp-main',
    type: 'section',
    order: 2,
    name: 'ProductMain',
    layout: { mode: 'flow' },
    params: {},
    children: [
      {
        id: 'product-page-component',
        type: 'component',
        componentType: 'ProductPage',
        order: 0,
        params: {
          productId: '5ad98923-44b5-4baf-ba74-26585315f2d5'
        }
      } as any
    ]
  } as SectionNode;

  // Footer (copied from okiynai-classic-demo)
  const footer: SectionNode = {
    id: "classic-footer",
    type: "section",
    name: "Footer",
    order: 3,
    layout: { 
      mode: "flow", 
      gap: "0", 
      padding: "0" 
    },
    params: { 
      backgroundColor: "#1f2937", 
      color: "#e5e7eb" 
    },
    children: [
      // Upper footer section with 3 columns
      {
        id: "footer-main",
        type: "section",
        order: 0,
        name: "Footer Main",
        layout: {
          mode: "flex",
          direction: "row",
          justifyContent: "space-between",
          alignItems: "stretch",
          padding: "48px 24px",
          gap: "80px",
        },
        className: "space-x-20",
        params: {},
        children: [
          // Left column: Our Mission / Who we are
          {
            id: "footer-production",
            type: "section",
            order: 0,
            layout: { mode: "flow", gap: "16px" },
            className: "space-y-4 mb-4",
            params: {},
            children: [
              {
                id: "footer-production-subtitle",
                type: "atom",
                atomType: "Text",
                order: 0,
                params: {
                  tag: "h4",
                  content: "Who we are",
                  color: "#e5e7eb",
                  fontWeight: "700",
                  fontSize: "16px",
                },
              } as AtomNode,
              {
                id: "footer-production-who-desc",
                type: "atom",
                atomType: "Text",
                order: 1,
                params: {
                  tag: "p",
                  content: "A platform for discovery, where creators and shoppers connect across many unique stores.",
                  color: "#9ca3af",
                  fontSize: "14px",
                  margin: "12px 0 0"
                },
              } as AtomNode,
            ],
          } as SectionNode,
          // Middle column: Quick Links
          {
            id: "footer-links",
            type: "section",
            order: 1,
            layout: { mode: "flow", gap: "16px" },
            className: "space-y-4",
            params: {},
            children: [
              {
                id: "footer-links-title",
                type: "atom",
                atomType: "Text",
                order: 0,
                params: {
                  tag: "h4",
                  content: "Links",
                  color: "#e5e7eb",
                  fontWeight: "700",
                  fontSize: "16px",
                  margin: "0px 0px 16px"
                },
              } as AtomNode,
              {
                id: "footer-link-home",
                type: "atom",
                atomType: "Link",
                order: 1,
                params: {
                  href: "/",
                  content: "Home",
                  color: "#cbd5e1",
                  fontSize: "14px",
                  display: "block",
                  margin: "8px 0 0"
                },
              } as AtomNode,
              {
                id: "footer-link-products",
                type: "atom",
                atomType: "Link",
                order: 2,
                params: {
                  href: "/products",
                  content: "Products",
                  color: "#cbd5e1",
                  fontSize: "14px",
                  display: "block",
                  margin: "8px 0 0"
                },
              } as AtomNode,
              {
                id: "footer-link-info",
                type: "atom",
                atomType: "Link",
                order: 3,
                params: {
                  href: "/info",
                  content: "Info",
                  color: "#cbd5e1",
                  fontSize: "14px",
                  display: "block",
                  margin: "8px 0 0"
                },
              } as AtomNode,
            ],
          } as SectionNode,
          // Right column: Contact Us
          {
            id: "footer-contact",
            type: "section",
            order: 2,
            layout: { 
              mode: "flex", 
              direction: "column", 
              gap: "0px",
              justifyContent: "flex-end",
              width: "320px"
            },
            className: "space-y-4",
            params: {},
            children: [
              {
                id: "footer-contact-spacer",
                type: "section",
                order: 0,
                layout: { mode: "flow" },
                params: {},
                inlineStyles: { flexGrow: 1 },
                children: []
              } as SectionNode,
              {
                id: "footer-contact-title",
                type: "atom",
                atomType: "Text",
                order: 1,
                params: {
                  tag: "h5",
                  content: "Contact us:",
                  color: "#e5e7eb",
                  fontWeight: "700",
                  fontSize: "14px",
                  margin: "0 0 6px"
                }
              } as AtomNode,
              {
                id: "footer-social-icons",
                type: "section",
                order: 2,
                layout: {
                  mode: "flex",
                  direction: "row",
                  gap: "12px",
                  alignItems: "center",
                  justifyContent: "flex-end"
                },
                params: {},
                inlineStyles: {
                  marginTop: 'auto',
                  paddingRight: '18px'
                },
                children: [
                  {
                    id: "footer-icon-twitter",
                    type: "atom",
                    atomType: "Icon",
                    order: 0,
                    params: {
                      iconName: "Twitter",
                      size: 18,
                      color: "#cbd5e1",
                      style: {
                        cursor: "default"
                      }
                    }
                  } as AtomNode,
                  {
                    id: "footer-icon-instagram",
                    type: "atom",
                    atomType: "Icon",
                    order: 1,
                    params: {
                      iconName: "Instagram",
                      size: 18,
                      color: "#cbd5e1",
                      style: {
                        cursor: "default"
                      }
                    }
                  } as AtomNode,
                  {
                    id: "footer-icon-linkedin",
                    type: "atom",
                    atomType: "Icon",
                    order: 2,
                    params: {
                      iconName: "Linkedin",
                      size: 18,
                      color: "#cbd5e1",
                      style: {
                        cursor: "default"
                      }
                    }
                  } as AtomNode
                ]
              } as SectionNode
            ],
          } as SectionNode,
        ],
      } as SectionNode,
      // Lower footer section
      {
        id: "footer-bottom",
        type: "section",
        order: 1,
        name: "Footer Bottom",
        layout: {
          mode: "flex",
          direction: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px",
          marginTop: "0px",
        },
        className: "",
        params: {
          backgroundColor: "#111827"
        },
        children: [
          {
            id: "footer-powered",
            type: "atom",
            atomType: "Text",
            order: 0,
            params: {
              content: "Powered by Okiynai",
              color: "#9ca3af",
              fontSize: "12px",
            },
          } as AtomNode,
          {
            id: "footer-copyright",
            type: "atom",
            atomType: "Text",
            order: 1,
            params: {
              content: "",
              color: "#9ca3af",
              fontSize: "12px",
            },
          } as AtomNode,
        ],
      } as SectionNode,
    ],
  };

  const page: PageDefinition = {
    id: 'product-page-demo',
    schemaVersion: 'osdl_v3.1',
    name: 'Product Page Demo',
    route: '/products/[productId]',
    pageType: 'dynamic',
    dataSource,
    nodes: [navbar as Node, navbarSpacer as Node, main as Node, footer as Node]
  };

  return page;
};


