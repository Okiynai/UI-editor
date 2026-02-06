import { BuildDefaultField } from "../../utils";
import { Field } from "../../types";
import { defaultReader, defaultMutatorsCreator } from "../../utils";

// Font Family Field
export const fontFamilyField = BuildDefaultField({
  id: "fontFamily",
  type: "select",
  label: "Font Family",
  dataPath: "params.fontFamily",
  interactionsInlineStyle: "fontFamily",
  rendererConfig: {
    dir: "row",
    className: "!ml-auto min-w-[160px]",
    options: [
      { value: "inherit", title: "Inherit" },
      { value: "Arial, sans-serif", title: "Arial" },
      { value: "Helvetica, sans-serif", title: "Helvetica" },
      { value: "Georgia, serif", title: "Georgia" },
      { value: "Times New Roman, serif", title: "Times New Roman" },
      { value: "Courier New, monospace", title: "Courier New" },
      { value: "Verdana, sans-serif", title: "Verdana" },
      { value: "Trebuchet MS, sans-serif", title: "Trebuchet MS" },
      { value: "Impact, sans-serif", title: "Impact" },
      { value: "Comic Sans MS, cursive", title: "Comic Sans MS" },
      { value: "Palatino, serif", title: "Palatino" },
      { value: "Garamond, serif", title: "Garamond" },
      { value: "Bookman, serif", title: "Bookman" },
      { value: "Avant Garde, sans-serif", title: "Avant Garde" },
      { value: "Futura, sans-serif", title: "Futura" },
      { value: "Optima, sans-serif", title: "Optima" },
      { value: "Lucida Grande, sans-serif", title: "Lucida Grande" },
      { value: "Tahoma, sans-serif", title: "Tahoma" },
      { value: "Geneva, sans-serif", title: "Geneva" },
      { value: "system-ui, sans-serif", title: "System UI" },
    ]
  }
});

// Text Color Field
export const textColorField = BuildDefaultField({
  id: "textColor",
  type: "color",
  label: "Text Color",
  dataPath: "params.color",
  interactionsInlineStyle: "color",
  rendererConfig: {
    dir: "row",
    className: "!ml-auto",
  }
});

// Line Height Field
export const lineHeightField = BuildDefaultField({
  id: "lineHeight",
  type: "lineHeight", // Custom type to avoid pixel conversion
  label: "Line Height",
  dataPath: "params.lineHeight",
  interactionsInlineStyle: "lineHeight",
  rendererConfig: {
    dir: "row",
    className: "flex-1 min-w-0",
    min: 0,
    max: 5,
    step: 0.1,
    showSlider: true,
    unit: ""
  }
});

// Letter Spacing Field
export const letterSpacingField = BuildDefaultField({
  id: "letterSpacing",
  type: "number",
  label: "Letter Spacing",
  dataPath: "params.letterSpacing",
  interactionsInlineStyle: "letterSpacing",
  rendererConfig: {
    dir: "row",
    className: "flex-1 min-w-0",
    min: -2,
    max: 5,
    step: 0.1,
    showSlider: true,
    unit: "px"
  }
});

// Text Align Field (segmented control with icons only)
export const textAlignField: Field = {
  id: "textAlign",
  rendererKey: "default",
  interactionsInlineStyle: "textAlign",
  rendererConfig: {
    type: "segmented",
    label: "Text Align",
    dir: "row",
    className: "!ml-auto",
    display: "icon", // Show only icons, no text
    options: [
      { value: "left", name: "Left", icon: "AlignLeft" },
      { value: "center", name: "Center", icon: "AlignCenter" },
      { value: "right", name: "Right", icon: "AlignRight" },
      { value: "justify", name: "Justify", icon: "AlignJustify" }
    ]
  },
  reader: (node, siteSettings) => {
    return defaultReader({ type: "segmented", dataPath: "params.textAlign", interactionsInlineStyle: "textAlign" }, node, siteSettings);
  },
  createMutators: (node, onIframeUpdate, interactionsInlineStyle) => {
    return defaultMutatorsCreator({ type: "segmented", dataPath: "params.textAlign" }, node, onIframeUpdate, interactionsInlineStyle || 'textAlign');
  }
};

// Text Transform Field
export const textTransformField = BuildDefaultField({
  id: "textTransform",
  type: "select",
  label: "Text Transform",
  dataPath: "params.textTransform",
  interactionsInlineStyle: "textTransform",
  rendererConfig: {
    dir: "row",
    className: "!ml-auto min-w-[140px]",
    options: [
      { value: "none", title: "None" },
      { value: "uppercase", title: "Uppercase" },
      { value: "lowercase", title: "Lowercase" },
      { value: "capitalize", title: "Capitalize" }
    ]
  }
});

// Text Decoration Field (as select, not segmented)
export const textDecorationField = BuildDefaultField({
  id: "textDecoration",
  type: "select",
  label: "Text Decoration",
  dataPath: "params.textDecoration",
  interactionsInlineStyle: "textDecoration",
  rendererConfig: {
    dir: "row",
    className: "!ml-auto min-w-[140px]",
    options: [
      { value: "none", title: "None" },
      { value: "underline", title: "Underline" },
      { value: "overline", title: "Overline" },
      { value: "line-through", title: "Line Through" }
    ]
  }
});

// Text Indent Field
export const textIndentField = BuildDefaultField({
  id: "textIndent",
  type: "number",
  label: "Text Indent",
  dataPath: "params.textIndent",
  interactionsInlineStyle: "textIndent",
  rendererConfig: {
    dir: "row",
    className: "flex-1 min-w-0",
    min: -50,
    max: 100,
    step: 1,
    showSlider: true,
    unit: "px"
  }
});

// Vertical Align Field
export const verticalAlignField = BuildDefaultField({
  id: "verticalAlign",
  type: "select",
  label: "Vertical Align",
  dataPath: "params.verticalAlign",
  interactionsInlineStyle: "verticalAlign",
  rendererConfig: {
    dir: "row",
    className: "!ml-auto min-w-[140px]",
    options: [
      { value: "baseline", title: "Baseline" },
      { value: "sub", title: "Sub" },
      { value: "super", title: "Super" },
      { value: "top", title: "Top" },
      { value: "text-top", title: "Text Top" },
      { value: "middle", title: "Middle" },
      { value: "bottom", title: "Bottom" },
      { value: "text-bottom", title: "Text Bottom" }
    ]
  }
});
