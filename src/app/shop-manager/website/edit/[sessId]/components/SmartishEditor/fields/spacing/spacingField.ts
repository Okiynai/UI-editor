import { Field } from "../../types";
import { 
  createSpacingReader, 
  createSpacingMutators, 
  SpacingRenderer 
} from "./index";

export const spacingField: Field = {
  id: "spacing",
  rendererKey: "spacing",
  showOverrides: true,
  rendererConfig: {
    label: "Spacing",
    properties: ["padding", "margin"]
  },
  reader: (node, siteSettings) => {
    // Read both padding and margin
    const paddingReader = createSpacingReader("padding", "params.padding");
    const marginReader = createSpacingReader("margin", "params.margin");
    
    const paddingData = paddingReader(node, siteSettings);
    const marginData = marginReader(node, siteSettings);
    
    return {
      padding: paddingData,
      margin: marginData
    };
  },
  createMutators: (node, onIframeUpdate, interactionsInlineStyle) => {
    const paddingMutators = createSpacingMutators("padding", "params.padding", node, onIframeUpdate, interactionsInlineStyle);
    const marginMutators = createSpacingMutators("margin", "params.margin", node, onIframeUpdate, interactionsInlineStyle);
    
    return {
      // Padding mutators
      setPadding: paddingMutators.setValue,
      setPaddingTop: paddingMutators.setTop,
      setPaddingRight: paddingMutators.setRight,
      setPaddingBottom: paddingMutators.setBottom,
      setPaddingLeft: paddingMutators.setLeft,
      resetPadding: paddingMutators.reset,
      
      // Margin mutators
      setMargin: marginMutators.setValue,
      setMarginTop: marginMutators.setTop,
      setMarginRight: marginMutators.setRight,
      setMarginBottom: marginMutators.setBottom,
      setMarginLeft: marginMutators.setLeft,
      resetMargin: marginMutators.reset,
      
      // Combined mutators
      resetAll: () => {
        paddingMutators.reset();
        marginMutators.reset();
      }
    };
  }
};
