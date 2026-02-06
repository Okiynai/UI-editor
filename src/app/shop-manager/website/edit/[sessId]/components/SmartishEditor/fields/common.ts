import { BuildDefaultField } from "../utils";

export const textAtomContentField = BuildDefaultField({ 
  id: "content", 
  type: "textarea", 
  label: "Content", 
  dataPath: "params.content",
  rendererConfig: {
    placeholder: "Enter your text content here...",
    rows: 4
  }
});

export const fontSizeField = BuildDefaultField({ 
  id: "fontSize", 
  type: "number", 
  label: "Font Size", 
  dataPath: "params.fontSize",
  interactionsInlineStyle: "fontSize",
  rendererConfig: {
    dir: "row",
    unit: "px",
    // Ensure the number field grows and the slider has space
    className: "flex-1 min-w-0"
  }
});
