import { Node, SiteSettings } from '@/OSDL/OSDL.types';
import { SpacingValue, SpacingProperty } from './types';
import { parseSpacingValue } from './utils';
import { resolveCSSVariable, getOverridesForPath } from '../../utils';

/**
 * Shared reader for spacing fields (padding/margin)
 * Handles CSS shorthand parsing, CSS variables, and overrides
 */
export function createSpacingReader(property: SpacingProperty, dataPath: string) {
  return (node: Node, siteSettings?: SiteSettings) => {
    const hasValue = (value: any) => value !== undefined && value !== null;
    // Get the base value from the specified data path
    let baseValue = getNestedValue(node, dataPath);
    
    // If no direct value, try to extract from CSS shorthand
    if (!hasValue(baseValue) && node.params) {
      const cssProperty = property === 'padding' ? 'padding' : 'margin';
      const shorthandValue = node.params[cssProperty];
      if (hasValue(shorthandValue)) {
        baseValue = shorthandValue;
      }
    }
    
    // Parse the base value
    const parsedSpacing = parseSpacingValue(baseValue);
    
    // Resolve CSS variables in the base value if it's a string
    let resolvedSpacing = parsedSpacing;
    if (typeof baseValue === 'string' && baseValue.includes('var(--')) {
      // For CSS variables, we need to resolve them and re-parse
      const resolvedValue = resolveCSSVariable(baseValue, siteSettings, 'spacing');
      resolvedSpacing = parseSpacingValue(resolvedValue);
    }
    
    // Get overrides for the data path
    const overridesObj = getOverridesForPath(node, dataPath);
    const overrides: Array<{ scope: 'responsive' | 'locale' | 'interaction'; key: string; value: SpacingValue }> = [];
    
    // Process responsive overrides
    if (overridesObj?.responsive) {
      Object.keys(overridesObj.responsive).forEach((bp) => {
        let overrideValue = overridesObj.responsive[bp];
        
        // Resolve CSS variables in responsive overrides
        if (overrideValue && typeof overrideValue === 'string' && overrideValue.includes('var(--')) {
          overrideValue = resolveCSSVariable(overrideValue, siteSettings, 'spacing');
        }
        
        const parsedOverride = parseSpacingValue(overrideValue);
        overrides.push({ scope: 'responsive', key: bp, value: parsedOverride });
      });
    }
    
    // Process locale overrides
    if (overridesObj?.locale) {
      Object.keys(overridesObj.locale).forEach((loc) => {
        let overrideValue = overridesObj.locale[loc];
        
        // Resolve CSS variables in locale overrides
        if (overrideValue && typeof overrideValue === 'string' && overrideValue.includes('var(--')) {
          overrideValue = resolveCSSVariable(overrideValue, siteSettings, 'spacing');
        }
        
        const parsedOverride = parseSpacingValue(overrideValue);
        overrides.push({ scope: 'locale', key: loc, value: parsedOverride });
      });
    }
    
    // Process interaction state overrides
    if (node.interactionStates) {
      const cssProperty = property === 'padding' ? 'padding' : 'margin';
      Object.keys(node.interactionStates).forEach((interactionState) => {
        const interactionData = (node.interactionStates as any)[interactionState];
        if (interactionData?.inlineStyles?.[cssProperty]) {
          let interactionValue = interactionData.inlineStyles[cssProperty];
          
          // Resolve CSS variables in interaction states
          if (interactionValue && typeof interactionValue === 'string' && interactionValue.includes('var(--')) {
            interactionValue = resolveCSSVariable(interactionValue, siteSettings, 'spacing');
          }
          
          const parsedOverride = parseSpacingValue(interactionValue);
          overrides.push({ 
            scope: 'interaction', 
            key: interactionState, 
            value: parsedOverride 
          });
        }
      });
    }
    
    return { value: resolvedSpacing, overrides };
  };
}

/**
 * Helper function to get nested values from an object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}
