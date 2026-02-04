'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useSiteSettings } from './SiteSettingsContext'; // Import useSiteSettings

// --- DEVELOPMENT ONLY: Locale Forcing ---
// Set this to a supported locale string (e.g., 'es-ES', 'ar-AE') to force it during development.
// Set to null or undefined in production or when not needing to force a locale.
// const DEV_FORCE_LOCALE: string | null = null; // Example: 'ar-AE'; 
const DEV_FORCE_LOCALE: string | null = null; // Example: 'ar-AE'; 
// --- END DEVELOPMENT ONLY ---

interface LocaleContextType {
  activeLocale: string;
  supportedLocales: string[];
  setLocale: (locale: string) => void;
  isRTL: boolean;
  // localizedStrings: Record<string, string>; // For later if needed
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
  initialActiveLocale: string; // This will be determined server-side
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ 
  children, 
  initialActiveLocale 
}) => {
  const siteSettings = useSiteSettings(); // Get siteSettings from context
  
  const determineEffectiveLocale = () => {
    if (DEV_FORCE_LOCALE && siteSettings.supportedLocales?.includes(DEV_FORCE_LOCALE)) {
      console.warn(`[LocaleContext] DEVELOPMENT: Locale is forced to ${DEV_FORCE_LOCALE}`);
      return DEV_FORCE_LOCALE;
    }
    return initialActiveLocale;
  };

  const [activeLocale, setActiveLocaleInternal] = useState<string>(determineEffectiveLocale());

  // Ensure supportedLocales always has a fallback
  const supportedLocales = siteSettings.supportedLocales && siteSettings.supportedLocales.length > 0 
    ? siteSettings.supportedLocales 
    : [siteSettings.defaultLocale || 'en-US'];

  // Effect to update internal state if initialActiveLocale prop changes (e.g., due to navigation)
  useEffect(() => {
    const effectiveInitial = determineEffectiveLocale();
    if (effectiveInitial !== activeLocale) {
      if (supportedLocales.includes(effectiveInitial)) {
        setActiveLocaleInternal(effectiveInitial);
      } else {
        // Fallback if the initial one (somehow) isn't supported, though RootLayout should ensure this.
        setActiveLocaleInternal(siteSettings.defaultLocale || 'en-US');
      }
    }
    // We only want to re-run this if initialActiveLocale changes, 
    // DEV_FORCE_LOCALE is constant during a session typically.
  }, [initialActiveLocale, siteSettings.defaultLocale, siteSettings.supportedLocales]); // activeLocale removed to prevent loop with determineEffectiveLocale

  const setLocale = useCallback((locale: string) => {
    if (supportedLocales.includes(locale)) {
      if (DEV_FORCE_LOCALE) {
        console.warn('[LocaleContext] Locale change attempt ignored because DEV_FORCE_LOCALE is active.');
        return;
      }
      setActiveLocaleInternal(locale);
      // Persist to cookie
      document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`; // Max-age: 1 year
      console.log(`[LocaleContext] Locale changed to: ${locale} and cookie set.`);
      // Optional: To reflect URL changes if you also support path-based localization later,
      // or to force a server-side refresh if absolutely necessary (usually not needed for locale context change).
      // window.location.href = `/${locale}${window.location.pathname.substring(window.location.pathname.indexOf('/', 1))}`;
    } else {
      console.warn(`[LocaleContext] Attempted to set unsupported locale ${locale}. Supported: ${supportedLocales.join(', ')}`);
    }
  }, [supportedLocales, siteSettings.defaultLocale]); // Added siteSettings.defaultLocale dependency

  const isRTL = activeLocale.startsWith('ar') || activeLocale.startsWith('he'); // Added 'he' for Hebrew as another example

  // Log current active locale considering forced one
  console.log('[LocaleContext] Rendering with effective activeLocale:', activeLocale, 'Supported:', supportedLocales, 'isRTL:', isRTL, DEV_FORCE_LOCALE ? `(DEV_FORCE_LOCALE: ${DEV_FORCE_LOCALE})` : '');

  return (
    <LocaleContext.Provider value={{ activeLocale, supportedLocales, setLocale, isRTL }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextType => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
