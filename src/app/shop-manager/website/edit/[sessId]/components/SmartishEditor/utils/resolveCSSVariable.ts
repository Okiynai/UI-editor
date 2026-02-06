import { SiteSettings } from "@/OSDL/OSDL.types";

/**
 * Helper function to resolve CSS variable values from site settings
 * Extracts the variable name from var(--variableName) and looks it up in site settings
 */
export const resolveCSSVariable = (value: string, siteSettings?: SiteSettings, 
    path?: string): string => {
  if (!value || typeof value !== 'string') return value;
  
  // Check if it's a CSS variable
  const varMatch = value.match(/var\(--([^)]+)\)/);
  if (!varMatch) return value;
  
  const variableName = varMatch[1];
  
  // Try to find the variable value in site settings
  if (siteSettings?.globalStyleVariables?.colors?.[variableName] && 
    (path === 'colors' || !path)) {
    return siteSettings.globalStyleVariables.colors[variableName];
  }

  // if it was not in the colors, then try the fonts  
  if (siteSettings?.globalStyleVariables?.fonts?.[variableName] && 
    (path === 'fonts' || !path)) {
    return siteSettings.globalStyleVariables.fonts[variableName];
  }

  // if it was not in the fonts, then try the spacing  
  if (siteSettings?.globalStyleVariables?.spacing?.[variableName] && 
    (path === 'spacing' || path === 'dimensions' || !path)) {
    return siteSettings.globalStyleVariables.spacing[variableName];
  }

  
  // Fallback: try to get from CSS custom properties on the document
  try {
    const computedValue = getComputedStyle(document.documentElement).getPropertyValue(`--${variableName}`);
    if (computedValue) {
      return computedValue.trim();
    }
  } catch (error) {
    console.warn(`Failed to get CSS variable --${variableName}:`, error);
  }
  
  // Return original value if we can't resolve it
  return value;
};