// Transform field mutators
// This will handle updating transform values in nodes

import { Node } from '@/OSDL/OSDL.types';
import type { TransformFieldData, TransformType, TransformValue } from './types';

/**
 * Build CSS transform string from transform values
 * This preserves ALL transform functions, not just the active one
 */
const buildTransformString = (values: TransformValue): string => {
  const transforms: string[] = [];

  // Always include translate if any translate values exist
  if (values.translateX !== undefined || values.translateY !== undefined || values.translateZ !== undefined) {
    const x = values.translateX || 0;
    const y = values.translateY || 0;
    const z = values.translateZ || 0;
    if (z !== 0) {
      transforms.push(`translate3d(${x}px, ${y}px, ${z}px)`);
    } else if (x !== 0 || y !== 0) {
      transforms.push(`translate(${x}px, ${y}px)`);
    }
  }

  // Always include rotate if angle exists
  if (values.angle !== undefined && values.angle !== 0) {
    // Check if we have 3D rotation axis values
    const has3DAxis = (values.rotateX !== undefined && values.rotateX !== 0) || 
                     (values.rotateY !== undefined && values.rotateY !== 0) || 
                     (values.rotateZ !== undefined && values.rotateZ !== 0);
    
    if (has3DAxis) {
      const x = values.rotateX || 0;
      const y = values.rotateY || 0;
      const z = values.rotateZ || 0;
      transforms.push(`rotate3d(${x}, ${y}, ${z}, ${values.angle}deg)`);
    } else {
      // Simple 2D rotation around Z-axis
      transforms.push(`rotate(${values.angle}deg)`);
    }
  }

  // Always include scale if any scale values exist
  if (values.scaleX !== undefined || values.scaleY !== undefined || values.scaleZ !== undefined) {
    const scaleX = values.scaleX || 1;
    const scaleY = values.scaleY || 1;
    const scaleZ = values.scaleZ || 1;
    if (scaleZ !== 1) {
      transforms.push(`scale3d(${scaleX}, ${scaleY}, ${scaleZ})`);
    } else if (scaleX !== 1 || scaleY !== 1) {
      if (scaleX === scaleY) {
        transforms.push(`scale(${scaleX})`);
      } else {
        transforms.push(`scale(${scaleX}, ${scaleY})`);
      }
    }
  }

  // Always include skew if any skew values exist
  if (values.skewX !== undefined || values.skewY !== undefined) {
    const skewX = values.skewX || 0;
    const skewY = values.skewY || 0;
    if (skewX !== 0 && skewY !== 0) {
      transforms.push(`skew(${skewX}deg, ${skewY}deg)`);
    } else if (skewX !== 0) {
      transforms.push(`skewX(${skewX}deg)`);
    } else if (skewY !== 0) {
      transforms.push(`skewY(${skewY}deg)`);
    }
  }

  // Always include perspective if it exists
  if (values.perspective !== undefined && values.perspective > 0) {
    transforms.push(`perspective(${values.perspective}px)`);
  }

  return transforms.join(' ');
};

/**
 * Create transform mutators for updating transform values
 */
export const createTransformMutators = (
  node: Node,
  onIframeUpdate?: (nodeId: string, changes: Record<string, any>) => void,
  interactionsInlineStyle?: string
) => {
  return {
    // Update a specific transform value
    updateTransformValue: (
      property: keyof TransformValue, 
      value: number | string, 
      currentValues: TransformValue,
      ctx?: { breakpoint?: string; locale?: string; interaction?: string }
    ) => {
      console.log('updateTransformValue called:', { property, value, currentValues, ctx });
      if (!onIframeUpdate) {
        console.warn('No onIframeUpdate function available');
        return;
      }

      // Create updated values object
      const updatedValues = { ...currentValues, [property]: value };
      
      // Build the new transform string (preserves all existing transforms)
      const transformString = buildTransformString(updatedValues);
      
      // Handle interaction state updates
      if (ctx?.interaction) {
        if (!interactionsInlineStyle) {
          console.warn('Cannot update interaction state: interactionsInlineStyle not provided');
          return;
        }
        
        const changes = {
          interactionStates: {
            [ctx.interaction]: {
              inlineStyles: {
                [interactionsInlineStyle]: transformString
              }
            }
          }
        };
        onIframeUpdate(node.id, changes);
        return;
      }

      // Handle responsive override updates
      if (ctx?.breakpoint) {
        const changes = {
          responsiveOverrides: {
            [ctx.breakpoint]: {
              params: {
                transform: transformString
              }
            }
          }
        };
        onIframeUpdate(node.id, changes);
        return;
      }

      // Handle locale override updates
      if (ctx?.locale) {
        const changes = {
          localeOverrides: {
            [ctx.locale]: {
              params: {
                transform: transformString
              }
            }
          }
        };
        onIframeUpdate(node.id, changes);
        return;
      }

      // Regular update to params (base value)
      const changes: any = {
        params: {
          transform: transformString
        }
      };
      
      // Add advanced 3D properties if they exist
      if (updatedValues.transformStyle) {
        changes.params.transformStyle = updatedValues.transformStyle;
      }
      if (updatedValues.backfaceVisibility) {
        changes.params.backfaceVisibility = updatedValues.backfaceVisibility;
      }
      onIframeUpdate(node.id, changes);
    },

    // Update transform type (translate, rotate, scale, skew)
    // Note: This doesn't actually change the transform type, just the UI focus
    updateTransformType: (
      newType: TransformType,
      currentValues: TransformValue,
      ctx?: { breakpoint?: string; locale?: string; interaction?: string }
    ) => {
      // This is now just a UI change - the actual transform string doesn't change
      // The transform type only affects which controls are shown in the UI
      console.log('Transform type changed to:', newType, 'but transform values preserved');
    },

    // Update transform origin
    updateTransformOrigin: (
      axis: 'x' | 'y',
      value: string,
      currentOrigin: { x: string; y: string },
      ctx?: { breakpoint?: string; locale?: string; interaction?: string }
    ) => {
      console.log('updateTransformOrigin called:', { axis, value, currentOrigin, ctx });
      if (!onIframeUpdate) {
        console.warn('No onIframeUpdate function available');
        return;
      }

      const updatedOrigin = { ...currentOrigin, [axis]: value };
      const originString = `${updatedOrigin.x} ${updatedOrigin.y}`;
      console.log('Updated origin string:', originString);
      
      // Handle interaction state updates
      if (ctx?.interaction) {
        if (!interactionsInlineStyle) {
          console.warn('Cannot update interaction state: interactionsInlineStyle not provided');
          return;
        }
        
        const changes = {
          interactionStates: {
            [ctx.interaction]: {
              inlineStyles: {
                transformOrigin: originString
              }
            }
          }
        };
        onIframeUpdate(node.id, changes);
        return;
      }

      // Handle responsive override updates
      if (ctx?.breakpoint) {
        const changes = {
          responsiveOverrides: {
            [ctx.breakpoint]: {
              params: {
                transformOrigin: originString
              }
            }
          }
        };
        onIframeUpdate(node.id, changes);
        return;
      }

      // Handle locale override updates
      if (ctx?.locale) {
        const changes = {
          localeOverrides: {
            [ctx.locale]: {
              params: {
                transformOrigin: originString
              }
            }
          }
        };
        onIframeUpdate(node.id, changes);
        return;
      }

      // Regular update to params (base value)
      const changes = {
        params: {
          transformOrigin: originString
        }
      };
      console.log('Updating transform origin:', changes);
      onIframeUpdate(node.id, changes);
    },

    // Reset transform to default values
    resetTransform: (ctx?: { breakpoint?: string; locale?: string; interaction?: string }) => {
      if (!onIframeUpdate) return;

      const defaultValues: TransformValue = {
        translateX: 0,
        translateY: 0,
        translateZ: 0,
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        skewX: 0,
        skewY: 0,
        perspective: 0
      };

      const transformString = buildTransformString(defaultValues);
      
      // Handle interaction state updates
      if (ctx?.interaction) {
        if (!interactionsInlineStyle) {
          console.warn('Cannot update interaction state: interactionsInlineStyle not provided');
          return;
        }
        
        const changes = {
          interactionStates: {
            [ctx.interaction]: {
              inlineStyles: {
                [interactionsInlineStyle]: transformString
              }
            }
          }
        };
        onIframeUpdate(node.id, changes);
        return;
      }

      // Regular update to params
      const changes = {
        params: {
          transform: transformString,
          transformOrigin: '50% 50%'
        }
      };
      onIframeUpdate(node.id, changes);
    }
  };
};
