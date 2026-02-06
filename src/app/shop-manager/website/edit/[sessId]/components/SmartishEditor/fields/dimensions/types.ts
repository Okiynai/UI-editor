export type DimensionValueType = 'fixed' | 'relative' | 'fit-content' | 'auto' | 'unset';

export interface DimensionValue {
  value: number;
  type: DimensionValueType;
}

export interface DimensionsValue {
  width: DimensionValue;
  height: DimensionValue;
  minWidth: DimensionValue;
  minHeight: DimensionValue;
  maxWidth: DimensionValue;
  maxHeight: DimensionValue;
}

export interface DimensionsDirection {
  width: string;
  height: string;
  minWidth: string;
  minHeight: string;
  maxWidth: string;
  maxHeight: string;
}

export type DimensionProperty = 'width' | 'height' | 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight';

export interface DimensionsFieldConfig {
  property: DimensionProperty;
  label: string;
  dataPath: string;
}

export interface AspectRatioLock {
  isLocked: boolean;
  ratio: number;
}

