import { Field } from "../../types";
import { 
  createDimensionsReader, 
  createDimensionsMutators, 
  DimensionsRenderer,
  readOverflow,
  readOverflowAxis 
} from "./index";

export const dimensionsField: Field = {
  id: "dimensions",
  rendererKey: "dimensions",
  showOverrides: false,
  rendererConfig: {
    label: "Dimensions",
    properties: ["width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight"]
  },
  reader: (node, siteSettings) => {
    // Read all dimension properties
    const widthReader = createDimensionsReader("width", "params.width");
    const heightReader = createDimensionsReader("height", "params.height");
    const minWidthReader = createDimensionsReader("minWidth", "params.minWidth");
    const minHeightReader = createDimensionsReader("minHeight", "params.minHeight");
    const maxWidthReader = createDimensionsReader("maxWidth", "params.maxWidth");
    const maxHeightReader = createDimensionsReader("maxHeight", "params.maxHeight");
    const overflowReader = readOverflow("params");
    const overflowXReader = readOverflowAxis("params", 'X');
    const overflowYReader = readOverflowAxis("params", 'Y');
    
    const widthData = widthReader(node, siteSettings);
    const heightData = heightReader(node, siteSettings);
    const minWidthData = minWidthReader(node, siteSettings);
    const minHeightData = minHeightReader(node, siteSettings);
    const maxWidthData = maxWidthReader(node, siteSettings);
    const maxHeightData = maxHeightReader(node, siteSettings);
    const overflowData = overflowReader(node);
    const overflowXData = overflowXReader(node);
    const overflowYData = overflowYReader(node);
    
    return {
      width: { value: widthData.value },
      height: { value: heightData.value },
      minWidth: { value: minWidthData.value },
      minHeight: { value: minHeightData.value },
      maxWidth: { value: maxWidthData.value },
      maxHeight: { value: maxHeightData.value },
      overflow: overflowData.value,
      overflowX: overflowXData.value,
      overflowY: overflowYData.value
    };
  },
  createMutators: (node: any, onIframeUpdate: (nodeId: string, changes: Record<string, any>) => void, interactionsInlineStyle?: string) => {
    const mutators = createDimensionsMutators("params", node, onIframeUpdate);
    
    return {
      // Individual dimension mutators
      setWidth: mutators.setWidth,
      setHeight: mutators.setHeight,
      setMinWidth: mutators.setMinWidth,
      setMinHeight: mutators.setMinHeight,
      setMaxWidth: mutators.setMaxWidth,
      setMaxHeight: mutators.setMaxHeight,
      // Overflow
      setOverflow: mutators.setOverflow,
      setOverflowX: mutators.setOverflowX,
      setOverflowY: mutators.setOverflowY,
      
      // Combined mutators
      setDimensions: mutators.setDimensions,
      resetAll: mutators.reset
    };
  }
};