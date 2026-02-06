'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import DataContext, { DataContextValue, PageInfo, NodeDataRequirementState } from './contexts/DataContext';
import { PageDefinition, DataRequirementConfig, RQLQuery } from '@/OSDL.types';
import { 
  generateDataRequirementCacheKey, 
  generateNodeRequirementStateKey, 
  fetchDataFromSource 
} from './utils/dataRequirementUtils';
import { resolveDataBindingsInObject } from './utils/nodeProcessor';
import { RQL_ENDPOINT } from '@/services/api/rql';
import { useSession } from '@/context/Session';
import { useNavigation } from '@/app/shop-manager/website/edit/iframe/utils/context/NavigationProvider';
import { getSiteSettings } from '@/services/api/osdl/osdl';

interface OkiynaiPageWithDataContextProps {
  pageDefinition: PageDefinition;
  routeParams?: Record<string, string>;
  children: React.ReactNode;
  userInfoOverride?: any; // allow editor to provide dummy user info
}

const DYNAMIC_ROUTE_SEGMENT_REGEX = /\[([^\]]+)\]/g;
const ROUTE_TEMPLATE_BINDING_REGEX = /{{\s*(?:route\.|page\.routeParams\.|page\.slugs\.|page\.slug(?:\b|Name\b))/;

type ExpectedInitRqlReason =
  | 'missing-endpoint'
  | 'missing-route-params'
  | 'empty-queries';

const extractDynamicRouteParamNames = (route: string | undefined): string[] => {
  if (!route) return [];
  const names = new Set<string>();
  const matches = route.matchAll(DYNAMIC_ROUTE_SEGMENT_REGEX);
  for (const match of matches) {
    if (match[1]) names.add(match[1]);
  }
  return Array.from(names);
};

const hasRouteBindingInValue = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return ROUTE_TEMPLATE_BINDING_REGEX.test(value);
  }

  if (Array.isArray(value)) {
    return value.some((entry) => hasRouteBindingInValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((entry) => hasRouteBindingInValue(entry));
  }

  return false;
};

const logExpectedInitRql = (reason: ExpectedInitRqlReason, details?: Record<string, unknown>) => {
  console.info(`[DataContext][RQL][expected-init:${reason}]`, details || {});
};

const logActionableRql = (message: string, details?: unknown) => {
  console.error(`[DataContext][RQL][actionable] ${message}`, details);
};

// Cache for data requirements to avoid refetching identical requests
interface RequirementCacheEntry {
  data: any;
  error: Error | null;
  timestamp: number;
}

const OkiynaiPageWithDataContext: React.FC<OkiynaiPageWithDataContextProps> = ({
  pageDefinition,
  routeParams,
  children,
  userInfoOverride,
}) => {
  const [mainPageData, setMainPageData] = useState<any>(null);
  const [isMainPageDataLoading, setIsMainPageDataLoading] = useState<boolean>(true);
  const [mainPageDataError, setMainPageDataError] = useState<Error | null>(null);
  
  // State for shop data fetched from subdomain (when not in editor mode)
  const [shopDataFromSubdomain, setShopDataFromSubdomain] = useState<any>(null);
  
  // Get navigation context to detect if we're in editor mode
  let isEditMode = false;
  try {
    const navigationContext = useNavigation();
    isEditMode = navigationContext.isEditMode;
  } catch {
    // If NavigationProvider is not available, we're not in edit mode
    isEditMode = false;
  }
  
  // Only use session if we're not in editor mode, or if we have a userInfoOverride
  const { shop, user } = useSession();
  
  // State to trigger refetch
  const [refetchIndex, setRefetchIndex] = useState(0);

  // Enhanced state for dataRequirements
  const [observedNodeRequirements, setObservedNodeRequirements] = useState<Record<string, NodeDataRequirementState>>({});
  
  // Cache for data requirements (using useRef to persist across renders)
  const requirementCache = useRef<Map<string, RequirementCacheEntry>>(new Map());

  const dynamicRouteParamNames = useMemo(
    () => extractDynamicRouteParamNames(pageDefinition.route),
    [pageDefinition.route]
  );

  const routeResolution = useMemo(() => {
    if (!dynamicRouteParamNames.length) {
      return {
        params: routeParams || {},
        missingDynamicParams: [] as string[],
      };
    }

    const explicitRouteParams = routeParams || {};
    const persistedSlugOverrides =
      pageDefinition.systemPageProps &&
      typeof pageDefinition.systemPageProps.slugOverrides === 'object' &&
      pageDefinition.systemPageProps.slugOverrides !== null
        ? (pageDefinition.systemPageProps.slugOverrides as Record<string, string>)
        : {};

    const merged: Record<string, string> = {};
    const missingDynamicParams: string[] = [];
    dynamicRouteParamNames.forEach((paramName) => {
      const explicit = explicitRouteParams[paramName];
      const persisted = persistedSlugOverrides[paramName];

      if (typeof explicit === 'string' && explicit.trim()) {
        merged[paramName] = explicit.trim();
        return;
      }

      if (typeof persisted === 'string' && persisted.trim()) {
        merged[paramName] = persisted.trim();
        return;
      }

      // Standalone-safe fallback so templates can always read a slug value.
      merged[paramName] = `sample-${paramName}`;
      missingDynamicParams.push(paramName);
    });

    return {
      params: merged,
      missingDynamicParams,
    };
  }, [dynamicRouteParamNames, pageDefinition.systemPageProps, routeParams]);

  const resolvedRouteParams = routeResolution.params;

  const pageInfo: PageInfo = useMemo(() => {
    const firstSlugName = Object.keys(resolvedRouteParams)[0];
    const firstSlugValue = firstSlugName ? resolvedRouteParams[firstSlugName] : undefined;

    return {
      id: pageDefinition.id,
      name: pageDefinition.name,
      route: pageDefinition.route,
      routeParams: resolvedRouteParams,
      slugName: firstSlugName,
      slug: firstSlugValue,
      slugs: resolvedRouteParams,
    };
  }, [pageDefinition.id, pageDefinition.name, pageDefinition.route, resolvedRouteParams]);

  // User info from session (can be overridden by editor)
  // In editor mode, default to unauthenticated unless userInfoOverride is provided
  const userInfo = useMemo(() => {
    if (userInfoOverride) {
      return userInfoOverride;
    }
    
    if (isEditMode) {
      // In editor mode, default to unauthenticated view
      return {
        isAuthenticated: false,
        profile: null,
      };
    }
    
    // Outside editor mode, use actual session
    return {
      isAuthenticated: !!user,
      profile: user,
    };
  }, [userInfoOverride, user, isEditMode]);

  // Function to get subdomain from cookies
  const getSubdomainFromCookies = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cookieSubdomain = document.cookie
        .split('; ')
        .find(row => row.startsWith('subdomain=') || row.startsWith('subdomainValue='))
        ?.split('=')[1];
      
      return cookieSubdomain || null;
    } catch (error) {
      console.warn('[DataContext] Could not read cookies:', error);
      return null;
    }
  }, []);

  // Function to fetch shop data from subdomain when not in editor mode
  const fetchShopDataFromSubdomain = useCallback(async () => {
    if (isEditMode) return; // Don't fetch in editor mode
    
    const subdomain = getSubdomainFromCookies();
    console.log('[DataContext] Fetching shop data from subdomain:', subdomain);
    if (!subdomain) return;
    
    try {
      console.log('[DataContext] Fetching shop data from subdomain:', subdomain);
      const result = await getSiteSettings({ subdomain });
      
      if (result.success && result.data) {
        setShopDataFromSubdomain(result.data);
        console.log('[DataContext] Shop data fetched successfully:', result.data);
      } else {
        console.warn('[DataContext] Failed to fetch shop data:', result.error);
      }
    } catch (error) {
      console.error('[DataContext] Error fetching shop data from subdomain:', error);
    }
  }, [isEditMode, getSubdomainFromCookies]);

  // NEW: Function to trigger a refetch
  const refetchMainPageData = useCallback(() => {
    console.log('[DataContext] Triggering main page data refetch...');
    setRefetchIndex(prev => prev + 1);
  }, []);

  // Fetch main page data effect
  useEffect(() => {
    const fetchData = async () => {
      setIsMainPageDataLoading(true);
      setMainPageDataError(null);

      if (!pageDefinition.dataSource) {
        console.log('[DataContext] No page-level dataSource configured, setting loading to false.');
        setMainPageData(null);
        setIsMainPageDataLoading(false);
        return;
      }

      if (pageDefinition.dataSource.type === 'rql') {
        console.log('[DataContext] RQL dataSource found, attempting to fetch...');
        const { queries } = pageDefinition.dataSource.sourceParams;
        const queryEntries = Object.entries(queries || {}).filter(([key]) => key.trim().length > 0);

        if (!RQL_ENDPOINT) {
          logExpectedInitRql('missing-endpoint', {
            pageId: pageDefinition.id,
            route: pageDefinition.route,
          });
          setMainPageData(null);
          setIsMainPageDataLoading(false);
          return;
        }

        if (queryEntries.length === 0) {
          logExpectedInitRql('empty-queries', {
            pageId: pageDefinition.id,
            route: pageDefinition.route,
          });
          setMainPageData(null);
          setIsMainPageDataLoading(false);
          return;
        }

        const templatingContext = {
          page: pageInfo,
          user: userInfo,
          // Expose route params at root-level alias for templates like {{route.productId}}
          // NOTE: using page.routeParams would do the same, but route.productId
          // is the one that we have in the classic theme, and im too lazy
          // to change it rn.
          route: pageInfo.routeParams || {},
        };

        const hasRouteBoundQueries = queryEntries.some(([, query]) =>
          hasRouteBindingInValue((query as RQLQuery | undefined)?.params)
        );
        if (hasRouteBoundQueries && routeResolution.missingDynamicParams.length > 0) {
          logExpectedInitRql('missing-route-params', {
            pageId: pageDefinition.id,
            route: pageDefinition.route,
            missingParams: routeResolution.missingDynamicParams,
          });
          setMainPageData(null);
          setIsMainPageDataLoading(false);
          return;
        }

        const resolvedQueries: Record<string, RQLQuery> = {};
        const invalidQueryKeys: string[] = [];

        for (const [queryKey, queryValue] of queryEntries) {
          const query = queryValue as RQLQuery | undefined;
          if (
            !query ||
            typeof query !== 'object' ||
            !query.contract ||
            !query.select ||
            typeof query.select !== 'object'
          ) {
            invalidQueryKeys.push(queryKey);
            continue;
          }

          resolvedQueries[queryKey] = {
            ...query,
            params: query.params ? resolveDataBindingsInObject(query.params, templatingContext) : undefined,
          };
        }

        if (invalidQueryKeys.length > 0) {
          const invalidQueriesError = new Error(
            `Invalid RQL query definitions for keys: ${invalidQueryKeys.join(', ')}`
          );
          logActionableRql(invalidQueriesError.message, {
            pageId: pageDefinition.id,
            route: pageDefinition.route,
          });
          setMainPageDataError(invalidQueriesError);
          setMainPageData(null);
          setIsMainPageDataLoading(false);
          return;
        }

        try {
          const response = await fetch(RQL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resolvedQueries),
          });

          if (!response.ok) {
            throw new Error(`RQL HTTP error! status: ${response.status}`);
          }
          const result = await response.json();
          if (result.errors && result.errors.length > 0) {
            const errorMessage = result.errors.map((e: any) => `QueryKey "${e.queryKey}": ${e.message} (${e.code})`).join('; ');
            throw new Error(`RQL errors: ${errorMessage}`);
          }

          console.log('[DataContext] RQL data fetched:', result.data);
          setMainPageData(result.data);
        } catch (error) {
          logActionableRql('Error fetching page-level RQL data.', error);
          setMainPageDataError(error instanceof Error ? error : new Error('Failed to fetch page data'));
          setMainPageData(null);
        } finally {
          setIsMainPageDataLoading(false);
        }

      } else {
        // For non-RQL data sources, just set no data and fail gracefully
        console.log('[DataContext] Non-RQL dataSource found, no data available:', pageDefinition.dataSource);
        setMainPageData(null);
        setIsMainPageDataLoading(false);
      }
    };

    fetchData();
  }, [
    pageDefinition.id,
    pageDefinition.dataSource,
    pageDefinition.route,
    pageInfo,
    userInfo,
    routeResolution,
    refetchIndex,
  ]);

  // Effect to fetch shop data from subdomain when not in editor mode
  useEffect(() => {
    fetchShopDataFromSubdomain();
  }, [fetchShopDataFromSubdomain]);

  // Function to fetch data for a node's specific requirements
  const fetchNodeRequirement = useCallback(async (
    nodeId: string, 
    requirementConfig: DataRequirementConfig
  ): Promise<{ data: any; error: Error | null }> => {
    const { key, source, blocking, cacheDurationMs, defaultValue } = requirementConfig;
    const stateKey = generateNodeRequirementStateKey(nodeId, key);
    const cacheKey = generateDataRequirementCacheKey(source);
    
    console.log(`[DataContext] fetchNodeRequirement called for node ${nodeId}, requirement ${key}`);
    
    // Update state to indicate loading
    setObservedNodeRequirements(prev => ({
      ...prev,
      [stateKey]: {
        data: prev[stateKey]?.data || defaultValue,
        isLoading: true,
        error: null,
        timestamp: Date.now(),
      }
    }));

    // Check cache first
    const cachedEntry = requirementCache.current.get(cacheKey);
    const now = Date.now();
    const isCacheValid = cachedEntry && 
      (cacheDurationMs ? (now - cachedEntry.timestamp < cacheDurationMs) : true);

    if (isCacheValid && cachedEntry) {
      console.log(`[DataContext] Using cached data for requirement ${key}`);
      const result = { data: cachedEntry.data, error: cachedEntry.error };
      
      // Update state with cached result
      setObservedNodeRequirements(prev => ({
        ...prev,
        [stateKey]: {
          data: cachedEntry.data,
          isLoading: false,
          error: cachedEntry.error,
          timestamp: cachedEntry.timestamp,
        }
      }));
      
      return result;
    }

    // Fetch new data
    try {
      console.log(`[DataContext] Fetching new data for requirement ${key}, source:`, source);
      const fetchedData = await fetchDataFromSource(source);
      
      const cacheEntry: RequirementCacheEntry = {
        data: fetchedData,
        error: null,
        timestamp: now,
      };
      
      // Cache the result
      requirementCache.current.set(cacheKey, cacheEntry);
      
      // Update state with successful result
      setObservedNodeRequirements(prev => ({
        ...prev,
        [stateKey]: {
          data: fetchedData,
          isLoading: false,
          error: null,
          timestamp: now,
        }
      }));
      
      console.log(`[DataContext] Successfully fetched data for requirement ${key}:`, fetchedData);
      return { data: fetchedData, error: null };
      
    } catch (error) {
      console.error(`[DataContext] Failed to fetch data for requirement ${key}:`, error);
      const errorObj = error instanceof Error ? error : new Error('Failed to fetch requirement data');
      
      const cacheEntry: RequirementCacheEntry = {
        data: defaultValue,
        error: errorObj,
        timestamp: now,
      };
      
      // Cache the error (with default value) for a shorter duration
      requirementCache.current.set(cacheKey, cacheEntry);
      
      // Update state with error result
      setObservedNodeRequirements(prev => ({
        ...prev,
        [stateKey]: {
          data: defaultValue,
          isLoading: false,
          error: errorObj,
          timestamp: now,
        }
      }));
      
      return { data: defaultValue, error: errorObj };
    }
  }, []);

  // Function to get the current state of a specific node requirement  
  const observedNodeRequirementsRef = useRef(observedNodeRequirements);
  observedNodeRequirementsRef.current = observedNodeRequirements;
  
  const getNodeRequirementState = useCallback((nodeId: string, requirementKey: string): NodeDataRequirementState | undefined => {
    const stateKey = generateNodeRequirementStateKey(nodeId, requirementKey);
    return observedNodeRequirementsRef.current[stateKey];
  }, []); // Stable function with no dependencies

  const contextValue: DataContextValue = useMemo(() => ({
    mainPageData,
    isMainPageDataLoading,
    mainPageDataError,
    pageInfo,
    userInfo,
    siteInfo: {
      shop: {
        id: routeParams?.shopId || 
            (mainPageData as any)?.shop?.id || 
            (mainPageData as any)?.shopId || 
            (shop as any)?.id ||
            shopDataFromSubdomain?.shopId, // Use shopId from subdomain API response
        name: (mainPageData as any)?.shop?.name || 
              shopDataFromSubdomain?.name || 
              'Unknown Shop',
      }
    },
    fetchNodeRequirement,
    observedNodeRequirements,
    getNodeRequirementState,
    refetchMainPageData,
  }), [
    mainPageData, 
    isMainPageDataLoading, 
    mainPageDataError, 
    pageInfo, 
    userInfo,
    shopDataFromSubdomain, // Add shop data from subdomain
    // Remove fetchNodeRequirement and getNodeRequirementState from dependencies
    observedNodeRequirements,
    refetchMainPageData,
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export default OkiynaiPageWithDataContext; 
