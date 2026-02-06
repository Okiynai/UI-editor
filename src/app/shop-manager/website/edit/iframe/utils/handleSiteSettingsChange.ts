import { SiteSettings } from "@/OSDL/OSDL.types";
import { SiteSettingsChangedPayload } from "../../[sessId]/types/iframe-communication";

export interface HandleSiteSettingsChangeDependencies {
  setEditableSiteSettings: (settings: SiteSettings | ((prev: SiteSettings | null) => SiteSettings | null)) => void;
}

const handleSiteSettingsChange = (
  payload: SiteSettingsChangedPayload,
  deps: HandleSiteSettingsChangeDependencies
): { originalSettings: any; modifiedSettings: any } | null => {
  console.log('[IframePage] Processing site settings change:', payload);

  let capturedOriginalSettings: any = null;
  let capturedModifiedSettings: any = null;

  deps.setEditableSiteSettings(prevSettings => {
    if (!prevSettings) return prevSettings;

    // Capture original settings for undo functionality
    capturedOriginalSettings = JSON.parse(JSON.stringify(prevSettings));

    const newSettings = { ...prevSettings };

    switch (payload.type) {
      case 'color':
        // Create deep copy of globalStyleVariables to avoid mutating the original
        if (!newSettings.globalStyleVariables) {
          newSettings.globalStyleVariables = {};
        } else {
          newSettings.globalStyleVariables = { ...newSettings.globalStyleVariables };
        }
        
        if (!newSettings.globalStyleVariables.colors) {
          newSettings.globalStyleVariables.colors = {};
        } else {
          newSettings.globalStyleVariables.colors = { ...newSettings.globalStyleVariables.colors };
        }

        if (payload.action === 'add' && payload.variableName && typeof payload.newValue === 'string') {
          newSettings.globalStyleVariables.colors[payload.variableName] = payload.newValue;
        } else if (payload.action === 'update' && payload.variableName && typeof payload.newValue === 'string') {
          newSettings.globalStyleVariables.colors[payload.variableName] = payload.newValue;
        } else if (payload.action === 'delete' && payload.variableName) {
          delete newSettings.globalStyleVariables.colors[payload.variableName];
        }
        break;

      case 'font':
        // Create deep copy of globalStyleVariables to avoid mutating the original
        if (!newSettings.globalStyleVariables) {
          newSettings.globalStyleVariables = {};
        } else {
          newSettings.globalStyleVariables = { ...newSettings.globalStyleVariables };
        }
        
        if (!newSettings.globalStyleVariables.fonts) {
          newSettings.globalStyleVariables.fonts = {};
        } else {
          newSettings.globalStyleVariables.fonts = { ...newSettings.globalStyleVariables.fonts };
        }

        if (payload.action === 'add' && payload.variableName && typeof payload.newValue === 'string') {
          newSettings.globalStyleVariables.fonts[payload.variableName] = payload.newValue;
        } else if (payload.action === 'update' && payload.variableName && typeof payload.newValue === 'string') {
          newSettings.globalStyleVariables.fonts[payload.variableName] = payload.newValue;
        } else if (payload.action === 'delete' && payload.variableName) {
          delete newSettings.globalStyleVariables.fonts[payload.variableName];
        }
        break;

      case 'seo':
        if (payload.action === 'update' && payload.newValue && typeof payload.newValue === 'object' && !Array.isArray(payload.newValue)) {
          // Split out faviconUrl so it updates the root-level site setting
          const seoUpdate: Record<string, any> = { ...(payload.newValue as any) };
          if ('faviconUrl' in seoUpdate) {
            newSettings.faviconUrl = seoUpdate.faviconUrl;
            delete seoUpdate.faviconUrl;
          }
          if (!newSettings.seo) {
            newSettings.seo = {} as any;
          }
          newSettings.seo = {
            ...newSettings.seo,
            ...seoUpdate
          } as any;
        }
        break;

      case 'locale':
        if (payload.action === 'add' && payload.newValue && typeof payload.newValue === 'object' && 'addedLocale' in payload.newValue) {
          if (!newSettings.supportedLocales) {
            newSettings.supportedLocales = [];
          } else {
            newSettings.supportedLocales = [...newSettings.supportedLocales];
          }
          const localeValue = payload.newValue as { addedLocale: string; localeLabel: string; localeFlag: string };
          if (localeValue.addedLocale && !newSettings.supportedLocales.includes(localeValue.addedLocale)) {
            newSettings.supportedLocales.push(localeValue.addedLocale);
          }
        } else if (payload.action === 'update' && payload.newValue && typeof payload.newValue === 'object' && 'defaultLocale' in payload.newValue) {
          const localeValue = payload.newValue as { defaultLocale: string };
          if (localeValue.defaultLocale) {
            newSettings.defaultLocale = localeValue.defaultLocale;
          }
        } else if (payload.action === 'delete' && payload.variableId) {
          if (newSettings.supportedLocales) {
            newSettings.supportedLocales = newSettings.supportedLocales.filter(locale => locale !== payload.variableId);
          }
          // If we're deleting the default locale, set a new default
          if (payload.variableId === newSettings.defaultLocale && newSettings.supportedLocales && newSettings.supportedLocales.length > 0) {
            newSettings.defaultLocale = newSettings.supportedLocales[0];
          }
        }
        break;
    }

    // Capture modified settings for undo functionality
    capturedModifiedSettings = JSON.parse(JSON.stringify(newSettings));

    console.log('[IframePage] Updated site settings:', newSettings);
    return newSettings;
  });

  // Return the captured settings for undo functionality
  return capturedOriginalSettings && capturedModifiedSettings
    ? { originalSettings: capturedOriginalSettings, modifiedSettings: capturedModifiedSettings }
    : null;
};

export default handleSiteSettingsChange; 