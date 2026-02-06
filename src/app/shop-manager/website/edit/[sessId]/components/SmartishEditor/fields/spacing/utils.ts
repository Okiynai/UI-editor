import { SpacingValue, SpacingProperty } from './types';

/**
 * Parse CSS spacing value (e.g., "10px 20px 10px 20px" or "10px 20px")
 * Returns normalized spacing values for top, right, bottom, left
 */
export function parseSpacingValue(value: string | number | undefined): SpacingValue {
  if (!value) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  // If it's already a number, apply to all sides
  if (typeof value === 'number') {
    return { top: value, right: value, bottom: value, left: value };
  }

  // Parse string value
  const stringValue = String(value).trim();
  
  // Handle "auto" values
  if (stringValue === 'auto') {
    return { top: 'auto', right: 'auto', bottom: 'auto', left: 'auto' };
  }
  
  // Remove units and split by spaces
  const values = stringValue
    .replace(/px|em|rem|%|vh|vw|vmin|vmax/g, '')
    .split(/\s+/)
    .map(v => {
      if (v === 'auto') return 'auto';
      return parseFloat(v) || 0;
    });

  // Apply CSS shorthand rules
  if (values.length === 1) {
    // All sides same value
    return { top: values[0], right: values[0], bottom: values[0], left: values[0] };
  } else if (values.length === 2) {
    // top/bottom, left/right
    return { top: values[0], right: values[1], bottom: values[0], left: values[1] };
  } else if (values.length === 3) {
    // top, left/right, bottom
    return { top: values[0], right: values[1], bottom: values[2], left: values[1] };
  } else if (values.length >= 4) {
    // top, right, bottom, left
    return { top: values[0], right: values[1], bottom: values[2], left: values[3] };
  }

  return { top: 0, right: 0, bottom: 0, left: 0 };
}

/**
 * Convert spacing values back to CSS string
 */
export function formatSpacingValue(spacing: SpacingValue): string {
  const { top, right, bottom, left } = spacing;
  
  // Helper function to format individual values
  const formatValue = (val: number | "auto") => {
    return val === 'auto' ? 'auto' : `${val}px`;
  };
  
  // If all values are the same, use single value
  if (top === right && right === bottom && bottom === left) {
    return formatValue(top);
  }
  
  // If top/bottom are same and left/right are same, use 2-value shorthand
  if (top === bottom && left === right) {
    return `${formatValue(top)} ${formatValue(left)}`;
  }
  
  // If left/right are same, use 3-value shorthand
  if (left === right) {
    return `${formatValue(top)} ${formatValue(left)} ${formatValue(bottom)}`;
  }
  
  // Use full 4-value format
  return `${formatValue(top)} ${formatValue(right)} ${formatValue(bottom)} ${formatValue(left)}`;
}

/**
 * Get the CSS property name for a spacing property
 */
export function getSpacingPropertyName(property: SpacingProperty): string {
  return property === 'padding' ? 'padding' : 'margin';
}

/**
 * Get individual CSS property names for each direction
 */
export function getSpacingDirectionProperties(property: SpacingProperty) {
  const base = getSpacingPropertyName(property);
  return {
    top: `${base}-top`,
    right: `${base}-right`,
    bottom: `${base}-bottom`,
    left: `${base}-left`
  };
}

/**
 * Check if spacing values are all equal (for shorthand optimization)
 */
export function isSpacingUniform(spacing: SpacingValue): boolean {
  const { top, right, bottom, left } = spacing;
  return top === right && right === bottom && bottom === left;
}

/**
 * Check if spacing values are symmetric (top/bottom and left/right are equal)
 */
export function isSpacingSymmetric(spacing: SpacingValue): boolean {
  const { top, right, bottom, left } = spacing;
  return top === bottom && left === right;
}
