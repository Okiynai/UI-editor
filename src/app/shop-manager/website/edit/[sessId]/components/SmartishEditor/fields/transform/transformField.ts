// Transform field definition
// This creates a field that uses the transform reader and mutators

import { Field } from '../../types';
import { createTransformReader } from './reader';
import { createTransformMutators } from './mutators';
import { sendRemoveOverrideForPath } from '../../utils/updatingUtils';

export const transformField: Field = {
  id: 'transform',
  rendererKey: 'transform',
  showOverrides: true,
  interactionsInlineStyle: 'transform',
  rendererConfig: {
    label: 'Transform',
    availableTransforms: ['translate', 'rotate', 'scale', 'skew']
  },
  reader: (node, siteSettings) => {
    const transformReader = createTransformReader('params.transform');
    return transformReader(node, siteSettings);
  },
  createMutators: (node, onIframeUpdate, interactionsInlineStyle) => {
    const transformMutators = createTransformMutators(node, onIframeUpdate, interactionsInlineStyle);
    
    // Return a mutations object that matches the expected interface
    return {
      update: (value: any, ctx?: { breakpoint?: string; locale?: string; interaction?: string; transition?: any }) => {
        // Handle different types of updates based on the value structure
        if (typeof value === 'object' && value !== null) {
          if (value.property && value.value !== undefined) {
            // Update specific transform property
            transformMutators.updateTransformValue(
              value.property, 
              value.value, 
              value.currentValues || {},
              ctx
            );
          } else if (value.transformType) {
            // Update transform type (UI only)
            transformMutators.updateTransformType(
              value.transformType,
              value.currentValues || {},
              ctx
            );
          } else if (value.originAxis && value.originValue) {
            // Update transform origin
            transformMutators.updateTransformOrigin(
              value.originAxis,
              value.originValue,
              value.currentOrigin || { x: '50%', y: '50%' },
              ctx
            );
          } else if (ctx?.interaction && ctx?.transition) {
            // Handle transition updates for interaction states
            const existingInteractionState = (node.interactionStates as any)?.[ctx.interaction] || {};
            const existingInlineStyles = existingInteractionState.inlineStyles || {};
            const existingTransitions = existingInteractionState.transitions || [];
            
            // Create transition object for the transform property
            const transition = {
              prop: 'transform',
              durationMs: ctx.transition.durationMs,
              easing: ctx.transition.easing,
              waitDurationMs: ctx.transition.waitDurationMs || 0
            };
            
            // Update or add transition for transform property
            const updatedTransitions = existingTransitions.map((t: any) => 
              t.prop === 'transform' 
                ? { ...t, ...transition }
                : t
            );
            
            // If no existing transition for transform, add it
            if (!existingTransitions.some((t: any) => t.prop === 'transform')) {
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
          }
        } else if (value === null && ctx?.interaction && ctx?.transition) {
          // Handle transition-only updates for interaction states (called from OverrideUtils)
          const existingInteractionState = (node.interactionStates as any)?.[ctx.interaction] || {};
          const existingInlineStyles = existingInteractionState.inlineStyles || {};
          const existingTransitions = existingInteractionState.transitions || [];
          
          // Create transition object for the transform property
          const transition = {
            prop: 'transform',
            durationMs: ctx.transition.durationMs,
            easing: ctx.transition.easing,
            waitDurationMs: ctx.transition.waitDurationMs || 0
          };
          
          // Update or add transition for transform property
          const updatedTransitions = existingTransitions.map((t: any) => 
            t.prop === 'transform' 
              ? { ...t, ...transition }
              : t
          );
          
          // If no existing transition for transform, add it
          if (!existingTransitions.some((t: any) => t.prop === 'transform')) {
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
        } else {
          // Simple value update - treat as transform string
          if (onIframeUpdate) {
            const changes = {
              params: {
                transform: value
              }
            };
            onIframeUpdate(node.id, changes);
          }
        }
      },
      // Override methods
      createOverride: (ctx: { breakpoint?: string; locale?: string; interaction?: string; transition?: any }) => {
        if (!onIframeUpdate) return;
        
        // Get the BASE value from node.params, not the current active value
        const baseTransform = (node.params as any)?.transform || 'translate(0px, 0px)';
        const baseTransformOrigin = (node.params as any)?.transformOrigin || '50% 50%';
        
        const changes: any = {};
        
        if (ctx.breakpoint) {
          changes.responsiveOverrides = {
            [ctx.breakpoint]: {
              params: {
                transform: baseTransform,
                transformOrigin: baseTransformOrigin
              }
            }
          };
        } else if (ctx.locale) {
          changes.localeOverrides = {
            [ctx.locale]: {
              params: {
                transform: baseTransform,
                transformOrigin: baseTransformOrigin
              }
            }
          };
        } else if (ctx.interaction) {
          // Get existing interaction state to preserve existing data
          const existingInteractionState = (node.interactionStates as any)?.[ctx.interaction] || {};
          const existingInlineStyles = existingInteractionState.inlineStyles || {};
          const existingTransitions = existingInteractionState.transitions || [];
          
          // Create transition object for the transform property
          const transition = {
            prop: 'transform',
            durationMs: ctx.transition?.durationMs || 75,
            easing: ctx.transition?.easing || 'ease',
            waitDurationMs: ctx.transition?.waitDurationMs || 0
          };
          
          // Update or add transition for transform property
          const updatedTransitions = existingTransitions.map((t: any) => 
            t.prop === 'transform' 
              ? { ...t, ...transition }
              : t
          );
          
          // If no existing transition for transform, add it
          if (!existingTransitions.some((t: any) => t.prop === 'transform')) {
            updatedTransitions.push(transition);
          }
          
          changes.interactionStates = {
            [ctx.interaction]: {
              inlineStyles: {
                ...existingInlineStyles,
                transform: baseTransform,
                transformOrigin: baseTransformOrigin
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
        
        // For regular breakpoint/locale overrides, use the same mechanism as default mutators
        // This will properly remove the entire override entry
        sendRemoveOverrideForPath(node, 'params.transform', ctx, onIframeUpdate);
      }
    };
  }
};