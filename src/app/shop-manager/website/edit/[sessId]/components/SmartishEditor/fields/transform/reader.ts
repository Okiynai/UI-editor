// Transform field reader utilities
// This will handle reading transform values from nodes

import { Node, SiteSettings } from '@/OSDL/OSDL.types';
import type { TransformFieldData, TransformType, TransformValue } from './types';
import { getOverridesForPath, resolveCSSVariable } from '../../utils';

/**
 * Parse CSS transform string to extract individual transform values
 */
const parseTransformString = (transformString: string): Partial<TransformValue> => {
  if (!transformString || typeof transformString !== 'string') {
    return {};
  }

  const values: Partial<TransformValue> = {};
  
  // Parse translate3d(x, y, z) or translate(x, y) or translateX/Y/Z
  const translate3dMatch = transformString.match(/translate3d\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (translate3dMatch) {
    values.translateX = parseFloat(translate3dMatch[1]) || 0;
    values.translateY = parseFloat(translate3dMatch[2]) || 0;
    values.translateZ = parseFloat(translate3dMatch[3]) || 0;
  } else {
    const translateMatch = transformString.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (translateMatch) {
      values.translateX = parseFloat(translateMatch[1]) || 0;
      values.translateY = parseFloat(translateMatch[2]) || 0;
      values.translateZ = 0;
    } else {
      // Check for individual translateX, translateY, translateZ
      const translateXMatch = transformString.match(/translateX\(([^)]+)\)/);
      if (translateXMatch) values.translateX = parseFloat(translateXMatch[1]) || 0;
      
      const translateYMatch = transformString.match(/translateY\(([^)]+)\)/);
      if (translateYMatch) values.translateY = parseFloat(translateYMatch[1]) || 0;
      
      const translateZMatch = transformString.match(/translateZ\(([^)]+)\)/);
      if (translateZMatch) values.translateZ = parseFloat(translateZMatch[1]) || 0;
    }
  }

  // Parse rotate3d(x, y, z, angle) or rotate(angle)
  const rotate3dMatch = transformString.match(/rotate3d\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (rotate3dMatch) {
    values.rotateX = parseFloat(rotate3dMatch[1]) || 0;
    values.rotateY = parseFloat(rotate3dMatch[2]) || 0;
    values.rotateZ = parseFloat(rotate3dMatch[3]) || 0;
    values.angle = parseFloat(rotate3dMatch[4]) || 0;
  } else {
    const rotateMatch = transformString.match(/rotate\(([^)]+)\)/);
    if (rotateMatch) {
      values.angle = parseFloat(rotateMatch[1]) || 0;
      // For simple rotate(), set default Z-axis rotation
      values.rotateX = 0;
      values.rotateY = 0;
      values.rotateZ = 1;
    }
  }

  // Parse scale3d(x, y, z) or scale(x, y) or scaleX/Y/Z
  const scale3dMatch = transformString.match(/scale3d\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (scale3dMatch) {
    values.scaleX = parseFloat(scale3dMatch[1]) || 1;
    values.scaleY = parseFloat(scale3dMatch[2]) || 1;
    values.scaleZ = parseFloat(scale3dMatch[3]) || 1;
  } else {
    const scaleMatch = transformString.match(/scale\(([^,]+)(?:,\s*([^)]+))?\)/);
    if (scaleMatch) {
      values.scaleX = parseFloat(scaleMatch[1]) || 1;
      values.scaleY = parseFloat(scaleMatch[2]) || parseFloat(scaleMatch[1]) || 1;
      values.scaleZ = 1;
    } else {
      // Check for individual scaleX, scaleY, scaleZ
      const scaleXMatch = transformString.match(/scaleX\(([^)]+)\)/);
      if (scaleXMatch) values.scaleX = parseFloat(scaleXMatch[1]) || 1;
      
      const scaleYMatch = transformString.match(/scaleY\(([^)]+)\)/);
      if (scaleYMatch) values.scaleY = parseFloat(scaleYMatch[1]) || 1;
      
      const scaleZMatch = transformString.match(/scaleZ\(([^)]+)\)/);
      if (scaleZMatch) values.scaleZ = parseFloat(scaleZMatch[1]) || 1;
    }
  }

  // Parse skew(x, y) or skewX/Y
  const skewMatch = transformString.match(/skew\(([^,]+),\s*([^)]+)\)/);
  if (skewMatch) {
    values.skewX = parseFloat(skewMatch[1]) || 0;
    values.skewY = parseFloat(skewMatch[2]) || 0;
  } else {
    const skewXMatch = transformString.match(/skewX\(([^)]+)\)/);
    if (skewXMatch) values.skewX = parseFloat(skewXMatch[1]) || 0;
    
    const skewYMatch = transformString.match(/skewY\(([^)]+)\)/);
    if (skewYMatch) values.skewY = parseFloat(skewYMatch[1]) || 0;
  }

  // Parse perspective
  const perspectiveMatch = transformString.match(/perspective\(([^)]+)\)/);
  if (perspectiveMatch) {
    values.perspective = parseFloat(perspectiveMatch[1]) || 0;
  }

  return values;
};

/**
 * Parse transform-origin CSS property
 */
const parseTransformOrigin = (originString: string): { x: string; y: string } => {
  if (!originString || typeof originString !== 'string') {
    return { x: '50%', y: '50%' };
  }

  const parts = originString.trim().split(/\s+/);
  return {
    x: parts[0] || '50%',
    y: parts[1] || '50%'
  };
};

/**
 * Determine the active transform type based on the transform string
 */
const determineActiveTransform = (transformString: string): TransformType => {
  if (!transformString || typeof transformString !== 'string') {
    return 'translate';
  }

  if (transformString.includes('translate')) return 'translate';
  if (transformString.includes('rotate')) return 'rotate';
  if (transformString.includes('scale')) return 'scale';
  if (transformString.includes('skew')) return 'skew';
  if (transformString.includes('perspective')) return 'perspective';
  
  return 'translate';
};

export const createTransformReader = (dataPath: string) => {
  return (node: Node, siteSettings?: SiteSettings): TransformFieldData & { node: Node } => {
    // Get the base transform value using standard path resolution
    let transformString = '';
    let transformOriginString = '';
    let transformStyle = 'flat';
    let backfaceVisibility = 'visible';

    // Check params for transform values (primary source)
    if (node.params && typeof node.params === 'object') {
      const params = node.params as Record<string, any>;
      transformString = params.transform || params.transformString || '';
      transformOriginString = params.transformOrigin || '';
      transformStyle = params.transformStyle || 'flat';
      backfaceVisibility = params.backfaceVisibility || 'visible';
    }

    // If not found in params, try to get from DOM computed styles
    if (!transformString || !transformOriginString) {
      try {
        const nodeElement = document.getElementById(node.id);
        if (nodeElement) {
          const computedStyle = getComputedStyle(nodeElement);
          transformString = transformString || computedStyle.transform || '';
          transformOriginString = transformOriginString || computedStyle.transformOrigin || '';
        }
      } catch (error) {
        console.warn('Failed to get transform from DOM:', error);
      }
    }

    // Resolve CSS variables
    if (transformString && typeof transformString === 'string' && transformString.includes('var(--')) {
      transformString = resolveCSSVariable(transformString, siteSettings);
    }
    if (transformOriginString && typeof transformOriginString === 'string' && transformOriginString.includes('var(--')) {
      transformOriginString = resolveCSSVariable(transformOriginString, siteSettings);
    }

    // Parse the transform string
    const values = parseTransformString(transformString);
    const transformOrigin = parseTransformOrigin(transformOriginString);
    const activeTransform = determineActiveTransform(transformString);

    // Get overrides using the standard pattern
    const overridesObj = getOverridesForPath(node as any, dataPath);
    const overrides: Array<{ scope: 'responsive' | 'locale' | 'interaction'; key: string; value: any }> = [];
    
    // Process responsive overrides
    if (overridesObj?.responsive) {
      Object.keys(overridesObj.responsive).forEach((bp) => {
        let overrideValue = overridesObj.responsive[bp];
        // Resolve CSS variables in overrides too
        if (overrideValue && typeof overrideValue === 'string' && overrideValue.includes('var(--')) {
          overrideValue = resolveCSSVariable(overrideValue, siteSettings);
        }
        overrides.push({ scope: 'responsive', key: bp, value: overrideValue });
      });
    }
    
    // Process locale overrides
    if (overridesObj?.locale) {
      Object.keys(overridesObj.locale).forEach((loc) => {
        let overrideValue = overridesObj.locale[loc];
        // Resolve CSS variables in overrides too
        if (overrideValue && typeof overrideValue === 'string' && overrideValue.includes('var(--')) {
          overrideValue = resolveCSSVariable(overrideValue, siteSettings);
        }
        overrides.push({ scope: 'locale', key: loc, value: overrideValue });
      });
    }
    
    // Process interaction state overrides
    if (node.interactionStates) {
      Object.keys(node.interactionStates).forEach((interactionState) => {
        const interactionData = (node.interactionStates as any)[interactionState];
        if (interactionData?.inlineStyles?.transform) {
          let interactionValue = interactionData.inlineStyles.transform;
          // Resolve CSS variables in interaction states
          if (interactionValue && typeof interactionValue === 'string' && interactionValue.includes('var(--')) {
            interactionValue = resolveCSSVariable(interactionValue, siteSettings);
          }
          overrides.push({ 
            scope: 'interaction', 
            key: interactionState, 
            value: interactionValue 
          });
        }
      });
    }

    return {
      node, // Include the node for override access
      activeTransform,
      values: {
        translateX: values.translateX || 0,
        translateY: values.translateY || 0,
        translateZ: values.translateZ || 0,
        rotateX: values.rotateX || 0,
        rotateY: values.rotateY || 0,
        rotateZ: values.rotateZ || 0,
        angle: values.angle || 0,
        scaleX: values.scaleX || 1,
        scaleY: values.scaleY || 1,
        scaleZ: values.scaleZ || 1,
        skewX: values.skewX || 0,
        skewY: values.skewY || 0,
        perspective: values.perspective || 0,
        transformStyle: transformStyle as 'flat' | 'preserve-3d',
        backfaceVisibility: backfaceVisibility as 'visible' | 'hidden'
      },
      transformOrigin,
      overrides // Include the overrides array like other fields
    };
  };
};
