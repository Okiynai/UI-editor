export interface SpacingValue {
  top: number | "auto";
  right: number | "auto";
  bottom: number | "auto";
  left: number | "auto";
}

export interface SpacingDirection {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export type SpacingProperty = 'padding' | 'margin';

export interface SpacingFieldConfig {
  property: SpacingProperty;
  label: string;
  dataPath: string;
}
