import type { SiteSettings, PageDefinition } from '@/OSDL.types';
import API_URL from '@/config';
import { ShopLocales } from '../shop-manager/locales';

export type { ShopLocales };

interface GetSiteSettingsParams {
  host?: string;
  subdomain?: string;
}

interface GetPageDefinitionParams {
  host?: string;
  subdomain?: string;
  path: string;
}

/**
 * Fetch site settings by hostname or subdomain
 */
export async function getSiteSettings(params: GetSiteSettingsParams): Promise<{
  success: boolean;
  data?: SiteSettings;
  error?: string;
}> {
  const searchParams = new URLSearchParams();
  
  if (params.host) {
    searchParams.append('host', params.host);
  }
  if (params.subdomain) {
    searchParams.append('subdomain', params.subdomain);
  }

  if (!params.host && !params.subdomain) {
    return {
      success: false,
      error: 'Either host or subdomain parameter is required'
    };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/osdl/site-settings?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'Site not found'
        };
      }
      
      return {
        success: false,
        error: `Failed to fetch site settings: ${response.status} ${response.statusText}`
      };
    }

    const siteSettings = await response.json() as SiteSettings;

    return {
      success: true,
      data: siteSettings
    };
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch site settings'
    };
  }
}

/**
 * Fetch site settings as a manager (allows inactive) by subdomain or siteId
 */
export async function getManagerSiteSettings(params: { subdomain?: string; siteId?: string }): Promise<{
  success: boolean;
  data?: SiteSettings;
  error?: string;
}> {
  const searchParams = new URLSearchParams();
  if (params.subdomain) searchParams.append('subdomain', params.subdomain);
  if (params.siteId) searchParams.append('siteId', params.siteId);

  if (!params.subdomain && !params.siteId) {
    return { success: false, error: "Either subdomain or siteId is required" };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/osdl/manager/site-settings?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Site not found' };
      }
      return { success: false, error: `Failed to fetch site settings: ${response.status} ${response.statusText}` };
    }

    const siteSettings = await response.json() as SiteSettings;
    return { success: true, data: siteSettings };
  } catch (error) {
    console.error('Error fetching manager site settings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch site settings' };
  }
}

/**
 * Fetch page definition by hostname/subdomain and path
 */
export async function getPageDefinition(params: GetPageDefinitionParams): Promise<{
  success: boolean;
  data?: PageDefinition;
  error?: string;
}> {
  const searchParams = new URLSearchParams();
  
  if (params.host) {
    searchParams.append('host', params.host);
  }
  if (params.subdomain) {
    searchParams.append('subdomain', params.subdomain);
  }
  searchParams.append('path', params.path);

  if (!params.host && !params.subdomain) {
    return {
      success: false,
      error: 'Either host or subdomain parameter is required'
    };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/osdl/page-definition?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'Page not found'
        };
      }
      
      return {
        success: false,
        error: `Failed to fetch page definition: ${response.status} ${response.statusText}`
      };
    }

    const pageDefinition = await response.json() as PageDefinition;

    return {
      success: true,
      data: pageDefinition
    };
  } catch (error) {
    console.error('Error fetching page definition:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch page definition'
    };
  }
}

/**
 * Manager version: fetch page definition by siteId + path (ignores active status)
 */
export async function getManagerPageDefinition(params: { siteId: string; path: string }): Promise<{
  success: boolean;
  data?: PageDefinition;
  error?: string;
}> {
  const searchParams = new URLSearchParams();
  searchParams.append('siteId', params.siteId);
  searchParams.append('path', params.path);

  try {
    const response = await fetch(`${API_URL}/api/v1/osdl/manager/page-definition?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Page not found' };
      }
      return { success: false, error: `Failed to fetch page definition: ${response.status} ${response.statusText}` };
    }

    const pageDefinition = await response.json() as PageDefinition;
    return { success: true, data: pageDefinition };
  } catch (error) {
    console.error('Error fetching manager page definition:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch page definition' };
  }
}

/**
 * Fetch site settings for server-side rendering
 * This version doesn't rely on browser-only APIs
 */
export async function getSiteSettingsSSR(params: GetSiteSettingsParams): Promise<{
  success: boolean;
  data?: SiteSettings;
  error?: string;
}> {
  const searchParams = new URLSearchParams();
  
  if (params.host) {
    searchParams.append('host', params.host);
  }
  if (params.subdomain) {
    searchParams.append('subdomain', params.subdomain);
  }

  if (!params.host && !params.subdomain) {
    return {
      success: false,
      error: 'Either host or subdomain parameter is required'
    };
  }

  try {
    // For SSR, we might need to use a different URL pattern
    // In production, the backend might be internal, in dev it's localhost
    let baseUrl = process.env.NEXT_PUBLIC_API_URL || API_URL;
    
    // If we're in server-side context and using localhost, ensure it's accessible
    if (typeof window === 'undefined' && baseUrl.includes('localhost')) {
      // Server-side and using localhost - this should work in dev
      console.log('[getSiteSettingsSSR] Server-side localhost call');
    }
    
    const fullUrl = `${baseUrl}/api/v1/osdl/site-settings?${searchParams.toString()}`;
    
    console.log('[getSiteSettingsSSR] Making request to:', fullUrl);
    console.log('[getSiteSettingsSSR] Base URL:', baseUrl);
    console.log('[getSiteSettingsSSR] API_URL:', API_URL);
    console.log('[getSiteSettingsSSR] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('[getSiteSettingsSSR] typeof window:', typeof window);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Note: credentials might not work the same way in SSR context
    });

    console.log('[getSiteSettingsSSR] Response status:', response.status, response.statusText);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'Site not found'
        };
      }
      
      return {
        success: false,
        error: `Failed to fetch site settings: ${response.status} ${response.statusText}`
      };
    }

    const siteSettings = await response.json() as SiteSettings;

    return {
      success: true,
      data: siteSettings
    };
  } catch (error) {
    console.error('Error fetching site settings (SSR):', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch site settings'
    };
  }
}

/**
 * Fetch page definition for server-side rendering
 * This version doesn't rely on browser-only APIs
 */
export async function getPageDefinitionSSR(params: GetPageDefinitionParams): Promise<{
  success: boolean;
  data?: PageDefinition;
  error?: string;
}> {
  const searchParams = new URLSearchParams();
  
  if (params.host) {
    searchParams.append('host', params.host);
  }
  if (params.subdomain) {
    searchParams.append('subdomain', params.subdomain);
  }
  searchParams.append('path', params.path);

  if (!params.host && !params.subdomain) {
    return {
      success: false,
      error: 'Either host or subdomain parameter is required'
    };
  }

  try {
    // For SSR, we might need to use the full URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || API_URL;
    const fullUrl = `${baseUrl}/api/v1/osdl/page-definition?${searchParams.toString()}`;
    
    console.log('[getPageDefinitionSSR] Making request to:', fullUrl);
    console.log('[getPageDefinitionSSR] Base URL:', baseUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Note: credentials might not work the same way in SSR context
    });

    console.log('[getPageDefinitionSSR] Response status:', response.status, response.statusText);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'Page not found'
        };
      }
      
      return {
        success: false,
        error: `Failed to fetch page definition: ${response.status} ${response.statusText}`
      };
    }

    const pageDefinition = await response.json() as PageDefinition;
		console.log('page definition', pageDefinition);

    return {
      success: true,
      data: pageDefinition
    };
  } catch (error) {
    console.error('Error fetching page definition (SSR):', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch page definition'
    };
  }
}

/**
 * Fetch compiled component by filename
 * This uses the backend route that serves from public/compiled_components/ 
 * and can compile on-demand if needed
 * 
 * @param params.filename - The filename of the compiled component (e.g., "nodeId_timestamp.js")
 * @param params.shopId - Optional shop ID, only needed for on-demand compilation if the file doesn't exist
 */
export async function getCompiledComponent(params: {
  filename: string;
  shopId?: string;
}): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  const { filename, shopId } = params;

  if (!filename) {
    return {
      success: false,
      error: 'Filename is required'
    };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/javascript',
    };

    // Add shop ID header for on-demand compilation if provided
    // This is only needed if the compiled file doesn't exist and needs to be compiled on-demand
    if (shopId) {
      headers['x-shop-id'] = shopId;
    }

    const response = await fetch(`${API_URL}/api/v1/osdl/compiled_components/${filename}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'Compiled component not found'
        };
      }
      
      return {
        success: false,
        error: `Failed to fetch compiled component: ${response.status} ${response.statusText}`
      };
    }

    const componentCode = await response.text();

    return {
      success: true,
      data: componentCode
    };
  } catch (error) {
    console.error('Error fetching compiled component:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch compiled component'
    };
  }
}

/**
 * Compile JSX code for preview (without saving or requiring DB node)
 * This is used for live previews ( on-demand compilation ) of unsaved components.
 */
export async function previewCompileJsx(params: {
  jsxCode: string;
  nodeId: string;
  pageId: string;
}): Promise<{
  success: boolean;
  compiledCode?: string;
  warnings?: any[];
  error?: string;
}> {
  try {
    const response = await fetch(`${API_URL}/api/v1/osdl/preview-compile-jsx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (!response.ok || result.status !== 'success') {
      return {
        success: false,
        error: result.details || result.message || 'Failed to compile JSX',
        warnings: result.warnings,
      };
    }

    return {
      success: true,
      compiledCode: result.compiledCode,
      warnings: result.warnings,
    };
  } catch (error) {
    console.error('Error preview-compiling JSX:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview-compile JSX',
    };
  }
}

export async function fetchShopLocales(): Promise<ShopLocales> {
  const res = await fetch(`${API_URL}/api/v1/osdl/locales`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  return data;
}

export async function setDefaultLocale(shopId: string, locale: string): Promise<void> {
  if (!shopId || !locale) {
    throw new Error('A shop ID and locale are required.');
  }
  await fetch(`${API_URL}/api/v1/osdl/locales/default`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale }),
    credentials: 'include',
  });
}

export async function addLocale(shopId: string, locale: string): Promise<{ supportedLocales: string[] }> {
  if (!shopId || !locale) {
    throw new Error('A shop ID and locale are required.');
  }
  const res =  await fetch(`${API_URL}/api/v1/osdl/locales`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale }),
  });

  const data = await res.json();
  return data;
}

export async function deleteLocale(shopId: string, locale: string): Promise<{ supportedLocales: string[] }> {
  if (!shopId || !locale) {
    throw new Error('A shop ID and locale are required.');
  }
  const res = await fetch(`${API_URL}/api/v1/osdl/locales`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale }),
  });

  const data = await res.json();
  return data;
}