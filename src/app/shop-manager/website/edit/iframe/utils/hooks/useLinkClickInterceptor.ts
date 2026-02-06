'use client';

import { useEffect } from 'react';

interface LinkClickInterceptorOptions {
  disableNavigation?: boolean;
}

export function useLinkClickInterceptor(
  onNavigate: (url: string, method: string) => boolean,
  options?: LinkClickInterceptorOptions
) {
  useEffect(() => {
    // Only intercept link clicks (since those are automatic)
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && link.href) {
        // In inspect mode, block default link behavior but allow propagation
        // so editor wrappers can still handle element selection.
        if (options?.disableNavigation) {
          e.preventDefault();
          return;
        }

        if (onNavigate(link.href, 'link.click')) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    document.addEventListener('click', handleClick, true);

    // Cleanup
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [onNavigate, options?.disableNavigation]);
}
