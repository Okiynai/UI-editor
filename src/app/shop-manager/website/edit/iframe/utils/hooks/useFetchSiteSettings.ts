import { useState, useEffect } from 'react';
import { SiteSettings } from '@/OSDL/OSDL.types';

export const useFetchSiteSettings = () => {
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Prefer siteid query param and resolve to subdomain via manager API
        const url = new URL(window.location.href);
        const siteIdParam = url.searchParams.get('siteid');

        if (siteIdParam) {
          const { getSiteById } = await import('@/services/api/shop-manager/sites');
          const siteRes = await getSiteById(siteIdParam);
          if (!siteRes.success || !siteRes.data) {
            setError(siteRes.error || 'Failed to resolve site by id');
            return;
          }
          const { getManagerSiteSettings } = await import('@/services/api/osdl/osdl');
          const result = await getManagerSiteSettings({ siteId: siteIdParam });
          if (result.success && result.data) {
            setSiteSettings(result.data);
          } else {
            setError(result.error || 'Failed to fetch site settings');
          }
        } else {
          // Fallback for demo/standalone usage
          const { getSiteSettings } = await import('@/services/api/osdl/osdl');
          const result = await getSiteSettings({ subdomain: 'demo', host: '' } as any);
          if (result.success && result.data) {
            setSiteSettings(result.data);
          } else {
            setError(result.error || 'Failed to fetch site settings');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { siteSettings, isLoading, error };
}; 
