import React from "react";
import { Field, RendererProps } from "../types";
import { resolveCSSVariable, defaultMutatorsCreator, getOverridesForPath } from "../utils";
import { renderField } from "../utils/defaults/unifiedFields";
import { OverrideCreatorWrapper, OverrideDisplay } from "../utils/defaults/OverrideUtils";

// Helper function to extract background color from CSS shorthand
const extractBackgroundColor = (backgroundValue: any): string => {
  if (!backgroundValue) return "#00000000";

  // If it's already a color value, return it
  if (typeof backgroundValue === 'string' && (backgroundValue.startsWith('#') || backgroundValue.startsWith('rgb') || backgroundValue.startsWith('var('))) {
    return backgroundValue;
  }

  // If it's a CSS shorthand like "red url(image.jpg) center/cover no-repeat"
  // Extract the first color value
  if (typeof backgroundValue === 'string') {
    // Look for color values in the shorthand
    const colorMatch = backgroundValue.match(/(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|var\([^)]+\)|[a-zA-Z]+)/);
    if (colorMatch) {
      return colorMatch[1];
    }
  }

  // If it's an object with a color property
  if (backgroundValue && typeof backgroundValue === 'object' && backgroundValue.color) {
    return backgroundValue.color;
  }

  return "#00000000";
};

export const backgroundColorField: Field = {
  id: "backgroundColor",
  rendererKey: "backgroundColor",
  library: "colors",
  interactionsInlineStyle: "backgroundColor",
  showOverrides: true,
  rendererConfig: {
    dir: 'row',
    className: '!ml-auto',
    type: "color",
    label: "Background",
  },
  reader: (node, siteSettings) => {
    // Try params.backgroundColor first (legacy)
    let baseValue = node.params?.backgroundColor;
    
    // If no backgroundColor, try params.background and extract color from it
    if (!baseValue && node.params?.background) {
      baseValue = extractBackgroundColor(node.params.background);
    }
    
    // Fallback to default
    if (!baseValue) {
      baseValue = "#00000000";
    }
    
    // Resolve CSS variables in the base value
    if (baseValue && typeof baseValue === 'string' && baseValue.includes('var(--')) {
      baseValue = resolveCSSVariable(baseValue, siteSettings, 'colors');
    }
    
    // Use existing utility to get overrides
    const overridesObj = getOverridesForPath(node, "params.backgroundColor");
    const overrides: Array<{ scope: 'responsive' | 'locale' | 'interaction'; key: string; value: any }> = [];
    
    // Process responsive overrides
    if (overridesObj?.responsive) {
      Object.keys(overridesObj.responsive).forEach((bp) => {
        let overrideValue = overridesObj.responsive[bp];
        // Resolve CSS variables in responsive overrides
        if (overrideValue && typeof overrideValue === 'string' && overrideValue.includes('var(--')) {
          overrideValue = resolveCSSVariable(overrideValue, siteSettings, 'colors');
        }
        overrides.push({ scope: 'responsive', key: bp, value: overrideValue });
      });
    }
    
    // Process locale overrides
    if (overridesObj?.locale) {
      Object.keys(overridesObj.locale).forEach((loc) => {
        let overrideValue = overridesObj.locale[loc];
        // Resolve CSS variables in locale overrides
        if (overrideValue && typeof overrideValue === 'string' && overrideValue.includes('var(--')) {
          overrideValue = resolveCSSVariable(overrideValue, siteSettings, 'colors');
        }
        overrides.push({ scope: 'locale', key: loc, value: overrideValue });
      });
    }
    
    // Process interaction state overrides
    if (node.interactionStates) {
      Object.keys(node.interactionStates).forEach((interactionState) => {
        const interactionData = (node.interactionStates as any)[interactionState];
        if (interactionData?.inlineStyles?.backgroundColor) {
          let interactionValue = interactionData.inlineStyles.backgroundColor;
          // Resolve CSS variables in interaction states
          if (interactionValue && typeof interactionValue === 'string' && interactionValue.includes('var(--')) {
            interactionValue = resolveCSSVariable(interactionValue, siteSettings, 'colors');
          }
          overrides.push({ 
            scope: 'interaction', 
            key: interactionState, 
            value: interactionValue 
          });
        }
      });
    }
    
    return { value: baseValue, overrides };
  },
  createMutators: (node, onIframeUpdate, interactionsInlineStyle) => {
    return defaultMutatorsCreator({ type: "color", dataPath: "params.backgroundColor" }, node,  onIframeUpdate, interactionsInlineStyle);
  }
};

// Custom renderer with larger label
export const BackgroundColorRenderer: React.FC<RendererProps<any, any, any>> = ({ data, mutations, config, library, libraryData, siteSettings, showOverrides, interactionsInlineStyle }) => {
  const { update } = mutations;
  const { value, overrides } = data;

  return (
    <div className="relative group py-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900">Background</label>
        <div className="flex items-center">
          {renderField("color", value, config, update, library, libraryData)}
        </div>
      </div>

      <OverrideCreatorWrapper
        fieldLabel="Background"
        interactionsInlineStyle={interactionsInlineStyle}
        mutations={mutations}
        siteSettings={siteSettings}
        overrides={overrides}
      />

      {overrides && (
        <OverrideDisplay
          overrides={overrides}
          mutations={mutations}
          initOverrideState={showOverrides ?? false}
        >
          {(override) => renderField("color", override.value, config, (value: any) => {
            const ctx = override.scope === 'locale'
              ? { locale: override.key }
              : override.scope === 'interaction'
              ? { interaction: override.key }
              : { breakpoint: override.key };
            mutations.update(value, ctx);
          }, library, libraryData)}
        </OverrideDisplay>
      )}
    </div>
  );
};


