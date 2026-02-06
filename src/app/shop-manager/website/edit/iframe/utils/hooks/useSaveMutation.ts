import { useMutation } from '@tanstack/react-query';
import { updateSiteSettings, upsertPage } from '@/services/api/shop-manager/osdl';
import { SiteSettings } from '@/OSDL/OSDL.types';

interface SaveMutationParams {
  editableSiteSettings: SiteSettings | null;
  pageDefinition: any;
  setOriginalPageDefinition: (pageDefinition: any) => void;
  setEditableSiteSettings: (settings: SiteSettings | null) => void;
  setBaselineSiteSettings: (settings: SiteSettings | null) => void;
}

const blobToDataUrl = async (blob: Blob): Promise<string> =>
  await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read blob URL payload'));
    reader.readAsDataURL(blob);
  });

const convertBlobUrl = async (url: string): Promise<string | null> => {
  if (!url.startsWith('blob:')) return url;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
};

const collectBlobUrls = (value: unknown, bag: Set<string>): void => {
  if (typeof value === 'string') {
    if (value.startsWith('blob:')) bag.add(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectBlobUrls(entry, bag));
    return;
  }

  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((entry) => collectBlobUrls(entry, bag));
  }
};

const replaceBlobUrls = (value: unknown, replacements: Map<string, string>): unknown => {
  if (typeof value === 'string') {
    return replacements.get(value) ?? value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => replaceBlobUrls(entry, replacements));
  }

  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      next[key] = replaceBlobUrls(entry, replacements);
    }
    return next;
  }

  return value;
};

const normalizeBlobUrlsDeep = async <T>(value: T): Promise<T> => {
  const blobUrls = new Set<string>();
  collectBlobUrls(value, blobUrls);

  if (blobUrls.size === 0) return value;

  const entries = await Promise.all(
    Array.from(blobUrls).map(async (blobUrl) => {
      const converted = await convertBlobUrl(blobUrl);
      return [blobUrl, converted] as const;
    }),
  );

  const replacements = new Map<string, string>();
  for (const [blobUrl, converted] of entries) {
    if (converted) replacements.set(blobUrl, converted);
  }

  return replaceBlobUrls(value, replacements) as T;
};

export const useSaveMutation = ({
  editableSiteSettings,
  pageDefinition,
  setOriginalPageDefinition,
  setEditableSiteSettings,
  setBaselineSiteSettings
}: SaveMutationParams) => {
  return useMutation({
    mutationFn: async ({ shopId }: { shopId: string }) => {
      if (!editableSiteSettings) throw new Error('No site settings to save');
      if (!pageDefinition) throw new Error('No page definition to save');

      // Sanitize URLs to avoid backend validation errors
      const sanitizeUrl = (url?: string) => {
        if (!url) return undefined;
        try {
          const u = new URL(url);
          return u.href;
        } catch {
          return undefined; // omit invalid URLs
        }
      };

      const normalizeAndSanitizeUrl = async (url?: string) => {
        if (!url) return undefined;
        const normalizedUrl = await convertBlobUrl(url);
        if (!normalizedUrl) return undefined;
        return sanitizeUrl(normalizedUrl);
      };

      // Extract color variables from globalStyleVariables.colors
      const colorVariables = editableSiteSettings.globalStyleVariables?.colors 
        ? Object.entries(editableSiteSettings.globalStyleVariables.colors).map(([name, value]) => ({
            id: name,
            name,
            value,
            type: 'color' as const
          }))
        : [];

      // Extract font variables from globalStyleVariables.fonts
      const fontVariables = editableSiteSettings.globalStyleVariables?.fonts
        ? Object.entries(editableSiteSettings.globalStyleVariables.fonts).map(([name, value]) => ({
            id: name,
            name,
            value,
            type: 'font' as const
          }))
        : [];

      // Extract SEO settings
      const seoSettings = await normalizeBlobUrlsDeep(editableSiteSettings.seo || {});
      const normalizedLogoUrl = await normalizeAndSanitizeUrl((editableSiteSettings as any).logoUrl);
      const normalizedFaviconUrl = await normalizeAndSanitizeUrl((editableSiteSettings as any).faviconUrl);
      const normalizedEditableSiteSettings = {
        ...editableSiteSettings,
        seo: seoSettings,
        logoUrl: normalizedLogoUrl,
        faviconUrl: normalizedFaviconUrl,
      };

      // Create sanitized settings without globalStyleVariables and seo (they're sent separately)
      const { globalStyleVariables, seo, ...otherSettings } = editableSiteSettings;
      const sanitizedSettings = {
        ...otherSettings,
        logoUrl: normalizedLogoUrl,
        faviconUrl: normalizedFaviconUrl,
      };

      // Track which operations succeeded
      let siteSettingsSaved = false;
      let pageSaved = false;
      let normalizedPageDefinitionForSave: any = pageDefinition;

      // Try to save site settings
      try {
        const res = await updateSiteSettings(
          shopId,
          colorVariables,
          fontVariables,
          seoSettings,
          sanitizedSettings
        );

        // so the object from the backend always have am essage when it errors,
        // no clue why i don't just return the res with success and not from the status,
        // we use it even more often and in a more reliable way, but it is what it is.
        siteSettingsSaved = (res as any).message ? false : true;
      } catch (error) {
        console.error('[IframePage] Site settings save failed', error);
      }

      // Try to save page definition
      try {
        const { seo: pageSeo, ...pageDefinitionWithoutSeo } = pageDefinition;
        const normalizedPageDefinition = await normalizeBlobUrlsDeep(pageDefinitionWithoutSeo);
        normalizedPageDefinitionForSave = {
          ...pageDefinition,
          ...normalizedPageDefinition,
        };
        const res = await upsertPage(shopId, {
          ...normalizedPageDefinition,
        });

        pageSaved = (res as any).errors ? false : true;
      } catch (error) {
        console.error('[IframePage] Page save failed', error);
      }

      // Always return the results, even if some failed
      return {
        siteSettingsSaved,
        pageSaved,
        normalizedPageDefinitionForSave,
        normalizedEditableSiteSettings,
      };
    },
    onSuccess: (results) => {
      // Only set dirty to false if BOTH operations succeeded
      window.parent.postMessage({ type: 'DIRTY_STATE', payload: { 
        dirty: !(results.siteSettingsSaved && results.pageSaved) } }, '*');
      
      window.parent.postMessage({ 
        type: 'SAVE_FINISHED', 
        payload: { 
          siteSettingsSaved: results.siteSettingsSaved, 
          pageSaved: results.pageSaved 
        } 
      }, '*');
      if(!results.siteSettingsSaved || !results.pageSaved) {
        return;
      }
      
      // Update the original page definition to match current state
      setOriginalPageDefinition(results.normalizedPageDefinitionForSave);
      
      // Update the editable site settings to match the saved state
      // This ensures that future changes are properly detected
      if (results.normalizedEditableSiteSettings) {
        setEditableSiteSettings(results.normalizedEditableSiteSettings);
        // Reset the baseline so subsequent changes toggle dirty state again
        setBaselineSiteSettings(results.normalizedEditableSiteSettings);
      } 
    },
    onError: (error: any) => {
      console.error('[IframePage] Save failed', error);
      
      // Keep the dirty state when save fails
      window.parent.postMessage({ type: 'DIRTY_STATE', payload: { dirty: true } }, '*');
      
      window.parent.postMessage({ 
        type: 'SAVE_FINISHED', 
        payload: { 
          siteSettingsSaved: false, 
          pageSaved: false
        } 
      }, '*');
    },
  });
};
