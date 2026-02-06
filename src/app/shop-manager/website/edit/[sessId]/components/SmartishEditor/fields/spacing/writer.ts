import { Node } from '@/OSDL/OSDL.types';
import { SpacingValue, SpacingProperty } from './types';
import { formatSpacingValue, getSpacingDirectionProperties, parseSpacingValue } from './utils';

/**
 * Shared writer for spacing fields (padding/margin)
 * Handles CSS shorthand optimization and individual property updates
 */
export function createSpacingWriter(property: SpacingProperty, dataPath: string) {
  return (node: Node, value: SpacingValue, onIframeUpdate: (nodeId: string, changes: Record<string, any>) => void) => {
    // Format the spacing value as CSS string
    const cssValue = formatSpacingValue(value);
    
    // Get the CSS property name
    const cssProperty = property === 'padding' ? 'padding' : 'margin';
    
    // Get individual direction properties
    const directionProps = getSpacingDirectionProperties(property);
    
    // Create the changes object
    const changes: Record<string, any> = {};
    
    // Set the main CSS property (shorthand)
    changes[cssProperty] = cssValue;
    
    // Also set individual direction properties for more granular control
    changes[directionProps.top] = value.top === 'auto' ? 'auto' : `${value.top}px`;
    changes[directionProps.right] = value.right === 'auto' ? 'auto' : `${value.right}px`;
    changes[directionProps.bottom] = value.bottom === 'auto' ? 'auto' : `${value.bottom}px`;
    changes[directionProps.left] = value.left === 'auto' ? 'auto' : `${value.left}px`;
    
    // Update the node data path as well
    const pathParts = dataPath.split('.');
    let current = changes;
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]];
    }
    current[pathParts[pathParts.length - 1]] = cssValue;
    
    // Trigger the iframe update
    onIframeUpdate(node.id, changes);
  };
}

/**
 * Create mutators for spacing fields
 */
export function createSpacingMutators(
  property: SpacingProperty,
  dataPath: string,
  node: Node,
  onIframeUpdate: (nodeId: string, changes: Record<string, any>) => void,
  interactionsInlineStyle?: string
) {
  const writer = createSpacingWriter(property, dataPath);
  
  return {
    // Main mutator for the spacing value
    setValue: (value: SpacingValue) => {
      writer(node, value, onIframeUpdate);
    },
    
    // Individual direction mutators
    setTop: (value: number | "auto") => {
      const currentValue = getCurrentSpacingValue(node, dataPath, property);
      const newValue = { ...currentValue, top: value };
      writer(node, newValue, onIframeUpdate);
    },
    
    setRight: (value: number | "auto") => {
      const currentValue = getCurrentSpacingValue(node, dataPath, property);
      const newValue = { ...currentValue, right: value };
      writer(node, newValue, onIframeUpdate);
    },
    
    setBottom: (value: number | "auto") => {
      const currentValue = getCurrentSpacingValue(node, dataPath, property);
      const newValue = { ...currentValue, bottom: value };
      writer(node, newValue, onIframeUpdate);
    },
    
    setLeft: (value: number | "auto") => {
      const currentValue = getCurrentSpacingValue(node, dataPath, property);
      const newValue = { ...currentValue, left: value };
      writer(node, newValue, onIframeUpdate);
    },
    
    // Reset to zero
    reset: () => {
      const zeroValue: SpacingValue = { top: 0, right: 0, bottom: 0, left: 0 };
      writer(node, zeroValue, onIframeUpdate);
    }
  };
}

/**
 * Helper function to get current spacing value from node
 */
function getCurrentSpacingValue(node: Node, dataPath: string, property: SpacingProperty): SpacingValue {
  // Try to get from the data path first
  let value = getNestedValue(node, dataPath);
  
  // If no value, try CSS shorthand
  if (!value && node.params) {
    const cssProperty = property === 'padding' ? 'padding' : 'margin';
    value = node.params[cssProperty];
  }
  
  // Parse and return
  return parseSpacingValue(value);
}

/**
 * Helper function to get nested values from an object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}
