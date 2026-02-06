// Position field definition
// Uses default mutators for simple positioning properties

import { Field } from '../../types';
import { defaultMutatorsCreator } from '../../utils/defaults/defaultMutatorsCreator';
import { sendRemoveOverrideForPath } from '../../utils/updatingUtils';

export const positionField: Field = {
  id: 'position',
  rendererKey: 'position',
  showOverrides: true,
  interactionsInlineStyle: 'position',
  rendererConfig: {
    label: 'Position',
    availablePositions: ['static', 'relative', 'absolute', 'fixed', 'sticky']
  },
  reader: (node, siteSettings) => {
    // Read position type
    const position = node.positioning?.position || 'static';
    
    // Read individual values
    const top = node.positioning?.top;
    const right = node.positioning?.right;
    const bottom = node.positioning?.bottom;
    const left = node.positioning?.left;
    const zIndex = node.positioning?.zIndex;

    // Parse values - convert px strings to numbers for UI
    const parseValue = (value: any): number | string | undefined => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.endsWith('px')) {
        const num = parseFloat(value);
        return isNaN(num) ? undefined : num;
      }
      return value;
    };

    // Build overrides array
    const overrides: Array<{ scope: 'responsive' | 'locale' | 'interaction'; key: string; value: any }> = [];
    
    // Process responsive overrides
    if (node.responsiveOverrides) {
      Object.keys(node.responsiveOverrides).forEach((bp) => {
        const override = (node.responsiveOverrides as any)[bp];
        if (override?.positioning) {
          overrides.push({ 
            scope: 'responsive', 
            key: bp, 
            value: override.positioning 
          });
        }
      });
    }
    
    // Process locale overrides
    if (node.localeOverrides) {
      Object.keys(node.localeOverrides).forEach((loc) => {
        const override = (node.localeOverrides as any)[loc];
        if (override?.positioning) {
          overrides.push({ 
            scope: 'locale', 
            key: loc, 
            value: override.positioning 
          });
        }
      });
    }
    
    // Process interaction state overrides
    if (node.interactionStates) {
      Object.keys(node.interactionStates).forEach((interactionState) => {
        const interactionData = (node.interactionStates as any)[interactionState];
        if (interactionData?.inlineStyles) {
          const positionStyles: any = {};
          if (interactionData.inlineStyles.position) positionStyles.position = interactionData.inlineStyles.position;
          if (interactionData.inlineStyles.top) positionStyles.top = interactionData.inlineStyles.top;
          if (interactionData.inlineStyles.right) positionStyles.right = interactionData.inlineStyles.right;
          if (interactionData.inlineStyles.bottom) positionStyles.bottom = interactionData.inlineStyles.bottom;
          if (interactionData.inlineStyles.left) positionStyles.left = interactionData.inlineStyles.left;
          if (interactionData.inlineStyles.zIndex) positionStyles.zIndex = interactionData.inlineStyles.zIndex;
          
          if (Object.keys(positionStyles).length > 0) {
            overrides.push({ 
              scope: 'interaction', 
              key: interactionState, 
              value: positionStyles 
            });
          }
        }
      });
    }

    return {
      activePosition: position,
      values: {
        type: position,
        top: parseValue(top),
        right: parseValue(right),
        bottom: parseValue(bottom),
        left: parseValue(left),
        zIndex: typeof zIndex === 'number' ? zIndex : undefined
      },
      overrides
    };
  },
  createMutators: (node, onIframeUpdate, interactionsInlineStyle) => {
    return {
      update: (value: any, ctx?: { breakpoint?: string; locale?: string; interaction?: string; transition?: any }) => {
        if (!onIframeUpdate) return;

        // Handle interaction state updates
        if (ctx?.interaction) {
          if (!interactionsInlineStyle) {
            console.warn('Cannot update interaction state: interactionsInlineStyle not provided');
            return;
          }

          // Get existing interaction state to preserve existing data
          const existingInteractionState = (node.interactionStates as any)?.[ctx.interaction] || {};
          const existingInlineStyles = existingInteractionState.inlineStyles || {};
          const existingTransitions = existingInteractionState.transitions || [];

          // Handle position type change in interaction
          if (value && value.activePosition) {
            const changes = {
              interactionStates: {
                [ctx.interaction]: {
                  inlineStyles: {
                    ...existingInlineStyles,
                    position: value.activePosition
                  },
                  transitions: existingTransitions
                }
              }
            };
            onIframeUpdate(node.id, changes);
            return;
          }

          // Handle individual value changes in interaction
          if (value && value.property && value.value !== undefined) {
            // Don't add 'px' to zIndex - it's unitless
            const formattedValue = value.property === 'zIndex' 
              ? value.value 
              : (typeof value.value === 'number' ? `${value.value}px` : value.value);

            const changes = {
              interactionStates: {
                [ctx.interaction]: {
                  inlineStyles: {
                    ...existingInlineStyles,
                    [value.property]: formattedValue
                  },
                  transitions: existingTransitions
                }
              }
            };
            onIframeUpdate(node.id, changes);
            return;
          }

          // Handle transition updates for interaction states
          if (ctx.transition) {
            const transition = {
              prop: interactionsInlineStyle,
              durationMs: ctx.transition.durationMs,
              easing: ctx.transition.easing,
              waitDurationMs: ctx.transition.waitDurationMs || 0
            };
            
            // Update or add transition for this property
            const updatedTransitions = existingTransitions.map((t: any) => 
              t.prop === interactionsInlineStyle 
                ? { ...t, ...transition }
                : t
            );
            
            // If no existing transition for this property, add it
            if (!existingTransitions.some((t: any) => t.prop === interactionsInlineStyle)) {
              updatedTransitions.push(transition);
            }
            
            const changes = {
              interactionStates: {
                [ctx.interaction]: {
                  inlineStyles: {
                    ...existingInlineStyles
                  },
                  transitions: updatedTransitions
                }
              }
            };
            onIframeUpdate(node.id, changes);
            return;
          }
        }

        // Handle regular updates (no interaction context)
        // Handle position type change
        if (value && value.activePosition) {
          const changes = {
            positioning: {
              ...node.positioning,
              position: value.activePosition
            }
          };
          onIframeUpdate(node.id, changes);
        }

        // Handle individual value changes
        if (value && value.property && value.value !== undefined) {
          // Don't add 'px' to zIndex - it's unitless
          const formattedValue = value.property === 'zIndex' 
            ? value.value 
            : (typeof value.value === 'number' ? `${value.value}px` : value.value);
            
          const changes = {
            positioning: {
              ...node.positioning,
              [value.property]: formattedValue
            }
          };
          onIframeUpdate(node.id, changes);
        }
      },
      createOverride: (ctx: { breakpoint?: string; locale?: string; interaction?: string; transition?: any }) => {
        if (!onIframeUpdate) return;
        
        // Get the BASE value from node.positioning
        const basePosition = node.positioning?.position || 'static';
        const baseTop = node.positioning?.top || '0px';
        const baseRight = node.positioning?.right || '0px';
        const baseBottom = node.positioning?.bottom || '0px';
        const baseLeft = node.positioning?.left || '0px';
        const baseZIndex = node.positioning?.zIndex || 0;
        
        const changes: any = {};
        
        if (ctx.breakpoint) {
          changes.responsiveOverrides = {
            [ctx.breakpoint]: {
              positioning: {
                position: basePosition,
                top: baseTop,
                right: baseRight,
                bottom: baseBottom,
                left: baseLeft,
                zIndex: baseZIndex
              }
            }
          };
        } else if (ctx.locale) {
          changes.localeOverrides = {
            [ctx.locale]: {
              positioning: {
                position: basePosition,
                top: baseTop,
                right: baseRight,
                bottom: baseBottom,
                left: baseLeft,
                zIndex: baseZIndex
              }
            }
          };
        } else if (ctx.interaction) {
          // Get existing interaction state to preserve existing data
          const existingInteractionState = (node.interactionStates as any)?.[ctx.interaction] || {};
          const existingInlineStyles = existingInteractionState.inlineStyles || {};
          const existingTransitions = existingInteractionState.transitions || [];
          
          // Create transition object for the position property
          const transition = {
            prop: interactionsInlineStyle,
            durationMs: ctx.transition?.durationMs || 75,
            easing: ctx.transition?.easing || 'ease',
            waitDurationMs: ctx.transition?.waitDurationMs || 0
          };
          
          // Update or add transition for this property
          const updatedTransitions = existingTransitions.map((t: any) => 
            t.prop === interactionsInlineStyle 
              ? { ...t, ...transition }
              : t
          );
          
          // If no existing transition for this property, add it
          if (!existingTransitions.some((t: any) => t.prop === interactionsInlineStyle)) {
            updatedTransitions.push(transition);
          }
          
          changes.interactionStates = {
            [ctx.interaction]: {
              inlineStyles: {
                ...existingInlineStyles,
                position: basePosition,
                top: baseTop,
                right: baseRight,
                bottom: baseBottom,
                left: baseLeft,
                zIndex: baseZIndex
              },
              transitions: updatedTransitions
            }
          };
        }
        
        onIframeUpdate(node.id, changes);
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
          
          // Use __unset mechanism like other removals
          const unsetPath = `interactionStates.${interactionState}.inlineStyles.${cssProperty}`;
          
          onIframeUpdate(node.id, {
            __unset: [
              { scope: 'interaction', key: interactionState, path: unsetPath }
            ]
          });
          return;
        }
        
        // For regular breakpoint/locale overrides
        sendRemoveOverrideForPath(node, 'positioning', ctx, onIframeUpdate);
      }
    };
  }
};
