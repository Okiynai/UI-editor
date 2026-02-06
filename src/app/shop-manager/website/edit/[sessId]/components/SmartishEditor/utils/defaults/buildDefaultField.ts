import { Field, OSDLSiteLibrary } from "../../types";
import { defaultReader, defaultMutatorsCreator } from "../";

/*
* Util function to help us create those default fields.
*/
export const BuildDefaultField = ({ id, type, label, dataPath, library, rendererConfig = {}, interactionsInlineStyle, showOverrides }: { 
  id: string; 
  type: string; 
  label: string; 
  dataPath: string;
  library?: OSDLSiteLibrary;
  rendererConfig?: any;
  interactionsInlineStyle?: string;
  showOverrides?: boolean;
}): Field => {

  return {
    id: id,
    rendererKey: "default",
    library: library,
    interactionsInlineStyle,
    showOverrides,
    rendererConfig: {
      type,
      label,
      ...rendererConfig,
    },
    reader: (node, siteSettings) => {
      return defaultReader({ type, dataPath, interactionsInlineStyle }, node, siteSettings);
    },
    createMutators: (node, onIframeUpdate, interactionsInlineStyle) => {
      return defaultMutatorsCreator({ type, dataPath }, node, onIframeUpdate, interactionsInlineStyle);
    }
  }
}