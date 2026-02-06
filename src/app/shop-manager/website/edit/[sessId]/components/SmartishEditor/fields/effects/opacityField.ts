import { BuildDefaultField } from "../../utils";
import { getOverridesForPath, getComputedStyleValue } from "../../utils";

// Simple opacity field using the default renderer and default reader/mutators
const baseOpacityField = BuildDefaultField({
  id: "opacity",
  type: "number",
  label: "Opacity",
  dataPath: "params.opacity",
  rendererConfig: {
    min: 0,
    max: 1,
    step: 0.01,
    showSlider: true,
    // Render as a compact row: label + input inline
    dir: 'row',
    labelTextClass: 'text-sm',
    className: 'w-full',
    unit: '',
  },
  interactionsInlineStyle: "opacity",
});

// Override reader to default to 1 if missing/empty, but keep overrides/computed
export const opacityField = {
  ...baseOpacityField,
  reader: (node: any) => {
    // 1) Explicit param takes precedence (allow legit 0)
    const paramVal = (node.params as any)?.opacity;
    if (paramVal !== undefined && paramVal !== '') {
      const numeric = typeof paramVal === 'string' ? parseFloat(paramVal) : paramVal;
      return { value: isNaN(numeric) ? 1 : numeric, overrides: buildOpacityOverrides(node) };
    }

    // 2) Try DOM computed style (default CSS is 1)
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
        const v = getComputedStyleValue(target, 'opacity');
        computed = typeof v === 'string' ? parseFloat(v) : v;
      }
    } catch {}

    const finalValue = (typeof computed === 'number' && !isNaN(computed)) ? computed : 1;
    return { value: finalValue, overrides: buildOpacityOverrides(node) };
  }
} as const;

function buildOpacityOverrides(node: any) {
  const dataPath = 'params.opacity';
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
      const interactionValue = interactionData?.inlineStyles?.opacity;
      if (interactionValue !== undefined) {
        overrides.push({ scope: 'interaction', key: interactionState, value: interactionValue });
      }
    });
  }
  return overrides;
}


