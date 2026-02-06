'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSiteSettings } from './SiteSettingsContext';
import { ResponsiveBreakpointName } from '@/OSDL.types';

interface ViewportContextType {
  activeBreakpointName: ResponsiveBreakpointName | null;
  viewport: {
    width: number;
    height: number;
  };
}

const BreakpointContext = createContext<ViewportContextType | undefined>(undefined);

export const BreakpointProvider = ({ children }: { children: ReactNode }) => {
  const siteSettings = useSiteSettings();
  const [activeBreakpointName, setActiveBreakpointName] = useState<ResponsiveBreakpointName | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const calculateBreakpoint = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setViewport({ width, height });

      // adding fallback breakpoints, since we removed them from the UI
      // a long time ago, and we have to use them now for the overrides
      // in the editor. so we are just providing the default fallbakc values
      // NOTE: it's important noting that this should happen on shop creation,
      // but yk, server no trust client, client no trust server, so fuck everybody. 
      const breakpoints = siteSettings.globalStyleVariables?.breakpoints || {
        'mobile': 'max-width: 767px',
        'tablet': 'min-width: 768px) and (max-width: 1023px',
        'desktop': 'min-width: 1024px'
      };

      let currentBreakpoint: ResponsiveBreakpointName | null = null;
      
      const sortedBreakpoints = Object.entries(breakpoints)
        .map(([name, query]) => {
          const queryText = typeof query === 'string' ? query : String(query);
          return { name: name as ResponsiveBreakpointName, query: queryText, isMinWidth: queryText.includes('min-width') };
        })
        // A sort to prioritize larger breakpoints (min-width) to handle overlapping queries correctly.
        // This is a common strategy: check from largest requirement to smallest.
        .sort((a, b) => {
            const aVal = a.isMinWidth ? parseInt(a.query.replace(/[^0-9]/g, ''), 10) : 0;
            const bVal = b.isMinWidth ? parseInt(b.query.replace(/[^0-9]/g, ''), 10) : 0;
            return bVal - aVal;
        });

      let matched = false;
      for (const bp of sortedBreakpoints) {
        if (window.matchMedia(`(${bp.query})`).matches) {
          currentBreakpoint = bp.name;
          matched = true;
          break; 
        }
      }

      // Fallback for the smallest breakpoint (often mobile) if it uses max-width and nothing else matched.
      if (!matched) {
          const mobileBreakpoint = Object.entries(breakpoints).find(([name, query]) => {
            const queryText = typeof query === 'string' ? query : String(query);
            return name === 'mobile' && queryText.includes('max-width');
          });
          if (mobileBreakpoint && window.matchMedia(`(${mobileBreakpoint[1]})`).matches) {
              currentBreakpoint = 'mobile';
          }
      }

      if (activeBreakpointName !== currentBreakpoint) {
        // console.log('[BreakpointContext] Active breakpoint changed to:', currentBreakpoint, '(width:', width, 'px)');
        setActiveBreakpointName(currentBreakpoint);
      }
    };

    if (typeof window !== 'undefined') {
      calculateBreakpoint(); // Initial calculation
      window.addEventListener('resize', calculateBreakpoint);
      return () => window.removeEventListener('resize', calculateBreakpoint);
    }
  }, [siteSettings.globalStyleVariables?.breakpoints, activeBreakpointName]);

  // console.log('[BreakpointContext] Rendering with activeBreakpointName:', activeBreakpointName);

  return (
    <BreakpointContext.Provider value={{ activeBreakpointName, viewport }}>
      {children}
    </BreakpointContext.Provider>
  );
};

export const useViewport = (): ViewportContextType => {
  const context = useContext(BreakpointContext);
  if (context === undefined) {
    throw new Error('useViewport must be used within a BreakpointProvider');
  }
  return context;
};
