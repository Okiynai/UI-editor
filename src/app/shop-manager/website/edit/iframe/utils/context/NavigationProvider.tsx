'use client';

/**
 * NavigationProvider Context
 * 
 * This context provides special navigation functions designed specifically for the AI agent
 * that writes code in the shop builder. These functions handle navigation internally within
 * the builder while also providing all the flexibility needed for navigation in the actual page.
 * 
 * Primary Use Cases:
 * - Button clicks and interactive elements where <a> tags cannot be used
 * - Programmatic navigation triggered by user interactions
 * - Dynamic navigation based on form submissions or conditional logic
 * - Navigation from custom components that need to maintain state
 * 
 * Usage Examples:
 * - navigate('/about', 'router') - SPA navigation using Next.js router
 * - navigate('/about', 'window') - Full page navigation using window.location
 * - goBack('window') - Browser back using window.history
 * - replace('/new-page', 'router') - Replace current route without adding to history
 * 
 */

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { handleInternalNavigation } from '../handleInternalNavigation';
import { buildInternalNavigationPayload } from '@/app/shop-manager/website/edit/shared/navigation';

interface NavigationContextType {
  navigate: (url: string, mode?: 'router' | 'window') => void;
  goBack: (mode?: 'router' | 'window') => void;
  goForward: (mode?: 'router' | 'window') => void;
  replace: (url: string, mode?: 'router' | 'window') => void;
  reload: (mode?: 'router' | 'window') => void;
  isEditMode: boolean;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

interface NavigationProviderProps {
  children: ReactNode;
  pageDefinition?: any;
  devMode?: boolean;
  isEditMode?: boolean; // 🔥 NEW: Edit mode support
}

// Wrapper function to control logging based on dev mode
const devLog = (devMode: boolean, message: string, ...args: any[]) => {
  if (devMode) {
    console.log(`[🔄 Routing] ${message}`, ...args);
  }
};

export function NavigationProvider({ 
  children, 
  pageDefinition, 
  devMode = false, 
  isEditMode = false // Default to normal mode
}: NavigationProviderProps) {
  
  const router = useRouter(); // For actual navigation in normal mode
  
  const isSameOrigin = useCallback((url: string) => {
    try {
      const link = new URL(url, window.location.origin);
      return link.origin === window.location.origin;
    } catch {
      return false;
    }
  }, []);

  // Updated to handle navigation type properly and edit mode
  const handleNavigation = useCallback((url: string, navigationType: 'push' | 'replace', mode: 'router' | 'window' = 'router') => {
    devLog(devMode, 'programmatic navigation', url, navigationType, `mode: ${isEditMode ? 'edit' : 'normal'}`, `navMode: ${mode}`);
    
    if (!isSameOrigin(url)) {
      window.open(url, '_blank', 'noopener');
      devLog(devMode, 'external navigation opened in new tab', url);
      return;
    }

    if (isEditMode) {
      // EDIT MODE: Intercept and send to parent
      handleInternalNavigation(url, pageDefinition, navigationType);
    } else {
      // NORMAL MODE: Do actual navigation
      if (mode === 'window') {
        if (navigationType === 'push') {
          window.location.href = url;
          devLog(devMode, 'window.location.href navigation', url);
        } else {
          window.location.replace(url);
          devLog(devMode, 'window.location.replace navigation', url);
        }
      } else {
        // router mode (default)
        if (navigationType === 'push') {
          router.push(url);
          devLog(devMode, 'actual router.push navigation', url);
        } else {
          router.replace(url);
          devLog(devMode, 'actual router.replace navigation', url);
        }
      }
    }
  }, [pageDefinition, isSameOrigin, devMode, isEditMode, router]);

  // Navigation functions for the LLM to use
  const navigate = useCallback((url: string, mode: 'router' | 'window' = 'router') => {
    handleNavigation(url, 'push', mode);
  }, [handleNavigation]);

  const replace = useCallback((url: string, mode: 'router' | 'window' = 'router') => {
    handleNavigation(url, 'replace', mode);
  }, [handleNavigation]);

  const goBack = useCallback((mode: 'router' | 'window' = 'router') => {
    devLog(devMode, 'goBack called', `mode: ${isEditMode ? 'edit' : 'normal'}`, `navMode: ${mode}`);
    
    if (isEditMode) {
      // EDIT MODE: Send message to parent
      window.parent.postMessage({
        type: 'INTERNAL_NAVIGATION',
        payload: buildInternalNavigationPayload({
          url: window.location.href,
          navigationType: 'back'
        })
      }, '*');
    } else {
      // NORMAL MODE: Actually go back
      if (mode === 'window') {
        window.history.back();
        devLog(devMode, 'window.history.back() called');
      } else {
        router.back();
        devLog(devMode, 'router.back() called');
      }
    }
  }, [devMode, isEditMode, router]);

  const goForward = useCallback((mode: 'router' | 'window' = 'router') => {
    devLog(devMode, 'goForward called', `mode: ${isEditMode ? 'edit' : 'normal'}`, `navMode: ${mode}`);
    
    if (isEditMode) {
      // EDIT MODE: Send message to parent
      window.parent.postMessage({
        type: 'INTERNAL_NAVIGATION',
        payload: buildInternalNavigationPayload({
          url: window.location.href,
          navigationType: 'forward'
        })
      }, '*');
    } else {
      // NORMAL MODE: Actually go forward
      if (mode === 'window') {
        window.history.forward();
        devLog(devMode, 'window.history.forward() called');
      } else {
        router.forward();
        devLog(devMode, 'router.forward() called');
      }
    }
  }, [devMode, isEditMode, router]);

  const reload = useCallback((mode: 'router' | 'window' = 'router') => {
    devLog(devMode, 'reload called', `mode: ${isEditMode ? 'edit' : 'normal'}`, `navMode: ${mode}`);
    
    if (isEditMode) {
      // EDIT MODE: Send message to parent
      window.parent.postMessage({
        type: 'INTERNAL_NAVIGATION',
        payload: buildInternalNavigationPayload({
          url: window.location.href,
          navigationType: 'reload'
        })
      }, '*');
    } else {
      // NORMAL MODE: Actually reload
      if (mode === 'window') {
        window.location.reload();
      } else {
        router.refresh();
      }
    }
  }, [devMode, isEditMode]);

  return (
    <NavigationContext.Provider value={{ 
      navigate, 
      goBack, 
      goForward, 
      replace, 
      reload,
      isEditMode
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
