import { Node } from "@/OSDL/OSDL.types";
import { sendSetNodeValue, sendCreateOverrideForPath, 
    sendRemoveOverrideForPath, getNestedValue, getBaseValue, camelToKebab } from "../updatingUtils";

/**
 * Default mutators creator that handles field value updates
 * Returns mutations object that uses setNodeValue for proper iframe communication
 */
export const defaultMutatorsCreator = (
  field: { type: string, dataPath: string },
  node: Node,
  onIframeUpdate?: (nodeId: string, changes: Record<string, any>) => void,
  interactionsInlineStyle?: string,
): any => {

  // Return mutations object that uses setNodeValue for proper iframe communication
  return {
    update: (value: any, ctx?: { breakpoint?: string; locale?: string; interaction?: string; transition?: any }) => {
      if (!onIframeUpdate) return;
      
      // Handle interaction state updates differently
      if (ctx?.interaction) {
        // For interaction states, update the inlineStyles property
        if (!interactionsInlineStyle) {
          console.warn('Cannot update interaction state: interactionsInlineStyle not provided');
          return;
        }
        
        // If transition data is provided, update the transition settings
        if (ctx.transition) {
          const interactionState = ctx.interaction;
          const transition = ctx.transition;
          const cssProperty = interactionsInlineStyle;
          const kebabCssProperty = camelToKebab(cssProperty);
          
          // Get existing interaction state to preserve existing data
          const existingInteractionState = (node.interactionStates as any)?.[interactionState] || {};
          const existingInlineStyles = existingInteractionState.inlineStyles || {};
          const existingTransitions = existingInteractionState.transitions || [];
          
          // Update or add transition for this property
          const updatedTransitions = existingTransitions.map((t: any) => 
            t.prop === kebabCssProperty 
              ? {
                  ...t,
                  durationMs: transition.durationMs,
                  easing: transition.easing,
                  waitDurationMs: transition.waitDurationMs || 0
                }
              : t
          );
          
          // If no existing transition for this property, add it
          if (!existingTransitions.some((t: any) => t.prop === kebabCssProperty)) {
            updatedTransitions.push({
              prop: kebabCssProperty,
              durationMs: transition.durationMs,
              easing: transition.easing,
              waitDurationMs: transition.waitDurationMs || 0
            });
          }
          
          // Use existing value if no new value provided (for transition-only updates)
          const valueToUse = value !== null ? value : existingInlineStyles[cssProperty];
          
          const changes = {
            interactionStates: {
              [interactionState]: {
                inlineStyles: {
                  ...existingInlineStyles,
                  [cssProperty]: valueToUse
                },
                transitions: updatedTransitions
              }
            }
          };
          onIframeUpdate(node.id, changes);
          return;
        }
        
        // Regular interaction state update (just the value)
        const changes = {
          interactionStates: {
            [ctx.interaction]: {
              inlineStyles: {
                [interactionsInlineStyle]: value
              }
            }
          }
        };
        onIframeUpdate(node.id, changes);
        return;
      }
      
      // Use sendSetNodeValue for regular updates
      sendSetNodeValue(field, value, node, ctx, onIframeUpdate);
    },
    // Optional override helpers for advanced use cases
    createOverride: (ctx: { breakpoint?: string; locale?: string; interaction?: string; transition?: any }) => {
      if (!onIframeUpdate) return;
      
      // Handle interaction state overrides differently
      if (ctx.interaction) {
        // For interaction states, we need to create the interaction state structure
        if (!interactionsInlineStyle) {
          console.warn('Cannot create interaction state: interactionsInlineStyle not provided');
          return;
        }
        
        const interactionState = ctx.interaction; // 'hover', 'focus', 'active'
        const transition = ctx.transition;
        
        if (!transition) {
          console.warn('Cannot create interaction state: transition not provided');
          return;
        }
        
        console.log('Creating interaction state:', { interactionState, transition, nodeId: node.id, interactionsInlineStyle });
        
        const cssProperty = interactionsInlineStyle;
        const kebabCssProperty = camelToKebab(cssProperty);
        
        // Get the BASE value from node.params, not the current active value
        const baseValue = getBaseValue(node, field.dataPath);
        console.log('Base value from field:', { dataPath: field.dataPath, baseValue });
        
        // Get existing interaction state to preserve existing data
        const existingInteractionState = (node.interactionStates as any)?.[interactionState] || {};
        const existingInlineStyles = existingInteractionState.inlineStyles || {};
        const existingTransitions = existingInteractionState.transitions || [];
        
        // Create the base interaction state structure, preserving existing data
        const baseInteractionState = {
          inlineStyles: {
            ...existingInlineStyles,
            [cssProperty]: baseValue
          },
          transitions: [
            ...existingTransitions,
            {
              prop: kebabCssProperty,
              durationMs: transition.durationMs,
              easing: transition.easing,
              waitDurationMs: transition.waitDurationMs || 0
            }
          ]
        };
        
        // Send the interaction state creation using the proper nested structure
        const changes = {
          interactionStates: {
            [interactionState]: baseInteractionState
          }
        };
        
        console.log('Sending changes:', changes);
        console.log('This should ONLY contain interactionStates, no base properties');
        onIframeUpdate(node.id, changes);
        return;
      }
      
      // For regular breakpoint/locale overrides (only if not interaction)
      if (ctx.breakpoint || ctx.locale) {
        sendCreateOverrideForPath(node, field.dataPath, ctx, onIframeUpdate);
      }
    },
    removeOverride: (ctx: { breakpoint?: string; locale?: string; interaction?: string }) => {
      if (!onIframeUpdate) return;
      
      // Handle interaction state removal
      if (ctx.interaction) {
        if (!interactionsInlineStyle) {
          console.warn('Cannot remove interaction state: interactionsInlineStyle not provided');
          return;
        }
        
        const interactionState = ctx.interaction;
        const cssProperty = interactionsInlineStyle;
        
        console.log('=== REMOVING INTERACTION STATE ===');
        console.log('interactionState:', interactionState);
        console.log('cssProperty:', cssProperty);
        
        // Use __unset mechanism like other removals
        const unsetPath = `interactionStates.${interactionState}.inlineStyles.${cssProperty}`;
        
        console.log('Using __unset with path:', unsetPath);
        
        onIframeUpdate(node.id, {
          __unset: [
            { scope: 'interaction', key: interactionState, path: unsetPath }
          ]
        });
        return;
      }
      
      // For regular breakpoint/locale overrides
      sendRemoveOverrideForPath(node, field.dataPath, ctx, onIframeUpdate);
    },
    // Add other mutation methods as needed
  };
};

