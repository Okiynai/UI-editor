export const convertUnitToPixels = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'string') return 0;
  
  const trimmed = value.trim();
  
  // If it's already a pixel value, extract the number
  if (trimmed.endsWith('px')) {
    return parseFloat(trimmed) || 0;
  }
  
  // If it's a percentage, convert to pixels based on viewport
  // TODO: Make this more sophisticated later, or get rid of it,
  // it's shit and does not make sense.
  if (trimmed.endsWith('%')) {
    const percent = parseFloat(trimmed) || 0;
    // For now, assume 100% = 1000px (can be made more sophisticated later)
    return (percent / 100) * 1000;
  }
  
  // If it's rem, convert to pixels (1rem = 16px typically)
  if (trimmed.endsWith('rem')) {
    const rem = parseFloat(trimmed) || 0;
    return rem * 16; // 16px = 1rem
  }
  
  // If it's em, convert to pixels (1em = 16px typically)
  if (trimmed.endsWith('em')) {
    const em = parseFloat(trimmed) || 0;
    return em * 16; // 16px = 1em
  }
  
  // If it's viewport width (vw), convert to pixels
  if (trimmed.endsWith('vw')) {
    const vw = parseFloat(trimmed) || 0;
    return (vw / 100) * window.innerWidth;
  }
  
  // If it's viewport height (vh), convert to pixels
  if (trimmed.endsWith('vh')) {
    const vh = parseFloat(trimmed) || 0;
    return (vh / 100) * window.innerHeight;
  }
  
  // If it's a number without units, return as-is
  const number = parseFloat(trimmed);
  if (!isNaN(number)) return number;
  
  // If we can't parse it, return 0
  console.warn(`Could not convert unit to pixels: "${value}"`);
  return 0;
};

/**
 * Determines if a field should return a number value
 * Used to decide whether to convert units to pixels
 * 
 * 
 * NOTE: not the best in the world, made by auto, not tested well,
 * so keep an eye on this one.
 */
export const shouldReturnNumber = (field: any): boolean => {
  return [
    'number',
    'dimensions', 
    'position',
    'spacing',
    'slider',
    'range',
    'stepper'
  ].includes(field.type);
};