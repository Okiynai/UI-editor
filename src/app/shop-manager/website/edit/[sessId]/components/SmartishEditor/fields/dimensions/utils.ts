import { DimensionValue, DimensionsValue, AspectRatioLock, DimensionValueType } from './types';

export function formatDimensionValue(value: DimensionValue): string {
  switch (value.type) {
    case 'fixed':
      return `${value.value}px`;
    case 'relative':
      return `${value.value}%`;
    case 'fit-content':
      return 'fit-content';
    case 'auto':
      return 'auto';
    case 'unset':
      return 'unset';
    default:
      return `${value.value}px`;
  }
}

export function parseDimensionValue(cssValue: string): DimensionValue {
  if (cssValue === 'fit-content') {
    return { value: 0, type: 'fit-content' };
  }
  
  if (cssValue === 'auto') {
    return { value: 0, type: 'auto' };
  }
  
  if (cssValue === 'unset') {
    return { value: 0, type: 'unset' };
  }
  
  if (cssValue.endsWith('%')) {
    const numericValue = parseFloat(cssValue.replace('%', ''));
    return { value: isNaN(numericValue) ? 0 : numericValue, type: 'relative' };
  }
  
  if (cssValue.endsWith('px')) {
    const numericValue = parseFloat(cssValue.replace('px', ''));
    return { value: isNaN(numericValue) ? 0 : numericValue, type: 'fixed' };
  }
  
  // Default to fixed pixels
  const numericValue = parseFloat(cssValue);
  return { value: isNaN(numericValue) ? 0 : numericValue, type: 'fixed' };
}

export function calculateAspectRatio(width: number, height: number): number {
  if (height === 0) return 1;
  return width / height;
}

export function calculateLockedDimension(
  changedValue: number,
  changedProperty: 'width' | 'height',
  aspectRatio: number
): number {
  if (changedProperty === 'width') {
    return changedValue / aspectRatio;
  } else {
    return changedValue * aspectRatio;
  }
}

export function createDefaultDimensionsValue(): DimensionsValue {
  return {
    width: { value: 100, type: 'relative' },
    height: { value: 100, type: 'relative' },
    minWidth: { value: 0, type: 'unset' },
    minHeight: { value: 0, type: 'unset' },
    maxWidth: { value: 0, type: 'unset' },
    maxHeight: { value: 0, type: 'unset' }
  };
}

export function createAspectRatioLock(
  width: number,
  height: number,
  isLocked: boolean = false
): AspectRatioLock {
  return {
    isLocked,
    ratio: calculateAspectRatio(width, height)
  };
}

export function validateDimensionValue(value: number, type: DimensionValueType): boolean {
  if (type === 'fit-content' || type === 'auto' || type === 'unset') return true;
  if (type === 'relative') return value >= 0 && value <= 100;
  if (type === 'fixed') return value >= 0 && value <= 1200;
  return false;
}

export function clampDimensionValue(value: number, type: DimensionValueType): number {
  if (type === 'relative') {
    return Math.max(0, Math.min(100, value));
  }
  if (type === 'fixed') {
    return Math.max(0, Math.min(1200, value));
  }
  return value;
}

