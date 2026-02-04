import React, { useState, useCallback } from 'react';
import { ShoppingBag, User, Menu } from 'lucide-react';
import { ComponentComponentProps } from "@/ComponentRegistry";
import NodeRenderer from "@/osdl/NodeRenderer";
import { AtomNode, SectionNode } from "@/OSDL.types";

// Utility function to parse margin shorthand (CSS and Tailwind-style)
export function parseMargin(margin: string | undefined): [string, string, string, string] {
  if (!margin || margin.trim() === '') return ['0', '0', '0', '0'];
  const parts = margin.trim().split(/\s+/);
  // Tailwind-style: '8px x' or '4px y'
  if (parts.length === 2 && (parts[1] === 'x' || parts[1] === 'y')) {
    if (parts[1] === 'x') {
      // left/right = value, top/bottom = 0
      return ['0', parts[0], '0', parts[0]];
    } else if (parts[1] === 'y') {
      // top/bottom = value, left/right = 0
      return [parts[0], '0', parts[0], '0'];
    }
  }
  // Standard CSS margin shorthand
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  if (parts.length === 4) return [parts[0], parts[1], parts[2], parts[3]];
  // Fallback
  return ['0', '0', '0', '0'];
}

export interface NavbarLink {
  label: string;
  href: string;
  style?: React.CSSProperties;
}

export interface NavLinksConfig {
  links: NavbarLink[];
  color: string;
  activeColor: string;
  hoverColor: string;
  fontSize: string;
  fontWeight: string;
  padding: string;
  spacing: string;
  transition: string;
  activeIndicatorColor: string;
  activeIndicatorHeight: string;
  activeIndicatorWidth: string;
  activeIndicatorBorderRadius: string;
}

export interface MobileNavConfig {
  color: string;
  activeColor: string;
  hoverColor: string;
  fontSize: string;
  fontWeight: string;
  padding: string;
  activeBackground: string;
  hoverBackground: string;
  borderBottom: string;
}

export interface IconConfig {
  name: string;
  size: number;
  color: string;
  padding: string;
  borderRadius: string;
  transition: string;
}

const DEFAULT_LOGO_URL = 'https://ov2nyfoqxq.ufs.sh/f/4d9MMfWtrnN3SeA5NwIsFpdtxqfuzjbZowAneCirmYV548Ul';

const NavbarComponent: React.FC<ComponentComponentProps> = ({
  nodeSchema,
  isInspectMode, 
  editingSections, 
  onDeleteNode,
  onDuplicateNode, 
  setPageDefinition,
  ChildRenderer = NodeRenderer,
  // Navbar container params
  backgroundColor = 'transparent',
  borderBottom = 'none',
  boxShadow = 'none',
  margin = '0',
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  padding = '0.5rem 1rem',
  borderRadius = '0',

  className,

  // Logo params
  shopLogo = DEFAULT_LOGO_URL,
  logoHeight = 32,
  logoWidth = 'auto',
  logoAlt = 'Shop Logo',
  logoPosition = 'left', // 'left', 'center', 'right'
  // Nav links config
  navLinksConfig = {
    links: [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' }
    ],
    color: '#333333',
    activeColor: '#1E5D5B',
    hoverColor: '#1E5D5B',
    fontSize: '1rem',
    fontWeight: '500',
    padding: '0.25rem 0.5rem',
    spacing: '0.25rem',
    transition: 'color 0.2s',
    activeIndicatorColor: '#1E5D5B',
    activeIndicatorHeight: '2px',
    activeIndicatorWidth: '60%',
    activeIndicatorBorderRadius: '1px'
  },
  // Mobile nav config
  mobileNavConfig = {
    color: '#333333',
    activeColor: '#1E5D5B',
    hoverColor: '#1E5D5B',
    fontSize: '1.1rem',
    fontWeight: '500',
    padding: '1rem 1.5rem',
    activeBackground: '#f0f9f8',
    hoverBackground: '#f0f9f8',
    borderBottom: '1px solid #e5e7eb'
  },
  // Mobile sidebar params
  mobileSidebarWidth = '280px',
  mobileSidebarBackground = 'white',
  mobileSidebarBoxShadow = '-2px 0 10px rgba(0,0,0,0.1)',
  mobileSidebarBorderLeft = '1px solid #e5e7eb',
  mobileSidebarTransition = 'right 0.3s ease',
  mobileSidebarZIndex = 1000,
  // Icons config
  cartIconConfig = {
    name: 'ShoppingBag',
    size: 16,
    color: '#000',
    padding: '0.5rem',
    borderRadius: '6px',
    transition: 'all 0.2s ease'
  },
  userIconConfig = {
    name: 'User',
    size: 16,
    color: '#000',
    padding: '0.5rem',
    borderRadius: '6px',
    transition: 'all 0.2s ease'
  },
  hamburgerIconConfig = {
    name: 'Menu',
    size: 22,
    color: '#1E5D5B',
    padding: '0.5rem',
    borderRadius: '6px',
    transition: 'all 0.2s ease'
  },
  // Animation params
  enableLinkHoverAnimations = true,
  linkHoverDuration = 200,
  linkHoverEasing = 'ease',
  // Layout params
  desktopBreakpoint = 768,
  navContainerGap = '1.5rem',
  iconsContainerGap = '0.5rem',
  // Backdrop params
  backdropBackground = 'rgba(0,0,0,0.5)',
  backdropZIndex = 999,
  // Active href (for highlighting current page)
  activeHref,
}) => {
  const [isDesktop, setIsDesktop] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Use utility function to parse margin
  const [mt, mr, mb, ml] = parseMargin(margin);

  const marginStyle: React.CSSProperties = {
    marginTop: typeof marginTop !== 'undefined' ? marginTop : mt,
    marginRight: typeof marginRight !== 'undefined' ? marginRight : mr,
    marginBottom: typeof marginBottom !== 'undefined' ? marginBottom : mb,
    marginLeft: typeof marginLeft !== 'undefined' ? marginLeft : ml,
  };
  
  React.useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= desktopBreakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [desktopBreakpoint]);

  // Determine the active href (default to first navLinks if not provided)
  const resolvedActiveHref = activeHref || (navLinksConfig.links.length > 0 ? navLinksConfig.links[0].href : undefined);

  // Handle hamburger click with useCallback to prevent re-renders
  const handleHamburgerClick = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Create nav link nodes for ChildRenderer
  const navLinkNodes: AtomNode[] = navLinksConfig.links.map((link: NavbarLink, index: number) => ({
    id: `${nodeSchema.id}-nav-link-${index}`,
    type: 'atom',
    atomType: 'Link',
    order: index,
    params: {
      href: link.href,
      content: link.label,
      style: {
        color: resolvedActiveHref === link.href ? navLinksConfig.activeColor : navLinksConfig.color,
        textDecoration: 'none',
        fontWeight: navLinksConfig.fontWeight,
        fontSize: navLinksConfig.fontSize,
        cursor: 'pointer',
        padding: navLinksConfig.padding,
        display: isDesktop ? 'block' : 'none',
        position: 'relative',
        transition: navLinksConfig.transition,
        ...link.style
      },
      isActive: resolvedActiveHref === link.href
    },
    interactionStates: {
      hover: {
        inlineStyles: {
          color: navLinksConfig.hoverColor,
        },
        transition: {
          properties: ['color'],
          durationMs: 200,
          easing: 'ease'
        }
      }
    }
  }));

  // Create mobile nav link nodes for sidebar
  const mobileNavLinkNodes: AtomNode[] = navLinksConfig.links.map((link: NavbarLink, index: number) => ({
    id: `${nodeSchema.id}-mobile-nav-link-${index}`,
    type: 'atom',
    atomType: 'Link',
    order: index,
    params: {
      href: link.href,
      content: link.label,
      style: {
        color: resolvedActiveHref === link.href ? mobileNavConfig.activeColor : mobileNavConfig.color,
        textDecoration: 'none',
        fontWeight: mobileNavConfig.fontWeight,
        fontSize: mobileNavConfig.fontSize,
        cursor: 'pointer',
        padding: mobileNavConfig.padding,
        display: 'block',
        borderBottom: mobileNavConfig.borderBottom,
        backgroundColor: resolvedActiveHref === link.href ? mobileNavConfig.activeBackground : 'transparent',
        transition: 'color 0.2s ease, background-color 0.2s ease',
        ...link.style
      },
      isActive: resolvedActiveHref === link.href
    },
    interactionStates: {
      hover: {
        inlineStyles: {
          color: mobileNavConfig.hoverColor,
          backgroundColor: mobileNavConfig.hoverBackground
        },
        transition: {
          properties: ['color', 'background-color'],
          durationMs: 200,
          easing: 'ease'
        }
      }
    }
  }));

  // Create logo node for ChildRenderer (so it's selectable)
  const logoNode: AtomNode = {
    id: `${nodeSchema.id}-logo`,
    type: 'atom',
    atomType: 'Image',
    order: 0,
    params: {
      src: typeof shopLogo === 'string' ? shopLogo : DEFAULT_LOGO_URL,
      alt: logoAlt,
      style: {
        height: logoHeight,
        width: logoWidth,
        display: 'block'
      }
    }
  };

  // Create icon nodes for ChildRenderer
  const cartIconNode: AtomNode = {
    id: `${nodeSchema.id}-cart-icon`,
    type: 'atom',
    atomType: 'Icon',
    order: 0,
    params: {
      iconName: cartIconConfig.name,
      size: cartIconConfig.size,
      color: cartIconConfig.color,
      style: {
        padding: cartIconConfig.padding,
        cursor: 'pointer',
        borderRadius: cartIconConfig.borderRadius,
        transition: cartIconConfig.transition
      }
    }
  };

  const userIconNode: AtomNode = {
    id: `${nodeSchema.id}-user-icon`,
    type: 'atom',
    atomType: 'Icon',
    order: 1,
    params: {
      iconName: userIconConfig.name,
      size: userIconConfig.size,
      color: userIconConfig.color,
      style: {
        padding: userIconConfig.padding,
        cursor: 'pointer',
        borderRadius: userIconConfig.borderRadius,
        transition: userIconConfig.transition
      }
    }
  };

  const hamburgerIconNode: AtomNode = {
    id: `${nodeSchema.id}-hamburger-icon`,
    type: 'atom',
    atomType: 'Icon',
    order: 2,
    params: {
      iconName: hamburgerIconConfig.name,
      size: hamburgerIconConfig.size,
      color: hamburgerIconConfig.color,
      style: {
        padding: hamburgerIconConfig.padding,
        cursor: 'pointer',
        borderRadius: hamburgerIconConfig.borderRadius,
        transition: hamburgerIconConfig.transition,
        display: isDesktop ? 'none' : 'block'
      }
    }
  };

  // Create mobile sidebar section (slides from right)
  const mobileSidebarSection: SectionNode = {
    id: `${nodeSchema.id}-mobile-sidebar`,
    type: 'section',
    order: 0,
    params: {},
    layout: {
      mode: 'flex',
      direction: 'column',
      gap: '0',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      padding: '0',
      width: mobileSidebarWidth,
      height: '100vh'
    },
    inlineStyles: {
      position: 'fixed',
      top: 0,
      right: isSidebarOpen ? 0 : `calc(-${mobileSidebarWidth} - 20px)`,
      backgroundColor: mobileSidebarBackground,
      boxShadow: mobileSidebarBoxShadow,
      zIndex: mobileSidebarZIndex,
      transition: mobileSidebarTransition,
      borderLeft: mobileSidebarBorderLeft
    },
    children: mobileNavLinkNodes
  };

  // Navbar styles - applied directly to the nav element
  const navbarStyle = {
    backgroundColor,
    borderBottom,
    ...marginStyle,
    padding,
    borderRadius,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const getLeftSectionStyle = () => {
    return { display: 'flex', alignItems: 'center', gap: navContainerGap };
  };

  const getCenterSectionStyle = () => {
    if (logoPosition === 'center') {
      return { 
        display: 'flex', 
        alignItems: 'center', 
        gap: navLinksConfig.spacing,
        position: 'absolute' as const,
        left: '50%',
        transform: 'translateX(-50%)'
      };
    }
    return { display: 'none' };
  };

  return (
    <>
      <nav style={navbarStyle}>
        <style>
          {`
          ${enableLinkHoverAnimations ? `
          .${nodeSchema.id}-nav-link a {
            transition: color ${linkHoverDuration}ms ${linkHoverEasing};
          }
          .${nodeSchema.id}-nav-link:hover a {
            color: ${navLinksConfig.hoverColor} !important;
          }
          .${nodeSchema.id}-mobile-sidebar a {
            transition: color ${linkHoverDuration}ms ${linkHoverEasing}, background-color ${linkHoverDuration}ms ${linkHoverEasing};
          }
          .${nodeSchema.id}-mobile-sidebar a:hover {
            color: ${mobileNavConfig.hoverColor} !important;
            background-color: ${mobileNavConfig.hoverBackground} !important;
          }
          ` : ''}
        `}
        </style>

        {/* Left section - Logo and Nav links (desktop) */}
        <div style={getLeftSectionStyle()}>
          <ChildRenderer
            nodeSchema={logoNode}
            setPageDefinition={setPageDefinition}
            isInspectMode={isInspectMode}
            editingSections={editingSections}
            onDeleteNode={onDeleteNode}
            onDuplicateNode={onDuplicateNode}
            ChildRenderer={ChildRenderer}
          />
          
          {/* Nav links next to logo on desktop (when logo is left) */}
          {isDesktop && logoPosition === 'left' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: navLinksConfig.spacing }}>
              {navLinkNodes.map((node, index) => (
                <div key={node.id} style={{ position: 'relative' }}>
                  <div className={`${nodeSchema.id}-nav-link`}>
                    <ChildRenderer
                      nodeSchema={node}
                      setPageDefinition={setPageDefinition}
                      isInspectMode={isInspectMode}
                      editingSections={editingSections}
                      onDeleteNode={onDeleteNode}
                      onDuplicateNode={onDuplicateNode}
                      ChildRenderer={ChildRenderer}
                    />
                  </div>
                  {/* Active indicator */}
                  {resolvedActiveHref === navLinksConfig.links[index].href && (
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: navLinksConfig.activeIndicatorWidth,
                        height: navLinksConfig.activeIndicatorHeight,
                        backgroundColor: navLinksConfig.activeIndicatorColor,
                        borderRadius: navLinksConfig.activeIndicatorBorderRadius
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center section - Nav links when logo is centered */}
        {isDesktop && logoPosition === 'center' && (
          <div style={getCenterSectionStyle()}>
            {navLinkNodes.map((node, index) => (
              <div key={node.id} style={{ position: 'relative' }}>
                <div className={`${nodeSchema.id}-nav-link`}>
                  <ChildRenderer
                    nodeSchema={node}
                    setPageDefinition={setPageDefinition}
                    isInspectMode={isInspectMode}
                    editingSections={editingSections}
                    onDeleteNode={onDeleteNode}
                    onDuplicateNode={onDuplicateNode}
                    ChildRenderer={ChildRenderer}
                  />
                </div>
                {/* Active indicator */}
                {resolvedActiveHref === navLinksConfig.links[index].href && (
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: navLinksConfig.activeIndicatorWidth,
                      height: navLinksConfig.activeIndicatorHeight,
                      backgroundColor: navLinksConfig.activeIndicatorColor,
                      borderRadius: navLinksConfig.activeIndicatorBorderRadius
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Right section - Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: iconsContainerGap }}>
          <ChildRenderer
            nodeSchema={cartIconNode}
            setPageDefinition={setPageDefinition}
            isInspectMode={isInspectMode}
            editingSections={editingSections}
            onDeleteNode={onDeleteNode}
            onDuplicateNode={onDuplicateNode}
            ChildRenderer={ChildRenderer}
          />
          <ChildRenderer
            nodeSchema={userIconNode}
            setPageDefinition={setPageDefinition}
            isInspectMode={isInspectMode}
            editingSections={editingSections}
            onDeleteNode={onDeleteNode}
            onDuplicateNode={onDuplicateNode}
            ChildRenderer={ChildRenderer}
          />
          <div onClick={handleHamburgerClick}>
            <ChildRenderer
              nodeSchema={hamburgerIconNode}
              setPageDefinition={setPageDefinition}
              isInspectMode={isInspectMode}
              editingSections={editingSections}
              onDeleteNode={onDeleteNode}
              onDuplicateNode={onDuplicateNode}
              ChildRenderer={ChildRenderer}
            />
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div className={`${nodeSchema.id}-mobile-sidebar`}>
        <ChildRenderer
          nodeSchema={mobileSidebarSection}
          setPageDefinition={setPageDefinition}
          isInspectMode={isInspectMode}
          editingSections={editingSections}
          onDeleteNode={onDeleteNode}
          onDuplicateNode={onDuplicateNode}
          ChildRenderer={ChildRenderer}
        />
      </div>

      {/* Backdrop for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: backdropBackground,
            zIndex: backdropZIndex
          }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default NavbarComponent;

