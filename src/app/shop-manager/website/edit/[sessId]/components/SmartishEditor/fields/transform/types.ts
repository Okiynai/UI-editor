// Transform field types and interfaces
// This will define the structure for handling CSS transform properties

export type TransformType = 'translate' | 'rotate' | 'scale' | 'skew' | 'perspective' | 'matrix';

export interface TransformValue {
  // Translate values
  translateX?: number;
  translateY?: number;
  translateZ?: number;
  
  // Rotate values
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  angle?: number;
  
  // Scale values
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  
  // Skew values
  skewX?: number;
  skewY?: number;
  
  // Perspective
  perspective?: number;
  
  // Advanced 3D properties
  transformStyle?: 'flat' | 'preserve-3d';
  backfaceVisibility?: 'visible' | 'hidden';
}

export interface TransformFieldData {
  activeTransform: TransformType;
  values: TransformValue;
  transformOrigin?: {
    x: string;
    y: string;
  };
  overrides?: Array<{ scope: 'responsive' | 'locale' | 'interaction'; key: string; value: any }>;
}

export interface TransformFieldConfig {
  label: string;
  availableTransforms: TransformType[];
}
