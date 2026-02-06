import { Field } from "../../types";
import { sendRemoveOverrideForPath, getOverridesForPath, camelToKebab } from "../../utils";

// Minimal field definition for shadow; custom renderer handles UI.
// Reader/mutators: to be added later when finalizing behavior.
export const shadowField: Field = {
  id: "shadow",
  rendererKey: "shadow",
  showOverrides: true,
  interactionsInlineStyle: "boxShadow",
  rendererConfig: {
    label: "Shadow",
  },
  reader: (node) => {
    // Basic read model: value + overrides
    const value = (node.params as any)?.boxShadow || "";
    return { value, overrides: buildShadowOverrides(node) };
  },
  createMutators: (node, onIframeUpdate, interactionsInlineStyle) => {
    return {
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
                inlineStyles: {
                  ...existingInlineStyles,
                  [interactionsInlineStyle]: value,
                }
              }
            }
          };

          // If transition edit only (value === null), update transitions without touching inlineStyles
          if (value === null && ctx.transition) {
            const transition = {
              prop: camelToKebab(String(interactionsInlineStyle || '')),
              durationMs: ctx.transition.durationMs,
              easing: ctx.transition.easing,
              waitDurationMs: ctx.transition.waitDurationMs || 0
            };
            const updatedTransitions = existingTransitions.some((t: any) => t.prop === interactionsInlineStyle)
              ? existingTransitions.map((t: any) => t.prop === interactionsInlineStyle ? transition : t)
              : [...existingTransitions, transition];
            changes.interactionStates[interactionState].transitions = updatedTransitions;
            // Preserve existing inlineStyles
            changes.interactionStates[interactionState].inlineStyles = existingInlineStyles;
          } else if (ctx.transition) {
            // Update both value and transition
            const transition = {
              prop: camelToKebab(String(interactionsInlineStyle || '')),
              durationMs: ctx.transition.durationMs,
              easing: ctx.transition.easing,
              waitDurationMs: ctx.transition.waitDurationMs || 0
            };
            const updatedTransitions = existingTransitions.some((t: any) => t.prop === interactionsInlineStyle)
              ? existingTransitions.map((t: any) => t.prop === interactionsInlineStyle ? transition : t)
              : [...existingTransitions, transition];
            changes.interactionStates[interactionState].transitions = updatedTransitions;
          }

          onIframeUpdate(node.id, changes);
          return;
        }

        // Default params update
        onIframeUpdate(node.id, {
          params: { boxShadow: value }
        });
      },
      createOverride: (ctx: { breakpoint?: string; locale?: string; interaction?: string; transition?: any }) => {
        if (!onIframeUpdate) return;
        const baseValue = (node.params as any)?.boxShadow || '';

        if (ctx.interaction && interactionsInlineStyle) {
          const interactionState = ctx.interaction;
          const existingState = (node.interactionStates as any)?.[interactionState] || {};
          const existingInlineStyles = existingState.inlineStyles || {};
          const existingTransitions = existingState.transitions || [];
          const transition = {
            prop: camelToKebab(String(interactionsInlineStyle || '')),
            durationMs: ctx.transition?.durationMs || 75,
            easing: ctx.transition?.easing || 'ease',
            waitDurationMs: ctx.transition?.waitDurationMs || 0
          };
          const updatedTransitions = existingTransitions.some((t: any) => t.prop === interactionsInlineStyle)
            ? existingTransitions.map((t: any) => t.prop === interactionsInlineStyle ? transition : t)
            : [...existingTransitions, transition];
          onIframeUpdate(node.id, {
            interactionStates: {
              [interactionState]: {
                inlineStyles: {
                  ...existingInlineStyles,
                  [interactionsInlineStyle]: baseValue,
                },
                transitions: updatedTransitions
              }
            }
          });
          return;
        }

        if (ctx.breakpoint) {
          onIframeUpdate(node.id, {
            responsiveOverrides: {
              [ctx.breakpoint]: { params: { boxShadow: baseValue } }
            }
          });
          return;
        }

        if (ctx.locale) {
          onIframeUpdate(node.id, {
            localeOverrides: {
              [ctx.locale]: { params: { boxShadow: baseValue } }
            }
          });
        }
      },
      removeOverride: (ctx: { breakpoint?: string; locale?: string; interaction?: string }) => {
        if (!onIframeUpdate) return;
        if (ctx.interaction && interactionsInlineStyle) {
          const interactionState = ctx.interaction;
          const unsetPath = `interactionStates.${interactionState}.inlineStyles.${interactionsInlineStyle}`;
          onIframeUpdate(node.id, { __unset: [{ scope: 'interaction', key: interactionState, path: unsetPath }] });
          return;
        }
        sendRemoveOverrideForPath(node, 'params.boxShadow', ctx, onIframeUpdate);
      }
    };
  }
};

function buildShadowOverrides(node: any) {
  const dataPath = 'params.boxShadow';
  const overridesObj = getOverridesForPath(node, dataPath);
  const overrides: Array<{ scope: 'responsive' | 'locale' | 'interaction'; key: string; value: any }> = [];

  if (overridesObj?.responsive) {
    Object.keys(overridesObj.responsive).forEach((bp) => {
      overrides.push({ scope: 'responsive', key: bp, value: overridesObj.responsive[bp] });
    });
  }
  if (overridesObj?.locale) {
    Object.keys(overridesObj.locale).forEach((loc) => {
      overrides.push({ scope: 'locale', key: loc, value: overridesObj.locale[loc] });
    });
  }
  if (node.interactionStates) {
    Object.keys(node.interactionStates).forEach((interactionState) => {
      const interactionData = (node.interactionStates as any)[interactionState];
      const interactionValue = interactionData?.inlineStyles?.boxShadow;
      if (interactionValue !== undefined) {
        overrides.push({ scope: 'interaction', key: interactionState, value: interactionValue });
      }
    });
  }

  return overrides;
}


