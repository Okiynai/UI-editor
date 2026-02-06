import { Node, SiteSettings } from '@/OSDL/OSDL.types';
import { DimensionValue, DimensionProperty } from './types';
import { parseDimensionValue } from './utils';
import { resolveCSSVariable, getOverridesForPath, getComputedStyleValue } from '../../utils';

/**
 * Shared reader for dimension fields (width/height/maxWidth/maxHeight)
 * Handles CSS value parsing, CSS variables, and overrides
 */
export function createDimensionsReader(property: DimensionProperty, dataPath: string) {
  return (node: Node, siteSettings?: SiteSettings) => {
    const hasValue = (value: any) => value !== undefined && value !== null;
    // Get the base value from the specified data path
    let baseValue = getNestedValue(node, dataPath);
    
    // If no direct value, try to extract from layout properties (for section nodes)
    if (!hasValue(baseValue) && node.type === 'section' && (node as any).layout) {
      const layout = (node as any).layout;
      if (property === 'width' && hasValue(layout.width)) {
        baseValue = layout.width;
      } else if (property === 'height' && hasValue(layout.height)) {
        baseValue = layout.height;
      } else if (property === 'minWidth' && hasValue(layout.minWidth)) {
        baseValue = layout.minWidth;
      } else if (property === 'minHeight' && hasValue(layout.minHeight)) {
        baseValue = layout.minHeight;
      } else if (property === 'maxWidth' && hasValue(layout.maxWidth)) {
        baseValue = layout.maxWidth;
      } else if (property === 'maxHeight' && hasValue(layout.maxHeight)) {
        baseValue = layout.maxHeight;
      }
    }
    
    // If still no value, try params as another data path
    if (!hasValue(baseValue) && node.params) {
      const paramsValue = node.params[property];
      if (hasValue(paramsValue)) {
        baseValue = paramsValue;
      }
    }
    
    // If still no value, try inline styles
    if (!hasValue(baseValue) && (node as any).inlineStyles) {
      const inlineStyles = (node as any).inlineStyles;
      if (hasValue(inlineStyles[property])) {
        baseValue = inlineStyles[property];
      }
    }
    
    // If still no value, check for Tailwind classes before using computed styles
    if (!hasValue(baseValue)) {
      const hasRelevantTailwindClass = checkForTailwindDimensionClass(node, property);
      
      if (hasRelevantTailwindClass) {
        try {
          const element = document.getElementById(node.id) || document.body;
          const computedValue = getComputedStyleValue(element, property);
          if (computedValue && computedValue !== 'auto') {
            baseValue = computedValue;
          }
        } catch (error) {
          // Ignore errors, just use fallback
        }
      }
    }
    
    // Parse the base value - default to unset for min/max dimensions, auto for width/height
    const defaultValue = (property === 'minWidth' || property === 'minHeight' || property === 'maxWidth' || property === 'maxHeight') ? 'unset' : 'auto';
    const parsedDimension = parseDimensionValue(hasValue(baseValue) ? String(baseValue) : defaultValue);
    
    // Resolve CSS variables in the base value if it's a string
    let resolvedDimension = parsedDimension;
    if (typeof baseValue === 'string' && baseValue.includes('var(--')) {
      // For CSS variables, we need to resolve them and re-parse
      const resolvedValue = resolveCSSVariable(baseValue, siteSettings, 'dimensions');
      resolvedDimension = parseDimensionValue(resolvedValue);
    }
    
    // Get overrides for the data path
    const overridesObj = getOverridesForPath(node, dataPath);
    const overrides: Array<{ scope: 'responsive' | 'locale' | 'interaction'; key: string; value: DimensionValue }> = [];
    
    // Process responsive overrides
    if (overridesObj?.responsive) {
      Object.keys(overridesObj.responsive).forEach((bp) => {
        let overrideValue = overridesObj.responsive[bp];
        
        // Resolve CSS variables in responsive overrides
        if (overrideValue && typeof overrideValue === 'string' && overrideValue.includes('var(--')) {
          overrideValue = resolveCSSVariable(overrideValue, siteSettings, 'dimensions');
        }
        
        const parsedOverride = parseDimensionValue(overrideValue);
        overrides.push({ scope: 'responsive', key: bp, value: parsedOverride });
      });
    }
    
    // Process locale overrides
    if (overridesObj?.locale) {
      Object.keys(overridesObj.locale).forEach((loc) => {
        let overrideValue = overridesObj.locale[loc];
        
        // Resolve CSS variables in locale overrides
        if (overrideValue && typeof overrideValue === 'string' && overrideValue.includes('var(--')) {
          overrideValue = resolveCSSVariable(overrideValue, siteSettings, 'dimensions');
        }
        
        const parsedOverride = parseDimensionValue(overrideValue);
        overrides.push({ scope: 'locale', key: loc, value: parsedOverride });
      });
    }
    
    // Process interaction state overrides
    if (node.interactionStates) {
      Object.keys(node.interactionStates).forEach((interactionState) => {
        const interactionData = (node.interactionStates as any)[interactionState];
        if (interactionData?.inlineStyles?.[property]) {
          let interactionValue = interactionData.inlineStyles[property];
          
          // Resolve CSS variables in interaction states
          if (interactionValue && typeof interactionValue === 'string' && interactionValue.includes('var(--')) {
            interactionValue = resolveCSSVariable(interactionValue, siteSettings, 'dimensions');
          }
          
          const parsedOverride = parseDimensionValue(interactionValue);
          overrides.push({ 
            scope: 'interaction', 
            key: interactionState, 
            value: parsedOverride 
          });
        }
      });
    }
    
    return { value: resolvedDimension, overrides };
  };
}

/**
 * Overflow readers
 */
export function readOverflow(dataPath: string) {
  return (node: Node) => {
    const hasValue = (value: any) => value !== undefined && value !== null;
    let baseValue = getNestedValue(node, `${dataPath}.overflow`);
    if (!hasValue(baseValue) && node.params && hasValue((node.params as any).overflow)) {
      baseValue = (node.params as any).overflow;
    }
    if (!hasValue(baseValue) && hasValue((node as any).inlineStyles?.overflow)) {
      baseValue = (node as any).inlineStyles.overflow;
    }
    const value = hasValue(baseValue) ? (baseValue as any) : 'visible';
    return { value } as { value: 'visible' | 'hidden' | 'scroll' };
  };
}

export function readOverflowAxis(dataPath: string, axis: 'X' | 'Y') {
  return (node: Node) => {
    const hasValue = (value: any) => value !== undefined && value !== null;
    const key = axis === 'X' ? 'overflowX' : 'overflowY';
    let baseValue = getNestedValue(node, `${dataPath}.${key}`);
    if (!hasValue(baseValue) && node.params && hasValue((node.params as any)[key])) {
      baseValue = (node.params as any)[key];
    }
    if (!hasValue(baseValue) && hasValue((node as any).inlineStyles?.[key])) {
      baseValue = (node as any).inlineStyles[key];
    }
    const value = hasValue(baseValue) ? (baseValue as any) : 'visible';
    return { value } as { value: 'visible' | 'hidden' | 'scroll' };
  };
}

/**
 * Helper function to check if node has relevant Tailwind dimension classes
 */
function checkForTailwindDimensionClass(node: Node, property: DimensionProperty): boolean {
  if (!node.className) return false;
  
  const className = node.className;
  
  switch (property) {
    case 'width':
      return /w-\d+|w-\[|w-full|w-auto|w-fit|w-max|w-min|w-screen/.test(className);
    case 'height':
      return /h-\d+|h-\[|h-full|h-auto|h-fit|h-max|h-min|h-screen/.test(className);
    case 'minWidth':
      return /min-w-\d+|min-w-\[|min-w-full|min-w-fit|min-w-max|min-w-min/.test(className);
    case 'minHeight':
      return /min-h-\d+|min-h-\[|min-h-full|min-h-fit|min-h-max|min-h-min/.test(className);
    case 'maxWidth':
      return /max-w-\d+|max-w-\[|max-w-full|max-w-auto|max-w-fit|max-w-max|max-w-min|max-w-screen/.test(className);
    case 'maxHeight':
      return /max-h-\d+|max-h-\[|max-h-full|max-h-auto|max-h-fit|max-h-max|max-h-min|max-h-screen/.test(className);
    default:
      return false;
  }
}

/**
 * Helper function to get nested values from an object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}
