export * from "./types";
export * from "./reader";
export * from "./writer";
export * from "./utils";
export * from "./TransformRenderer";
export * from "./transformField";
// Reader factory
export const createTransformReader = (dataPath: string) => {
  // TODO: Implement when reader is ready
  return (node: any, siteSettings?: any) => {
    return {
      activeTransform: "translate",
      values: { x: 0, y: 0, z: 0 },
      transformOrigin: { x: "50%", y: "50%" }
    };
  };
};

// Writer factory
export const createTransformWriter = (dataPath: string) => {
  // TODO: Implement when writer is ready
  return (node: any, value: any) => {
    console.log('Writing transform value:', value);
  };
};

// Mutators factory
export const createTransformMutators = (dataPath: string, node: any, onIframeUpdate: any) => {
  // TODO: Implement when mutators are ready
  return {
    setTransformType: (type: string) => {
      console.log('Setting transform type to:', type);
    },
    setTransformValue: (property: string, value: number) => {
      console.log(`Setting ${property} to:`, value);
    },
    setTransformOrigin: (axis: string, value: string) => {
      console.log(`Setting transform origin ${axis} to:`, value);
    }
  };
};

