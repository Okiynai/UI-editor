import { Field } from "../../types";
import { sendRemoveOverrideForPath, getOverridesForPath, getComputedStyleValue, camelToKebab } from "../../utils";

// Minimal field definition for clip-path; custom renderer handles UI.
export const clipPathField: Field = {
  id: "clipPath",
  rendererKey: "clipPath",
  showOverrides: true,
  interactionsInlineStyle: "clipPath",
  rendererConfig: {
    label: "Clip Path",
  },
  reader: (node) => {
    // 1) Prefer explicit param value
    const paramVal = (node.positioning as any)?.clipPath;
    if (paramVal !== undefined && paramVal !== '') {
      return { value: paramVal, overrides: buildClipPathOverrides(node) };
    }

    // 2) Fallback to computed style (supports CSS or inherited)
    let computed: any = undefined;
    try {
      const el = document.getElementById(node.id) || document.getElementById(`${node.id}-wrapper`);
      let target: Element | null = null;
      if (el) {
        if (el.id === `${node.id}-wrapper`) {
          const q = el.querySelector(`[data-oskiynai-scope="${node.id}"]`);
          target = (q as Element) || el.firstElementChild;
        } else {
          target = el as Element;
        }
      }
      if (target) {
        const v = getComputedStyleValue(target, 'clip-path');
        computed = typeof v === 'string' ? v : '';
      }
    } catch {}

    const finalValue = (typeof computed === 'string' && computed !== 'none') ? computed : '';
    return { value: finalValue, overrides: buildClipPathOverrides(node) };
  },
  createMutators: (node, onIframeUpdate, interactionsInlineStyle) => {
    return {
      update: (value: any, ctx?: { breakpoint?: string; locale?: string; interaction?: string; transition?: any }) => {
        if (!onIframeUpdate) return;

        if (ctx?.interaction && interactionsInlineStyle) {
          const interactionState = ctx.interaction;
          const existingState = (node.interactionStates as any)?.[interactionState] || {};
          const existingInlineStyles = existingState.inlineStyles || {};
          const existingTransitions = existingState.transitions || [];

          // If transition edit only (value === null), update transitions without touching inlineStyles
          if (value === null && ctx.transition) {
            const transition = {
              prop: camelToKebab(String(interactionsInlineStyle || '')),
              durationMs: ctx.transition.durationMs,
              easing: ctx.transition.easing,
              waitDurationMs: ctx.transition.waitDurationMs || 0
            };
            const updatedTransitions = existingTransitions.map((t: any) =>
              t.prop === interactionsInlineStyle ? { ...t, ...transition } : t
            );
            if (!existingTransitions.some((t: any) => t.prop === interactionsInlineStyle)) {
              updatedTransitions.push(transition);
            }
            onIframeUpdate(node.id, {
              interactionStates: {
                [interactionState]: {
                  inlineStyles: {
                    ...existingInlineStyles,
                  },
                  transitions: updatedTransitions,
                }
              }
            });
            return;
          }

          // Regular interaction inline style update
          onIframeUpdate(node.id, {
            interactionStates: {
              [interactionState]: {
                inlineStyles: {
                  ...existingInlineStyles,
                  [interactionsInlineStyle]: value,
                },
                transitions: existingTransitions,
              }
            }
          });
          return;
        }

        // For base positioning update
        onIframeUpdate(node.id, { positioning: { clipPath: value } });
      },
      createOverride: (ctx: { breakpoint?: string; locale?: string; interaction?: string; transition?: any }) => {
        if (!onIframeUpdate) return;
        const baseValue = (node.positioning as any)?.clipPath || '';

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
            ? existingTransitions.map((t: any) => t.prop === interactionsInlineStyle ? { ...t, ...transition } : t)
            : [...existingTransitions, transition];
          onIframeUpdate(node.id, {
            interactionStates: {
              [interactionState]: {
                inlineStyles: {
                  ...existingInlineStyles,
                  [interactionsInlineStyle]: baseValue,
                },
                transitions: updatedTransitions,
              }
            }
          });
          return;
        }

        if (ctx.breakpoint) {
          onIframeUpdate(node.id, {
            responsiveOverrides: {
              [ctx.breakpoint]: { positioning: { clipPath: baseValue } }
            }
          });
          return;
        }

        if (ctx.locale) {
          onIframeUpdate(node.id, {
            localeOverrides: {
              [ctx.locale]: { positioning: { clipPath: baseValue } }
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
        sendRemoveOverrideForPath(node, 'positioning.clipPath', ctx, onIframeUpdate);
      }
    };
  }
};


function buildClipPathOverrides(node: any) {
  const dataPath = 'positioning.clipPath';
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
      const interactionValue = interactionData?.inlineStyles?.clipPath;
      if (interactionValue !== undefined) {
        overrides.push({ scope: 'interaction', key: interactionState, value: interactionValue });
      }
    });
  }
  return overrides;
}


