import { BuildDefaultField } from "../../utils";

// Stroke Width Field
export const strokeWidthField = BuildDefaultField({
  id: "strokeWidth",
  type: "number",
  label: "Stroke Width",
  dataPath: "params.strokeWidth",
  interactionsInlineStyle: "strokeWidth",
  rendererConfig: {
    dir: "row",
    className: "flex-1 min-w-0",
    min: 0,
    max: 10,
    step: 0.1,
    showSlider: true,
    unit: "px"
  }
});

// Fill Color Field
export const fillColorField = BuildDefaultField({
  id: "fillColor",
  type: "color",
  label: "Fill Color",
  dataPath: "params.fill",
  interactionsInlineStyle: "fill",
  rendererConfig: {
    dir: "row",
    className: "!ml-auto"
  }
});

// Icon Color Field
export const strokeColorField = BuildDefaultField({
  id: "strokeColor",
  type: "color",
  label: "Icon Color",
  dataPath: "params.color",
  interactionsInlineStyle: "stroke",
  rendererConfig: {
    dir: "row",
    className: "!ml-auto"
  }
});

// Size Field
export const sizeField = BuildDefaultField({
  id: "size",
  type: "number",
  label: "Size",
  dataPath: "params.size",
  interactionsInlineStyle: "fontSize",
  rendererConfig: {
    dir: "row",
    className: "flex-1 min-w-0",
    min: 8,
    max: 128,
    step: 1,
    showSlider: true,
    unit: "px"
  }
});
