import { Node } from "@/OSDL/OSDL.types";
import { getNestedValue } from "./updatingUtils";

/**
 * Gets all override values for a specific data path
 * Used by renderer to display current override state
 */
export const getOverridesForPath = (node: Node, dataPath: string) => {
  const responsiveOverrides: Record<string, any> = {};
  const localeOverrides: Record<string, any> = {};
  const interactionOverrides: Record<string, any> = {};
  
  // Get responsive overrides for this path
  if (node.responsiveOverrides) {
    Object.keys(node.responsiveOverrides).forEach(breakpoint => {
      const value = getNestedValue((node as any).responsiveOverrides[breakpoint], dataPath);
      if (value !== undefined) {
        responsiveOverrides[breakpoint] = value;
      }
    });
  }
  
  // Get locale overrides for this path
  if (node.localeOverrides) {
    Object.keys(node.localeOverrides).forEach(locale => {
      const value = getNestedValue((node as any).localeOverrides[locale], dataPath);
      if (value !== undefined) {
        localeOverrides[locale] = value;
      }
    });
  }
  
  // Get interaction overrides for this path
  if ((node as any).interactionStates) {
    Object.keys((node as any).interactionStates).forEach(interaction => {
      const interactionState = (node as any).interactionStates[interaction];
      if (interactionState && interactionState.inlineStyles) {
        const value = getNestedValue(interactionState.inlineStyles, dataPath);
        if (value !== undefined) {
          interactionOverrides[interaction] = value;
        }
      }
    });
  }
  
  return {
    responsive: responsiveOverrides,
    locale: localeOverrides,
    interaction: interactionOverrides
  };
};

