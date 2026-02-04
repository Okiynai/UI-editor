'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { SiteSettings } from '@/OSDL.types';
import { getSiteSettings } from '@/services/api/osdl/osdl';

// Brand Breeder Site Settings
const mockSiteSettings: SiteSettings = {
  schemaVersion: 'osdl_v3.1',
  name: 'Brand Breeder',
  logoUrl: '/path/to/logo.png',
  faviconUrl: '/path/to/favicon.ico',
  defaultLocale: 'en-US',
  supportedLocales: ['en-US', 'es-ES', 'ar-AE'],
  paramDefinitions: {
    brandColor: {
      type: 'color',
      label: 'Brand Color',
      defaultValue: '#e6b800'
    },
    bodyFont: {
      type: 'font',
      label: 'Body Font',
      defaultValue: 'Inter, sans-serif'
    }
  },
  globalStyleVariables: {
    colors: {
      primary: '#e6b800',       // Golden yellow
      primaryDarker: '#d4af37', // Darker gold
      secondary: '#2c2c2c',     // Dark grey/black
      accent: '#f8f6f0',        // Cream/beige
      
      textLight: '#ffffff',     // Pure white
      textDark: '#2c2c2c',      // Dark grey/black
      textMedium: '#666666',    // Medium grey

      backgroundDark: '#2c2c2c', // Dark grey/black
      backgroundMedium: '#333333', // Slightly lighter dark
      backgroundLight: '#f8f6f0', // Cream/beige main background
      backgroundSubtle: '#f0f0f0', // Subtle grey

      success: '#22c55e',
      warning: '#facc15',
      error: '#ef4444',
    },
    fonts: {
      heading: 'Inter, sans-serif',
      body: 'Inter, sans-serif'
    },
    spacing: {
      xs: '4px',
      small: '8px',
      medium: '16px',
      large: '32px',
      xl: '48px',
      xxl: '64px'
    },
    breakpoints: {
      mobile: 'max-width: 767px',
      tablet: 'min-width: 768px and max-width: 1023px',
      laptop: 'min-width: 1024px and max-width: 1439px',
      desktop: 'min-width: 1440px',
      wide: 'min-width: 1920px'
    }
  },
  seo: {
    defaultTitle: 'Brand Breeder',
    titleSuffix: ' | Brand Breeder'
  }
};

// Previous Teal-Accented Mock SiteSettings data (commented out)
/*
const mockSiteSettings: SiteSettings = {
  schemaVersion: 'osdl_v3.1',
  name: 'Okiynai Teal Site',
  logoUrl: '/path/to/logo.png',
  faviconUrl: '/path/to/favicon.ico',
  defaultLocale: 'en-US',
  supportedLocales: ['en-US', 'es-ES', 'ar-AE'],
  paramDefinitions: {
    brandColor: {
      type: 'color',
      label: 'Brand Color',
      defaultValue: '#14b8a6' // teal-500 from Tailwind palette for reference
    },
    bodyFont: {
      type: 'font',
      label: 'Body Font',
      defaultValue: 'Roboto, sans-serif' // Keep Roboto for body
    }
  },
  globalStyleVariables: {
    colors: {
      primary: '#14b8a6',       // teal-500
      primaryDarker: '#0d9488', // teal-600 (for hover states maybe)
      secondary: '#475569',     // slate-600 (as a complementary neutral)
      accent: '#f59e0b',        // amber-500 (for a pop of contrasting accent if needed)
      
      textLight: '#f8fafc',     // slate-50 (very light for dark backgrounds)
      textDark: '#1e293b',      // slate-800 (dark for light backgrounds)
      textMedium: '#64748b',    // slate-500 (for subtitles or less important text)

      backgroundDark: '#0f172a', // slate-900 (very dark, almost black)
      backgroundMedium: '#1e293b',// slate-800 (a slightly lighter dark)
      backgroundLight: '#f1f5f9', // slate-100 (very light grey for main content)
      backgroundSubtle: '#e2e8f0', // slate-200 (for subtle cards or sections)

      success: '#22c55e',      // green-500
      warning: '#facc15',      // yellow-400
      error: '#ef4444',        // red-500
    },
    fonts: {
      heading: 'Georgia, serif', // Keep Georgia for headings
      body: 'Roboto, sans-serif'
    },
    spacing: {
      xs: '4px',
      small: '8px',
      medium: '16px',
      large: '32px',
      xl: '48px',
      xxl: '64px'
    },
    breakpoints: {
      mobile: 'max-width: 767px',
      tablet: 'min-width: 768px and max-width: 1023px',
      laptop: 'min-width: 1024px and max-width: 1439px',
      desktop: 'min-width: 1440px',
      wide: 'min-width: 1920px'
    }
  },
  seo: {
    defaultTitle: 'Okiynai Teal Site',
    titleSuffix: ' | Okiynai'
  }
};
*/

export const SiteSettingsContext = createContext<SiteSettings | null>(null);

export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
};

interface SiteSettingsProviderProps {
  children: ReactNode;
  settings?: SiteSettings;
  subdomain?: string;
  host?: string;
  enableDataFetching?: boolean; // Flag to enable/disable real data fetching
  forceClientSideFetch?: boolean; // Flag to force client-side fetching even if settings provided
  enforcedSettings?: SiteSettings;
}

export const SiteSettingsProvider: React.FC<SiteSettingsProviderProps> = ({ 
  children, 
  settings, 
  subdomain, 
  host,
  enableDataFetching = false,
  forceClientSideFetch = false,
  enforcedSettings=null
}) => {
  const [fetchedSettings, setFetchedSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to fetch settings from API when enabled
  useEffect(() => {
    if (!enableDataFetching || (settings && !forceClientSideFetch && !enforcedSettings)) {
      // Skip fetching if disabled or settings already provided (unless forced)
      return;
    }

    // Try to get subdomain from cookies if not provided via props
    let effectiveSubdomain = subdomain;
    let effectiveHost = host;
    
    if (!effectiveSubdomain && !effectiveHost) {
      // Check cookies for subdomain
      try {
        const cookieSubdomain = document.cookie
          .split('; ')
          .find(row => row.startsWith('subdomain=') || row.startsWith('subdomainValue='))
          ?.split('=')[1];
        
        if (cookieSubdomain) {
          effectiveSubdomain = cookieSubdomain;
          console.log('[SiteSettingsProvider] Found subdomain in cookies:', cookieSubdomain);
        }
      } catch (error) {
        console.warn('[SiteSettingsProvider] Could not read cookies:', error);
      }
    }

    if (!effectiveSubdomain && !effectiveHost) {
      console.warn('[SiteSettingsProvider] No subdomain or host available for data fetching');
      return;
    }

    const fetchSettings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('[SiteSettingsProvider] Fetching site settings...', { subdomain: effectiveSubdomain, host: effectiveHost });
        
        const result = await getSiteSettings({
          subdomain: effectiveSubdomain,
          host: effectiveHost
        });

        if (result.success && result.data) {
          console.log('[SiteSettingsProvider] Successfully fetched site settings:', result.data);
          setFetchedSettings(result.data);
        } else {
          console.warn('[SiteSettingsProvider] Failed to fetch site settings, using mock data:', result.error);
          setError(result.error || 'Failed to fetch site settings');
          setFetchedSettings(null); // Will fall back to mock
        }
      } catch (err) {
        console.error('[SiteSettingsProvider] Error fetching site settings:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setFetchedSettings(null); // Will fall back to mock
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [enableDataFetching, subdomain, host, settings]);

  // Determine which settings to use (priority: provided settings > fetched settings > mock settings)
  const value = enforcedSettings || settings || fetchedSettings;

  // Log which settings source we're using for debugging
  useEffect(() => {
    if (enforcedSettings) {
      console.log('[SiteSettingsProvider] Using enforced settings');
    } else if (settings) {
      console.log('[SiteSettingsProvider] Using provided settings');
    } else if (fetchedSettings) {
      console.log('[SiteSettingsProvider] Using fetched settings from API');
    } else {
      console.log('[SiteSettingsProvider] Using mock settings');
    }
  }, [settings, fetchedSettings]);

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

// Hook to access site settings loading state (useful for debugging)
export const useSiteSettingsState = () => {
  return {
    settings: useSiteSettings(),
    // We don't expose loading state in the main hook to avoid breaking existing code
    // but we could add it here if needed
  };
};
