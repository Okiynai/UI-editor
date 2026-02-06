import { Node, SiteSettings } from "@/OSDL/OSDL.types";
import {
    getOverridesForPath, convertUnitToPixels, shouldReturnNumber,
    getFieldTypeFallback, getComputedStyleValue, resolveCSSVariable,
} from "../";

/**
 * Default reader function that handles common field data resolution
 * Returns { value, overrides } where overrides is an array of { scope, key, value }
 */
export const defaultReader = (field: { type: string, dataPath: string, interactionsInlineStyle?: string}, node: Node, siteSettings?: SiteSettings): any => {
  const { dataPath } = field;
  if (!dataPath) return { value: undefined, overrides: [] };
  const hasValue = (value: any) => value !== undefined && value !== null;

  // Parse the dataPath to understand what we're looking for
  const pathParts = dataPath.split('.');
  const rootProperty = pathParts[0]; // "order", "params", or "layout"
  const subProperty = pathParts.slice(1).join('.'); // "text" or "width" or "backgroundColor"

  let resolvedValue: any;

  // --- TIER 1: Try top-level node properties first (highest priority) ---
  if (pathParts.length === 1) {
    // Direct top-level property like "order", "id", "name", "type"
    if (rootProperty in node) {
      resolvedValue = node[rootProperty as keyof Node];
    }
  }

  // --- TIER 2: Try params (second priority) ---
  if (!hasValue(resolvedValue) && rootProperty === 'params' && node.params && typeof node.params === 'object') {
    const params = node.params as Record<string, any>;
    if (params[subProperty] !== undefined) {
      resolvedValue = params[subProperty];
    }
  }

  // --- TIER 3: Try layout for section nodes (third priority) ---
  if (!hasValue(resolvedValue) && rootProperty === 'layout' && node.type === 'section') {
    const sectionNode = node as any;
    if (sectionNode.layout && typeof sectionNode.layout === 'object') {
      const layout = sectionNode.layout as Record<string, any>;
      if (layout[subProperty] !== undefined) {
        resolvedValue = layout[subProperty];
      }
    }
  }

  // --- TIER 3.5: Resolve CSS variables if we found a value ---
  if (resolvedValue && typeof resolvedValue === 'string' && resolvedValue.includes('var(--')) {
    resolvedValue = resolveCSSVariable(resolvedValue, siteSettings);
  }

  console.log("nodeElementresolvedValue", resolvedValue, 'subProperty', subProperty);

  // --- TIER 4: Fallback to DOM computed styles ( probably tailwind classes) ---
  if (!hasValue(resolvedValue)) {
    try {
      const nodeElement = document.getElementById(node.id);
      if (!nodeElement) {
        // Try to locate the preview iframe and search inside its document
        const iframe: HTMLIFrameElement | null = document.querySelector('#preview-area iframe');
        const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;

        const wrapperElement = document.getElementById(`${node.id}-wrapper`) || iframeDoc?.getElementById(`${node.id}-wrapper`);
        if (wrapperElement) {
          const actualNodeElement = (wrapperElement as Element).querySelector(`[data-oskiynai-scope="${node.id}"]`) || (wrapperElement as Element).firstElementChild as Element | null;
          if (actualNodeElement) {
            resolvedValue = getComputedStyleValue(actualNodeElement, subProperty);
            console.log("actualNodeElement", actualNodeElement, resolvedValue);
          }
        } else if (iframeDoc) {
          const iframeNodeElement = iframeDoc.getElementById(node.id);
          if (iframeNodeElement) {
            resolvedValue = getComputedStyleValue(iframeNodeElement, subProperty);
            console.log("iframeNodeElement", iframeNodeElement, resolvedValue);
          }
        }
      } else {
        resolvedValue = getComputedStyleValue(nodeElement, subProperty);
        console.log("nodeElement", nodeElement, resolvedValue);
      }
    } catch (error) {
      console.warn(`Failed to get DOM value for ${dataPath}:`, error);
    }
  }

  // --- TIER 4.5: Resolve CSS variables from DOM computed styles too ---
  if (resolvedValue && typeof resolvedValue === 'string' && resolvedValue.includes('var(--')) {
    resolvedValue = resolveCSSVariable(resolvedValue, siteSettings);
  }

  // --- TIER 5: Fallback to field-type default ---
  const isTextLikeField = field.type === 'text' || field.type === 'textarea';
  if (!hasValue(resolvedValue) || (!isTextLikeField && resolvedValue === '')) {
    resolvedValue = getFieldTypeFallback(field);
  }

  // --- UNIT CONVERSION: Convert to pixels for numeric fields ---
  if (shouldReturnNumber(field) && typeof resolvedValue === 'string') {
    resolvedValue = convertUnitToPixels(resolvedValue);
  }

  // Build overrides array from helper
  const overridesObj = getOverridesForPath(node as any, dataPath);
  const overrides: Array<{ scope: 'responsive' | 'locale' | 'interaction'; key: string; value: any }> = [];
  if (overridesObj?.responsive) {
    Object.keys(overridesObj.responsive).forEach((bp) => {
      let overrideValue = overridesObj.responsive[bp];
      // Resolve CSS variables in overrides too
      if (overrideValue && typeof overrideValue === 'string' && overrideValue.includes('var(--')) {
        overrideValue = resolveCSSVariable(overrideValue, siteSettings);
      }
      overrides.push({ scope: 'responsive', key: bp, value: overrideValue });
    });
  }
  if (overridesObj?.locale) {
    Object.keys(overridesObj.locale).forEach((loc) => {
      let overrideValue = overridesObj.locale[loc];
      // Resolve CSS variables in overrides too
      if (overrideValue && typeof overrideValue === 'string' && overrideValue.includes('var(--')) {
        overrideValue = resolveCSSVariable(overrideValue, siteSettings);
      }
      overrides.push({ scope: 'locale', key: loc, value: overrideValue });
    });
  }
  
  // Process interaction state overrides for fields that support them
  if (node.interactionStates && field.interactionsInlineStyle) {
    const cssProperty = field.interactionsInlineStyle;
    Object.keys(node.interactionStates).forEach((interactionState) => {
      const interactionData = (node.interactionStates as any)[interactionState];
      if (interactionData?.inlineStyles?.[cssProperty]) {
        let interactionValue = interactionData.inlineStyles[cssProperty];
        // Resolve CSS variables in interaction states
        if (interactionValue && typeof interactionValue === 'string' && interactionValue.includes('var(--')) {
          interactionValue = resolveCSSVariable(interactionValue, siteSettings);
        }
        overrides.push({ 
          scope: 'interaction', 
          key: interactionState, 
          value: interactionValue 
        });
      }
    });
  }

  return { value: resolvedValue, overrides };
};
