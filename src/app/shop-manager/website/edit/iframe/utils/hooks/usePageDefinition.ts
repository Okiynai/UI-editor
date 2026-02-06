import { useState, useCallback, useRef } from 'react';
import { PageDefinition } from "@/OSDL/OSDL.types";
import { getPageDefinition, getManagerPageDefinition } from "@/services/api/osdl/osdl";
import { getSiteById } from "@/services/api/shop-manager/sites";

// DEMOS for testing
import { getBrandBreederDemo } from "@/osdl-demos/brand-breeder-demo";
import { getDemoPageDefinition } from "@/osdl-demos/default-demo";
import { getSmolDemoPageDefinition } from "@/osdl-demos/smol-demo";
import { getCheckoutDemoPageDefinition } from "@/osdl-demos/checkout-demo";
import { getOkiynaiClassicDemo } from "@/osdl-demos/okiynai-classic-demo";
import { getUserSettingsDemoPageDefinition } from "@/osdl-demos/user-settings-demo";

interface UsePageDefinitionReturn {
  pageDefinition: PageDefinition | null;
  originalPageDefinition: PageDefinition | null;
  isLoading: boolean;
  error: string | null;
  loadPage: (pageRoute: string, subDomain: string) => Promise<PageDefinition | null>;
  setPageDefinition: React.Dispatch<React.SetStateAction<PageDefinition | null>>;
  setOriginalPageDefinition: React.Dispatch<React.SetStateAction<PageDefinition | null>>;
  clearError: () => void;
  updateCachedPage: (pageId: string, page: PageDefinition, original: PageDefinition) => void;
}

export function usePageDefinition(): UsePageDefinitionReturn {
  const [pageDefinition, setPageDefinition] = useState<PageDefinition | null>(null);
  const [originalPageDefinition, setOriginalPageDefinition] = useState<PageDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track loaded pages in memory to avoid refetching and preserve edits
  const loadedPagesRef = useRef<{ [key: string]: { page: PageDefinition, original: PageDefinition } }>({});

  // Check if we should use demo mode (this should match the useDemo variable in the iframe page)
  const useDemo = null as 'brand-breeder' | 'default' | 'smol' | 'user-settings' | 'checkout' | 'okiynai-classic' | 'product-page' | null ;
  
  // NEW: Use demo content (nodes and data sources) but keep real page metadata
  const useDemoContent = false;

  const loadPage = useCallback(async (pageRoute: string, subDomain: string): Promise<PageDefinition | null> => {
    const cacheKey = pageRoute;
    const cachedPage = loadedPagesRef.current[cacheKey];

    // 1. If already loaded and edited, restore from memory
    if (cachedPage) {
      setPageDefinition(cachedPage.page);
      setOriginalPageDefinition(cachedPage.original);
      setIsLoading(false);
      setError(null);
      return cachedPage.page;
    }

    // 2. Check if we should use demo mode (full demo)
    if (useDemo && !useDemoContent) {
      setIsLoading(true);
      setError(null);
      setPageDefinition(null);
      setOriginalPageDefinition(null);

      try {
        let demoPage: PageDefinition;
        
        const routeParams = { subdomain: subDomain, path: pageRoute };
        
        switch (useDemo) {
          case 'brand-breeder':
            demoPage = getBrandBreederDemo(routeParams);
            break;
          case 'default':
            demoPage = getDemoPageDefinition(routeParams);
            break;
          case 'smol':
            demoPage = getSmolDemoPageDefinition(routeParams);
            break;
          case 'user-settings':
            demoPage = getUserSettingsDemoPageDefinition(routeParams);
            break;
          case 'checkout':
            demoPage = getCheckoutDemoPageDefinition(routeParams);
            break;
          case 'okiynai-classic':
            demoPage = getOkiynaiClassicDemo(routeParams);
            break;
          case 'product-page':
            // Lazy import to avoid increasing initial bundle unnecessarily
            const { getProductPageDemo } = await import('@/osdl-demos/product-page-demo');
            demoPage = getProductPageDemo(routeParams);
            break;
          default:
            throw new Error(`Unknown demo type: ${useDemo}`);
        }

        setPageDefinition(demoPage);
        setOriginalPageDefinition(demoPage);

        loadedPagesRef.current[cacheKey] = {
          page: demoPage,
          original: demoPage
        };

        setIsLoading(false);
        setError(null);
        return demoPage;
      } catch (err: any) {
        setError(err.message || 'Failed to load demo page');
        setIsLoading(false);
        return null;
      }
    }

    // 3. NEW: Hybrid mode - fetch real page but use demo content
    if (useDemoContent && useDemo) {
      setIsLoading(true);
      setError(null);
      setPageDefinition(null);
      setOriginalPageDefinition(null);

      try {
        // First, fetch the real page to get its metadata
        const realPageResult = await getPageDefinition({ subdomain: subDomain, path: pageRoute });
        
        if (!realPageResult.success || !realPageResult.data) {
          setError(realPageResult.error || 'Failed to fetch real page metadata');
          setIsLoading(false);
          return null;
        }

        // Get demo content based on the demo type
        const routeParams = { subdomain: subDomain, path: pageRoute };
        let demoPage: PageDefinition;
        
        switch (useDemo) {
          case 'brand-breeder':
            demoPage = getBrandBreederDemo(routeParams);
            break;
          case 'default':
            demoPage = getDemoPageDefinition(routeParams);
            break;
          case 'smol':
            demoPage = getSmolDemoPageDefinition(routeParams);
            break;
          case 'user-settings':
            demoPage = getUserSettingsDemoPageDefinition(routeParams);
            break;
          case 'checkout':
            demoPage = getCheckoutDemoPageDefinition(routeParams);
            break;
          case 'okiynai-classic':
            demoPage = getOkiynaiClassicDemo(routeParams);
            break;
          default:
            throw new Error(`Unknown demo type: ${useDemo}`);
        }

        // Create hybrid page: real metadata + demo content
        const hybridPage: PageDefinition = {
          ...realPageResult.data, // Keep real page metadata (id, name, route, etc.)
          nodes: demoPage.nodes, // Use demo nodes
          dataSource: demoPage.dataSource // Use demo data source
        };

        setPageDefinition(hybridPage);
        setOriginalPageDefinition(hybridPage);

        loadedPagesRef.current[cacheKey] = {
          page: hybridPage,
          original: hybridPage
        };

        setIsLoading(false);
        setError(null);
        return hybridPage;
      } catch (err: any) {
        setError(err.message || 'Failed to load hybrid page');
        setIsLoading(false);
        return null;
      }
    }

    // 4. Otherwise, fetch using manager page-definition by siteId if available
    setIsLoading(true);
    setError(null);
    setPageDefinition(null);
    setOriginalPageDefinition(null);

    try {
      // Resolve siteId from iframe URL
      const url = new URL(window.location.href);
      const siteIdParam = url.searchParams.get('siteid');

      let result;
      if (siteIdParam) {
        result = await getManagerPageDefinition({ siteId: siteIdParam, path: pageRoute });
      } else {
        // Fallback to subdomain-based public endpoint
        result = await getPageDefinition({ subdomain: subDomain, path: pageRoute });
      }
      if (result.success && result.data) {
        setPageDefinition(result.data);
        setOriginalPageDefinition(result.data);

        loadedPagesRef.current[cacheKey] = {
          page: result.data,
          original: result.data
        };

        setIsLoading(false);
        setError(null);
        return result.data;
      } else {
        setError(result.error || 'Failed to fetch page');
        setIsLoading(false);
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setIsLoading(false);
      return null;
    }
  }, [useDemo, useDemoContent]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const updateCachedPage = useCallback((pageId: string, page: PageDefinition, original: PageDefinition) => {
    loadedPagesRef.current[pageId] = { page, original };
  }, []);

  return {
    pageDefinition,
    originalPageDefinition,
    isLoading,
    error,
    loadPage,
    setPageDefinition,
    setOriginalPageDefinition,
    clearError,
    updateCachedPage
  };
} 
