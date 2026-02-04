'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getCompiledComponent, previewCompileJsx } from '@/services/api/osdl/osdl';
import { useSession } from '@/context/Session';
import { useParams, useSearchParams } from 'next/navigation';
import { useData } from '../contexts/DataContext';

interface DynamicComponentLoaderProps {
  url: string;
  resolvedProps: Record<string, any>;
  nodeId: string;
  fallback?: React.ReactNode;
  /**
   * Optional: If provided, this JSX code will be compiled on the fly for preview/testing.
   * If not provided, the loader will fetch the compiled component as usual.
   */
  jsxCode?: string;
}

// This is a basic spinner placeholder. You can replace it with your SkeletonPlaceholder or a more advanced one.
const DefaultFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px' }}>
    <div style={{
      border: '4px solid rgba(0, 0, 0, 0.1)',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      borderLeftColor: '#09f',
      animation: 'spin 1s ease infinite'
    }}></div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

/**
 * Extract filename from a compiled component URL
 * Handles both full URLs and relative paths
 */
function extractFilenameFromUrl(url: string): string | null {
  try {
    // Handle both full URLs and relative paths
    const urlObj = url.startsWith('http') ? new URL(url) : new URL(url, window.location.origin);
    const pathname = urlObj.pathname;
    
    // Extract filename from path like "/api/v1/osdl/compiled_components/nodeId_timestamp.js"
    const parts = pathname.split('/');
    const filename = parts[parts.length - 1];
    
    // Basic validation - should end with .js and contain underscore
    if (filename.endsWith('.js') && filename.includes('_')) {
      return filename;
    }
    
    return null;
  } catch (error) {
    console.error('[DynamicComponentLoader] Error extracting filename from URL:', url, error);
    return null;
  }
}

/**
 * Try to get shopId from various available sources
 */
function useShopId(): string | undefined {
  // Always call useSession unconditionally
  const session = useSession();
  
  // Try to get from session context (for authenticated shop management)
  let shopId: string | undefined = session?.shop?.id;

  // Try to get from URL parameters
  const params = useParams();
  const searchParams = useSearchParams();

  // Check various possible parameter names
  if (!shopId) {
    shopId = params?.shopId as string || 
             params?.subdomain as string ||
             searchParams?.get('shopId') ||
             searchParams?.get('subdomain') ||
             undefined;
  }

  return shopId;
}

export function DynamicComponentLoader({ url, resolvedProps, nodeId, fallback, jsxCode }: DynamicComponentLoaderProps) {
  // The factory is a function that takes React and returns a component type.
  const [factory, setFactory] = useState<((r: typeof React) => React.ComponentType<any>) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialCode, setInitialCode] = useState<string | null>(null); // Store the DB version code
  const [hasFetchedInitial, setHasFetchedInitial] = useState(false);
  // Track the last scriptText actually set in the factory to avoid redundant updates
  const lastScriptTextRef = React.useRef<string | null>(null);

  // Try to get shopId from available sources
  const shopId = useShopId();

  const { pageInfo } = useData();
  const pageId = pageInfo?.id;

  useEffect(() => {
    let isMounted = true; // IDK what does this do, but imma just leave it,
    // haven't tried this code without it tho.

    setError(null);

    /**
     * Logic:
     * 1. On first mount, always fetch the compiled component from the backend (DB version) and store its code as initialCode.
     * 2. If jsxCode is provided and is different from initialCode, use the preview compile endpoint.
     * 3. If jsxCode is not provided, or is the same as initialCode, use the backend fetch (DB version).
     * 4. Only update the factory if the scriptText has actually changed (prevents double fetch/render in React dev mode).
     */
    const fetchComponent = async () => {
      try {
        let scriptText: string | null = null;
        let errorMessage: string | null = null;

        // 1. On first mount, always fetch the compiled component from backend
        if (!hasFetchedInitial) {
          const filename = extractFilenameFromUrl(url);
          if (!filename) throw new Error(`Invalid compiled component URL format: ${url}`);
          
          const result = await getCompiledComponent({ filename, shopId: shopId || undefined });
          if (!result.success) throw new Error(result.error || 'Failed to fetch compiled component');
          
          scriptText = result.data!;
          if (isMounted) {
            setInitialCode(jsxCode || null);
            setHasFetchedInitial(true);
          }
        }

        // 2. If jsxCode is provided and is different from initialCode, use preview compile
        else if (jsxCode && initialCode !== null && jsxCode !== initialCode && pageId) {
          const result = await previewCompileJsx({ jsxCode, nodeId, pageId });
          if (!result.success) {
            errorMessage = 'Failed to evaluate preview-compiled component code.';
          } else {
            scriptText = result.compiledCode!;
          }
        }

        // 3. Otherwise, use the backend fetch (DB version)
        else {
          const filename = extractFilenameFromUrl(url);
          if (!filename) throw new Error(`Invalid compiled component URL format: ${url}`);

          const result = await getCompiledComponent({ filename, shopId: shopId || undefined });
          if (!result.success) throw new Error(result.error || 'Failed to fetch compiled component');

          scriptText = result.data!;
        }

        // Single call to update factory for all branches
        if (isMounted && scriptText) {
          if (lastScriptTextRef.current !== scriptText) {
            lastScriptTextRef.current = scriptText;

            try {
              const componentFactory = new Function(scriptText || '')();
              setFactory(() => componentFactory);

            } catch (e: any) {
              setError(errorMessage);
            }
          }
        }

      } catch (err: any) {
        if (isMounted) {
          console.error(`[DynamicComponentLoader] Error fetching component for node ${nodeId} from ${url}:`, err);
          setError(err.message);
        }
      }
    };

    fetchComponent();

    // Only re-run when url, nodeId, shopId, jsxCode, pageId, or initialCode changes
  }, [url, nodeId, shopId, jsxCode, pageId, initialCode, hasFetchedInitial]);

  const Component = useMemo(() => {
    if (!factory) return null;
    try {
      // We call the factory, passing in the React library, to get the actual component.
      return factory(React);
    } catch (e: any) {
      console.error(`[DynamicComponentLoader] Error creating component instance for node ${nodeId}:`, e);
      setError("Failed to create component instance.");
      return null;
    }
  }, [factory, nodeId]);

  if (error) {
    return <div role="alert" style={{color: 'red', padding: '10px', border: '1px solid red'}}>Error loading custom component for node {nodeId}: {error}</div>;
  }

  if (!Component) {
    return fallback || <DefaultFallback />;
  }

  // Render the dynamically loaded component with its resolved props.
  return <Component {...resolvedProps} />;
} 