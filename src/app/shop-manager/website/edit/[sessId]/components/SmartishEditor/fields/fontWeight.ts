import { Field } from "../types";
import { defaultReader, defaultMutatorsCreator } from "../utils";

// Helper function to convert text font weights to numbers
const convertFontWeightToNumber = (fontWeight: any): string => {
  if (!fontWeight) return "400"; // Default to normal

  // If it's already a number (string or number), return it as string
  if (typeof fontWeight === 'number' || (typeof fontWeight === 'string' && /^\d+$/.test(fontWeight))) {
    return fontWeight.toString();
  }

  // If it's a text value, convert it to the corresponding number
  if (typeof fontWeight === 'string') {
    const weightMap: Record<string, string> = {
      'thin': '100',
      'extra-light': '200',
      'extra light': '200',
      'light': '300',
      'normal': '400',
      'medium': '500',
      'semi-bold': '600',
      'semibold': '600',
      'semi bold': '600',
      'bold': '700',
      'extra-bold': '800',
      'extra bold': '800',
      'black': '900'
    };

    const normalizedWeight = fontWeight.toLowerCase().trim();
    return weightMap[normalizedWeight] || "400";
  }

  return "400"; // Default fallback
};

export const fontWeightField: Field = {
  id: "fontWeight",
  rendererKey: "default",
  rendererConfig: {
    type: "select",
    label: "Font Weight",
    isCSSBased: true,
    dir: "row",
    className: "!ml-auto w-[140px]",
    options: [
      { value: "100", title: "Thin" },
      { value: "200", title: "Extra Light" },
      { value: "300", title: "Light" },
      { value: "400", title: "Normal" },
      { value: "500", title: "Medium" },
      { value: "600", title: "Semi Bold" },
      { value: "700", title: "Bold" },
      { value: "800", title: "Extra Bold" },
      { value: "900", title: "Black" }
    ]
  },
  reader: (node, siteSettings) => {
     // Get the base value using the default reader
    const baseResult = defaultReader({ type: "select", dataPath: "params.fontWeight" }, node, siteSettings);
    
    // Convert the value if it's text-based
    if (baseResult && typeof baseResult === 'object' && 'value' in baseResult) {
      const convertedValue = convertFontWeightToNumber(baseResult.value);
      return { ...baseResult, value: convertedValue };
    }
    
    // If it's just a simple value, convert it
    if (baseResult && typeof baseResult === 'string') {
      return convertFontWeightToNumber(baseResult);
    }
    
    // If no result, return default
    return "400";
  },
  createMutators: (node, isCSSBased, onIframeUpdate) => {
    return defaultMutatorsCreator({ type: "select", dataPath: "params.fontWeight" }, node, isCSSBased, onIframeUpdate);
  }
};