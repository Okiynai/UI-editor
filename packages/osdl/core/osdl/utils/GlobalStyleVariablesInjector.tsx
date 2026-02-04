'use client';

import React, { useMemo } from 'react';
import { useSiteSettings } from '@/osdl/contexts/SiteSettingsContext';
import { PageDefinition, SiteSettings } from '@/OSDL.types';
import merge from 'lodash.merge'; // Using a library for a robust deep merge is recommended

/**
 * Deeply merges site and page style variables and generates a final CSS string.
 * Page styles will override site styles.
 */
const generateCssVariables = (
  siteSettings: SiteSettings | null,
  pageDefinition?: PageDefinition | null
): string => {
  // Start with base site variables, or an empty object if none exist.
  const baseVariables = siteSettings?.globalStyleVariables || {};

  // Get page-specific styles. We only care about it if it's an object for merging.
  const pageStyleVariables = 
    pageDefinition?.pageStyles && typeof pageDefinition.pageStyles === 'object'
      ? pageDefinition.pageStyles
      : {};

  // Deep merge the variables. Properties in `pageStyleVariables` will overwrite those in `baseVariables`.
  // Using a library like lodash.merge is safer for nested objects (like 'colors').
  const mergedVariables = merge({}, baseVariables, pageStyleVariables);

  if (Object.keys(mergedVariables).length === 0) {
    return '';
  }

  // --- Generate CSS from the final, merged variables ---
  let cssString = ':root {\n';
  const { colors, fonts, spacing } = mergedVariables;

  if (colors) {
    for (const [name, value] of Object.entries(colors)) {
      cssString += `  --${name}: ${value};\n`;
    }
  }
  if (fonts) {
    for (const [name, value] of Object.entries(fonts)) {
      cssString += `  --font-${name}: ${value};\n`;
    }
  }
  if (spacing) {
    for (const [name, value] of Object.entries(spacing)) {
      cssString += `  --spacing-${name}: ${value};\n`;
    }
  }
  cssString += '}\n';

  // --- Add default body styles based on the final variables ---
  cssString += `body {\n`;
  cssString += `  background-color: ${colors?.backgroundLight || '#ffffff'};\n`;
  cssString += `  color: ${colors?.textDark || '#000000'};\n`;
  cssString += `  margin: 0;\n`;
  cssString += `  font-family: ${fonts?.body || 'sans-serif'};\n`;
  cssString += '}\n';

  // --- Append any raw CSS from the page definition ---
  // This is for page-specific rules, not variable overrides.
  console.log('--- [GlobalStyleVariablesInjector] pageDefinition ---', pageDefinition);
  if (pageDefinition?.pageStyles && typeof pageDefinition.pageStyles === 'string') {
    cssString += `\n/* Page-specific CSS rules */\n`;
    cssString += pageDefinition.pageStyles;
    console.log('--- [GlobalStyleVariablesInjector] pageDefinition.pageStyles ---', pageDefinition.pageStyles);
  }

  return cssString;
};

interface GlobalStyleVariablesInjectorProps {
  pageDefinition?: PageDefinition | null; // Make pageDefinition an optional prop
}

const GlobalStyleVariablesInjector: React.FC<GlobalStyleVariablesInjectorProps> = ({ pageDefinition }) => {
  const siteSettings = useSiteSettings();

  // The generation logic now depends on both siteSettings and pageDefinition
  const cssVariablesString = useMemo(
    () => generateCssVariables(siteSettings, pageDefinition),
    [siteSettings, pageDefinition]
  );

  if (!cssVariablesString) {
    return null;
  }

  return (
    <style
      id="global-okiynai-style-variables"
      dangerouslySetInnerHTML={{ __html: cssVariablesString }}
    />
  );
};

export default GlobalStyleVariablesInjector;