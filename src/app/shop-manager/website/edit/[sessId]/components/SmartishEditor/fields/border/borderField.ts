import { Field } from "../../types";
import { sendRemoveOverrideForPath, getOverridesForPath, camelToKebab } from "../../utils";

export const borderField: Field = {
  id: "border",
  rendererKey: "border",
  showOverrides: true,
  interactionsInlineStyle: "border",
  rendererConfig: { label: "Border" },
  reader(node) {
    const p = (node.params as any) || {};
    return {
      border: p.border,
      borderTop: p.borderTop,
      borderRight: p.borderRight,
      borderBottom: p.borderBottom,
      borderLeft: p.borderLeft,
      borderRadius: p.borderRadius,
      borderTopLeftRadius: p.borderTopLeftRadius,
      borderTopRightRadius: p.borderTopRightRadius,
      borderBottomRightRadius: p.borderBottomRightRadius,
      borderBottomLeftRadius: p.borderBottomLeftRadius,
      overrides: buildBorderOverrides(node),
    };
  },
  createMutators(node, onIframeUpdate, interactionsInlineStyle) {
    return {
      // Border shorthand or per-side longhands
      setBorder: (cssBorder: string | { top?: string; right?: string; bottom?: string; left?: string }) => {
        if (typeof cssBorder === 'string') {
          onIframeUpdate(node.id, { params: { border: cssBorder, borderTop: undefined, borderRight: undefined, borderBottom: undefined, borderLeft: undefined } });
        } else {
          const update: any = {};
          if (cssBorder.top !== undefined) update.borderTop = cssBorder.top;
          if (cssBorder.right !== undefined) update.borderRight = cssBorder.right;
          if (cssBorder.bottom !== undefined) update.borderBottom = cssBorder.bottom;
          if (cssBorder.left !== undefined) update.borderLeft = cssBorder.left;
          update.border = '';
          if (Object.keys(update).length > 0) onIframeUpdate(node.id, { params: update });
        }
      },
      // Radius shorthand or per-corner longhands
      setBorderRadius: (css: string | { topLeft?: string; topRight?: string; bottomRight?: string; bottomLeft?: string }) => {
        if (typeof css === 'string') {
          onIframeUpdate(node.id, { params: { borderRadius: css, borderTopLeftRadius: undefined, borderTopRightRadius: undefined, borderBottomRightRadius: undefined, borderBottomLeftRadius: undefined } });
        } else {
          const update: any = {};
          if (css.topLeft !== undefined) update.borderTopLeftRadius = css.topLeft;
          if (css.topRight !== undefined) update.borderTopRightRadius = css.topRight;
          if (css.bottomRight !== undefined) update.borderBottomRightRadius = css.bottomRight;
          if (css.bottomLeft !== undefined) update.borderBottomLeftRadius = css.bottomLeft;
          update.borderRadius = '';
          if (Object.keys(update).length > 0) onIframeUpdate(node.id, { params: update });
        }
      },
      // Override handling mutations
      update: (value: any, ctx?: { breakpoint?: string; locale?: string; interaction?: string; transition?: any }) => {
        if (!onIframeUpdate) return;

        // Interaction inline style update
        if (ctx?.interaction && interactionsInlineStyle) {
          const interactionState = ctx.interaction;
          const existingState = (node.interactionStates as any)?.[interactionState] || {};
          const existingInlineStyles = existingState.inlineStyles || {};
          const existingTransitions = existingState.transitions || [];
          
          let changes: any = {
            interactionStates: {
              [interactionState]: {
                inlineStyles: { ...existingInlineStyles }
              }
            }
          };

          // If value is null, this is likely a transition-only update
          if (value === null && ctx.transition) {
            // Just update transitions, preserve existing inline styles
            const borderProps = ['border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'];
            const updatedTransitions = [...existingTransitions];
            
            borderProps.forEach(prop => {
              const transition = {
                prop: prop,
                durationMs: ctx.transition.durationMs || 75,
                easing: ctx.transition.easing || 'ease',
                waitDurationMs: ctx.transition.waitDurationMs || 0
              };
              const existingIndex = updatedTransitions.findIndex((t: any) => t.prop === prop);
              if (existingIndex >= 0) {
                updatedTransitions[existingIndex] = transition;
              } else {
                updatedTransitions.push(transition);
              }
            });
            
            changes.interactionStates[interactionState].transitions = updatedTransitions;
            onIframeUpdate(node.id, changes);
            return;
          }

          // Safety check for value
          if (!value || typeof value !== 'object') {
            return;
          }

          // Update border properties - avoid mixing shorthand and longhand
          const hasIndividualSides = value.borderTop !== undefined || value.borderRight !== undefined || value.borderBottom !== undefined || value.borderLeft !== undefined;
          const hasIndividualCorners = value.borderTopLeftRadius !== undefined || value.borderTopRightRadius !== undefined || value.borderBottomRightRadius !== undefined || value.borderBottomLeftRadius !== undefined;
          
          if (hasIndividualSides) {
            // Using individual sides - clear shorthand to avoid conflicts
            changes.interactionStates[interactionState].inlineStyles.border = undefined;
            if (value.borderTop !== undefined) changes.interactionStates[interactionState].inlineStyles.borderTop = value.borderTop;
            if (value.borderRight !== undefined) changes.interactionStates[interactionState].inlineStyles.borderRight = value.borderRight;
            if (value.borderBottom !== undefined) changes.interactionStates[interactionState].inlineStyles.borderBottom = value.borderBottom;
            if (value.borderLeft !== undefined) changes.interactionStates[interactionState].inlineStyles.borderLeft = value.borderLeft;
          } else if (value.border !== undefined) {
            // Using shorthand - clear individual sides to avoid conflicts
            changes.interactionStates[interactionState].inlineStyles.border = value.border;
            changes.interactionStates[interactionState].inlineStyles.borderTop = undefined;
            changes.interactionStates[interactionState].inlineStyles.borderRight = undefined;
            changes.interactionStates[interactionState].inlineStyles.borderBottom = undefined;
            changes.interactionStates[interactionState].inlineStyles.borderLeft = undefined;
          }
          
          if (hasIndividualCorners) {
            // Using individual corners - clear shorthand radius
            changes.interactionStates[interactionState].inlineStyles.borderRadius = undefined;
            if (value.borderTopLeftRadius !== undefined) changes.interactionStates[interactionState].inlineStyles.borderTopLeftRadius = value.borderTopLeftRadius;
            if (value.borderTopRightRadius !== undefined) changes.interactionStates[interactionState].inlineStyles.borderTopRightRadius = value.borderTopRightRadius;
            if (value.borderBottomRightRadius !== undefined) changes.interactionStates[interactionState].inlineStyles.borderBottomRightRadius = value.borderBottomRightRadius;
            if (value.borderBottomLeftRadius !== undefined) changes.interactionStates[interactionState].inlineStyles.borderBottomLeftRadius = value.borderBottomLeftRadius;
          } else if (value.borderRadius !== undefined) {
            // Using shorthand radius - clear individual corners
            changes.interactionStates[interactionState].inlineStyles.borderRadius = value.borderRadius;
            changes.interactionStates[interactionState].inlineStyles.borderTopLeftRadius = undefined;
            changes.interactionStates[interactionState].inlineStyles.borderTopRightRadius = undefined;
            changes.interactionStates[interactionState].inlineStyles.borderBottomRightRadius = undefined;
            changes.interactionStates[interactionState].inlineStyles.borderBottomLeftRadius = undefined;
          }

          // Handle transitions - only update if we have actual transition data
          if (ctx.transition && ctx.transition.durationMs !== undefined) {
            const borderProps = ['border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'];
            const updatedTransitions = [...existingTransitions];
            
            borderProps.forEach(prop => {
              const transition = {
                prop: prop,
                durationMs: ctx.transition.durationMs || 75,
                easing: ctx.transition.easing || 'ease',
                waitDurationMs: ctx.transition.waitDurationMs || 0
              };
              const existingIndex = updatedTransitions.findIndex((t: any) => t.prop === prop);
              if (existingIndex >= 0) {
                updatedTransitions[existingIndex] = transition;
              } else {
                updatedTransitions.push(transition);
              }
            });
            
            changes.interactionStates[interactionState].transitions = updatedTransitions;
          }

          onIframeUpdate(node.id, changes);
          return;
        }

        // Breakpoint/locale updates
        if (ctx?.breakpoint) {
          onIframeUpdate(node.id, { responsiveOverrides: { [ctx.breakpoint]: { params: value } } });
          return;
        }

        if (ctx?.locale) {
          onIframeUpdate(node.id, { localeOverrides: { [ctx.locale]: { params: value } } });
          return;
        }

        // Default params update
        onIframeUpdate(node.id, { params: value });
      },
      createOverride: (ctx: { breakpoint?: string; locale?: string; interaction?: string; transition?: any }) => {
        if (!onIframeUpdate) return;
        const baseParams = (node.params as any) || {};

        if (ctx.interaction && interactionsInlineStyle) {
          const interactionState = ctx.interaction;
          const existingState = (node.interactionStates as any)?.[interactionState] || {};
          const existingInlineStyles = existingState.inlineStyles || {};
          const existingTransitions = existingState.transitions || [];
          
          const borderProps = ['border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'];
          const transitions = borderProps.map(prop => ({
            prop: prop,
            durationMs: ctx.transition?.durationMs || 75,
            easing: ctx.transition?.easing || 'ease',
            waitDurationMs: ctx.transition?.waitDurationMs || 0
          }));
          
          const updatedTransitions = [...existingTransitions];
          transitions.forEach(transition => {
            const existingIndex = updatedTransitions.findIndex((t: any) => t.prop === transition.prop);
            if (existingIndex >= 0) {
              updatedTransitions[existingIndex] = transition;
            } else {
              updatedTransitions.push(transition);
            }
          });

          // Determine which approach to use based on base params to avoid conflicts
          const hasBaseSides = baseParams.borderTop || baseParams.borderRight || baseParams.borderBottom || baseParams.borderLeft;
          const hasBaseCorners = baseParams.borderTopLeftRadius || baseParams.borderTopRightRadius || baseParams.borderBottomRightRadius || baseParams.borderBottomLeftRadius;
          
          const inlineStyles = { ...existingInlineStyles };
          
          if (hasBaseSides) {
            // Use individual sides approach
            inlineStyles.border = undefined;
            inlineStyles.borderTop = baseParams.borderTop || '';
            inlineStyles.borderRight = baseParams.borderRight || '';
            inlineStyles.borderBottom = baseParams.borderBottom || '';
            inlineStyles.borderLeft = baseParams.borderLeft || '';
          } else {
            // Use shorthand approach
            inlineStyles.border = baseParams.border || '';
            inlineStyles.borderTop = undefined;
            inlineStyles.borderRight = undefined;
            inlineStyles.borderBottom = undefined;
            inlineStyles.borderLeft = undefined;
          }
          
          if (hasBaseCorners) {
            // Use individual corners approach
            inlineStyles.borderRadius = undefined;
            inlineStyles.borderTopLeftRadius = baseParams.borderTopLeftRadius || '';
            inlineStyles.borderTopRightRadius = baseParams.borderTopRightRadius || '';
            inlineStyles.borderBottomRightRadius = baseParams.borderBottomRightRadius || '';
            inlineStyles.borderBottomLeftRadius = baseParams.borderBottomLeftRadius || '';
          } else {
            // Use shorthand approach
            inlineStyles.borderRadius = baseParams.borderRadius || '';
            inlineStyles.borderTopLeftRadius = undefined;
            inlineStyles.borderTopRightRadius = undefined;
            inlineStyles.borderBottomRightRadius = undefined;
            inlineStyles.borderBottomLeftRadius = undefined;
          }

          onIframeUpdate(node.id, {
            interactionStates: {
              [interactionState]: {
                inlineStyles,
                transitions: updatedTransitions
              }
            }
          });
          return;
        }

        if (ctx.breakpoint) {
          onIframeUpdate(node.id, { responsiveOverrides: { [ctx.breakpoint]: { params: baseParams } } });
          return;
        }

        if (ctx.locale) {
          onIframeUpdate(node.id, { localeOverrides: { [ctx.locale]: { params: baseParams } } });
        }
      },
      removeOverride: (ctx: { breakpoint?: string; locale?: string; interaction?: string }) => {
        if (!onIframeUpdate) return;
        
        if (ctx.interaction && interactionsInlineStyle) {
          const interactionState = ctx.interaction;
          const borderProps = ['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'];
          const unsetPaths = borderProps.map(prop => `interactionStates.${interactionState}.inlineStyles.${prop}`);
          onIframeUpdate(node.id, { 
            __unset: unsetPaths.map(path => ({ scope: 'interaction', key: interactionState, path }))
          });
          return;
        }
        
        // For breakpoint and locale overrides
        const borderPaths = [
          'params.border', 'params.borderTop', 'params.borderRight', 'params.borderBottom', 'params.borderLeft',
          'params.borderRadius', 'params.borderTopLeftRadius', 'params.borderTopRightRadius', 
          'params.borderBottomRightRadius', 'params.borderBottomLeftRadius'
        ];
        
        borderPaths.forEach(path => {
          sendRemoveOverrideForPath(node, path, ctx, onIframeUpdate);
        });
      }
    };
  }
};

function buildBorderOverrides(node: any) {
  const borderPaths = [
    'params.border', 'params.borderTop', 'params.borderRight', 'params.borderBottom', 'params.borderLeft',
    'params.borderRadius', 'params.borderTopLeftRadius', 'params.borderTopRightRadius', 
    'params.borderBottomRightRadius', 'params.borderBottomLeftRadius'
  ];
  
  const allOverrides: any = {};
  
  borderPaths.forEach(path => {
    const overridesObj = getOverridesForPath(node, path);
    if (overridesObj?.responsive) {
      Object.keys(overridesObj.responsive).forEach((bp) => {
        if (!allOverrides.responsive) allOverrides.responsive = {};
        if (!allOverrides.responsive[bp]) allOverrides.responsive[bp] = {};
        const propName = path.replace('params.', '');
        allOverrides.responsive[bp][propName] = overridesObj.responsive[bp];
      });
    }
    if (overridesObj?.locale) {
      Object.keys(overridesObj.locale).forEach((loc) => {
        if (!allOverrides.locale) allOverrides.locale = {};
        if (!allOverrides.locale[loc]) allOverrides.locale[loc] = {};
        const propName = path.replace('params.', '');
        allOverrides.locale[loc][propName] = overridesObj.locale[loc];
      });
    }
  });

  // Handle interaction states
  if (node.interactionStates) {
    Object.keys(node.interactionStates).forEach((interactionState) => {
      const interactionData = (node.interactionStates as any)[interactionState];
      const inlineStyles = interactionData?.inlineStyles || {};
      const borderProps = ['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'];
      
      const hasAnyBorderProp = borderProps.some(prop => inlineStyles[prop] !== undefined);
      if (hasAnyBorderProp) {
        if (!allOverrides.interaction) allOverrides.interaction = {};
        if (!allOverrides.interaction[interactionState]) allOverrides.interaction[interactionState] = {};
        borderProps.forEach(prop => {
          if (inlineStyles[prop] !== undefined) {
            allOverrides.interaction[interactionState][prop] = inlineStyles[prop];
          }
        });
      }
    });
  }

  const overrides: Array<{ scope: 'responsive' | 'locale' | 'interaction'; key: string; value: any }> = [];

  if (allOverrides.responsive) {
    Object.keys(allOverrides.responsive).forEach((bp) => {
      overrides.push({ scope: 'responsive', key: bp, value: allOverrides.responsive[bp] });
    });
  }
  if (allOverrides.locale) {
    Object.keys(allOverrides.locale).forEach((loc) => {
      overrides.push({ scope: 'locale', key: loc, value: allOverrides.locale[loc] });
    });
  }
  if (allOverrides.interaction) {
    Object.keys(allOverrides.interaction).forEach((interactionState) => {
      overrides.push({ scope: 'interaction', key: interactionState, value: allOverrides.interaction[interactionState] });
    });
  }

  return overrides;
}
