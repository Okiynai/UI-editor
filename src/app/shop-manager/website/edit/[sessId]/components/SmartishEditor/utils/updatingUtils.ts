import { Node } from "@/OSDL/OSDL.types";

/**
 * Defines where an update should be applied
 */
type UpdateLocation = {
  type: 'base' | 'responsive' | 'locale';
  breakpoint?: string;
  locale?: string;
  targetObj: any;
  targetPath: string;
};


/** 
 * ==============================================
 * Core functions for updating the node, and its overides
 * ==============================================
 */

export const sendSetNodeValue = (
  field: any, 
  newValue: any, 
  node: Node,
  context?: { breakpoint?: string; locale?: string },
  onUpdateToIframe?: (nodeId: string, changes: Record<string, any>) => void
): void => {
  const { dataPath } = field;
  if (!dataPath || !onUpdateToIframe) return;

  // Determine update location and build changes object
  const updateLocation = determineUpdateLocation(node, field, context);
  const changes = buildChangesObject(updateLocation, newValue);
  
  // Send changes to iframe - it will update the node and send it back
  onUpdateToIframe(node.id, changes);
};

export const sendCreateOverrideForPath = (
  node: Node,
  dataPath: string,
  context: { breakpoint?: string; locale?: string },
  onUpdateToIframe?: (nodeId: string, changes: Record<string, any>) => void
): void => {
  if (!onUpdateToIframe) return;

  // Get the BASE value from node.params, not the current active value
  // This ensures overrides are created from the base value, not from existing overrides
  const baseValue = getBaseValue(node, dataPath);

  // Build nested object structure from a dot path
  const buildNestedObject = (path: string, value: any) => {
    const parts = path.split('.');
    const last = parts.pop();
    const root: any = {};
    let cursor = root;
    for (const part of parts) {
      cursor[part] = {};
      cursor = cursor[part];
    }
    if (last) cursor[last] = value;
    return root;
  };

  if (context.breakpoint) {
    onUpdateToIframe(node.id, {
      responsiveOverrides: {
        [context.breakpoint]: buildNestedObject(dataPath, baseValue),
      },
    });
    return;
  }

  if (context.locale) {
    onUpdateToIframe(node.id, {
      localeOverrides: {
        [context.locale]: buildNestedObject(dataPath, baseValue),
      },
    });
    return;
  }
};

export const sendRemoveOverrideForPath = (
  node: Node,
  dataPath: string,
  context: { breakpoint?: string; locale?: string },
  onUpdateToIframe?: (nodeId: string, changes: Record<string, any>) => void
): void => {
  if (!onUpdateToIframe) return;

  if (context.breakpoint) {
    onUpdateToIframe(node.id, {
      __unset: [
        { scope: 'responsive', key: context.breakpoint, path: dataPath }
      ]
    });
    return;
  }

  if (context.locale) {
    onUpdateToIframe(node.id, {
      __unset: [
        { scope: 'locale', key: context.locale, path: dataPath }
      ]
    });
    return;
  }
};


/** 
 * ==============================================
 * Util functions
 * ==============================================
 */

/**
 * Determines where to apply the update (base, responsive override, or locale override)
 */
export const determineUpdateLocation = (
  node: Node, 
  field: any, 
  context?: { breakpoint?: string; locale?: string }
): UpdateLocation => {
  const { dataPath } = field;
  const pathParts = dataPath.split('.');
  const rootProperty = pathParts[0]; // "params", "layout", or direct property
  
  if (context?.breakpoint) {
    return {
      type: 'responsive',
      breakpoint: context.breakpoint,
      targetObj: getOrCreateOverride(node, 'responsive', context.breakpoint),
      targetPath: dataPath
    };
  } else if (context?.locale) {
    return {
      type: 'locale',
      locale: context.locale,
      targetObj: getOrCreateOverride(node, 'locale', context.locale),
      targetPath: dataPath
    };
  } else {
    return {
      type: 'base',
      targetObj: node,
      targetPath: dataPath
    };
  }
};

/**
 * Builds the changes object based on the update location
 */
export const buildChangesObject = (location: UpdateLocation, newValue: any): Record<string, any> => {
  const changes: Record<string, any> = {};
  
  if (location.type === 'responsive') {
    if (!changes.responsiveOverrides) changes.responsiveOverrides = {};
    if (!changes.responsiveOverrides[location.breakpoint!]) changes.responsiveOverrides[location.breakpoint!] = {};
    setNestedValue(changes.responsiveOverrides[location.breakpoint!], location.targetPath, newValue);
  } else if (location.type === 'locale') {
    if (!changes.localeOverrides) changes.localeOverrides = {};
    if (!changes.localeOverrides[location.locale!]) changes.localeOverrides[location.locale!] = {};
    setNestedValue(changes.localeOverrides[location.locale!], location.targetPath, newValue);
  } else {
    // Base value - use the full targetPath
    setNestedValue(changes, location.targetPath, newValue);
  }
  
  return changes;
};


export const getNestedValue = (obj: any, path: string): any => {
  const parts = path.split('.');
  return parts.reduce((o, p) => o?.[p], obj);
};

/**
 * Get the base value from node.params, not the current active value
 * This ensures overrides are created from the base value, not from existing overrides
 */
export const getBaseValue = (node: Node, dataPath: string): any => {
  // For paths like 'params.transform', get the value directly from node.params
  if (dataPath.startsWith('params.')) {
    const property = dataPath.split('.')[1];
    return (node.params as any)?.[property];
  }
  
  // For other paths, fall back to the regular getNestedValue
  return getNestedValue(node, dataPath);
};

export const setNestedValue = (obj: any, path: string, value: any): void => {
  const parts = path.split('.');
  const last = parts.pop();
  
  if (!last) return;
  
  // Navigate to the target object
  const target = parts.reduce((o, p) => {
    if (!o[p]) o[p] = {};
    return o[p];
  }, obj);
  
  // Set the value
  target[last] = value;
};

export const getOrCreateOverride = (
  node: Node, 
  type: 'responsive' | 'locale', 
  key: string
): any => {
  const overrideProperty = type === 'responsive' ? 'responsiveOverrides' : 'localeOverrides';
  
  if (!node[overrideProperty]) {
    (node as any)[overrideProperty] = {};
  }
  if (!(node as any)[overrideProperty][key]) {
    (node as any)[overrideProperty][key] = {};
  }
  return (node as any)[overrideProperty][key];
};

/**
 * Helper function to create interaction state paths for inline styles
 * Example: createInteractionStatePath('hover', 'backgroundColor') -> 'interactionStates.hover.inlineStyles.backgroundColor'
 */
export const createInteractionStatePath = (
  interactionState: 'hover' | 'focus' | 'active',
  styleProperty: string
): string => {
  return `interactionStates.${interactionState}.inlineStyles.${styleProperty}`;
};

/**
 * Helper function to create interaction state paths for transitions
 * Example: createInteractionTransitionPath('hover', 0, 'durationMs') -> 'interactionStates.hover.transitions.0.durationMs'
 */
export const createInteractionTransitionPath = (
  interactionState: 'hover' | 'focus' | 'active',
  transitionIndex: number,
  transitionProperty: string
): string => {
  return `interactionStates.${interactionState}.transitions.${transitionIndex}.${transitionProperty}`;
};

/**
 * Converts camelCase to kebab-case
 * Example: backgroundColor -> background-color
 */
export const camelToKebab = (str: string): string => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
};