import { Node } from '@/OSDL/OSDL.types';
import { DimensionsValue, DimensionValue, DimensionProperty } from './types';
import { formatDimensionValue } from './utils';
import { sendSetNodeValue, getNestedValue } from '../../utils/updatingUtils';

export function createDimensionsMutators(
  dataPath: string,
  node: Node,
  onIframeUpdate: (nodeId: string, changes: Record<string, any>) => void
) {
  return {
    setWidth: (value: DimensionValue) => {
      const cssValue = formatDimensionValue(value);
      const field = { type: 'dimension', dataPath: `${dataPath}.width` };
      sendSetNodeValue(field, cssValue, node, undefined, onIframeUpdate);
    },
    
    setHeight: (value: DimensionValue) => {
      const cssValue = formatDimensionValue(value);
      const field = { type: 'dimension', dataPath: `${dataPath}.height` };
      sendSetNodeValue(field, cssValue, node, undefined, onIframeUpdate);
    },
    
    setMinWidth: (value: DimensionValue) => {
      const cssValue = formatDimensionValue(value);
      const field = { type: 'dimension', dataPath: `${dataPath}.minWidth` };
      sendSetNodeValue(field, cssValue, node, undefined, onIframeUpdate);
    },
    
    setMinHeight: (value: DimensionValue) => {
      const cssValue = formatDimensionValue(value);
      const field = { type: 'dimension', dataPath: `${dataPath}.minHeight` };
      sendSetNodeValue(field, cssValue, node, undefined, onIframeUpdate);
    },
    
    setMaxWidth: (value: DimensionValue) => {
      const cssValue = formatDimensionValue(value);
      const field = { type: 'dimension', dataPath: `${dataPath}.maxWidth` };
      sendSetNodeValue(field, cssValue, node, undefined, onIframeUpdate);
    },
    
    setMaxHeight: (value: DimensionValue) => {
      const cssValue = formatDimensionValue(value);
      const field = { type: 'dimension', dataPath: `${dataPath}.maxHeight` };
      sendSetNodeValue(field, cssValue, node, undefined, onIframeUpdate);
    },
    
    setDimensions: (value: DimensionsValue) => {
      // Update all dimensions at once
      const changes: Record<string, any> = {};
      
      // Set each dimension in the data path
      const pathParts = dataPath.split('.');
      let current = changes;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }
      
      // Set all dimension values as CSS strings
      current[pathParts[pathParts.length - 1]] = {
        width: formatDimensionValue(value.width),
        height: formatDimensionValue(value.height),
        minWidth: formatDimensionValue(value.minWidth),
        minHeight: formatDimensionValue(value.minHeight),
        maxWidth: formatDimensionValue(value.maxWidth),
        maxHeight: formatDimensionValue(value.maxHeight)
      };
      
      onIframeUpdate(node.id, changes);
    },
    
    // Overflow simple and advanced
    setOverflow: (mode: 'visible' | 'hidden' | 'scroll') => {
      const field = { type: 'string', dataPath: `${dataPath}.overflow` } as any;
      sendSetNodeValue(field, mode, node, undefined, onIframeUpdate);
      // Clear axis-specific values to avoid mixing shorthand/longhand
      sendSetNodeValue({ type: 'string', dataPath: `${dataPath}.overflowX` } as any, null, node, undefined, onIframeUpdate);
      sendSetNodeValue({ type: 'string', dataPath: `${dataPath}.overflowY` } as any, null, node, undefined, onIframeUpdate);
    },
    setOverflowX: (mode: 'visible' | 'hidden' | 'scroll') => {
      const field = { type: 'string', dataPath: `${dataPath}.overflowX` } as any;
      sendSetNodeValue(field, mode, node, undefined, onIframeUpdate);
      // Clear shorthand to avoid mixing
      sendSetNodeValue({ type: 'string', dataPath: `${dataPath}.overflow` } as any, null, node, undefined, onIframeUpdate);
    },
    setOverflowY: (mode: 'visible' | 'hidden' | 'scroll') => {
      const field = { type: 'string', dataPath: `${dataPath}.overflowY` } as any;
      sendSetNodeValue(field, mode, node, undefined, onIframeUpdate);
      // Clear shorthand to avoid mixing
      sendSetNodeValue({ type: 'string', dataPath: `${dataPath}.overflow` } as any, null, node, undefined, onIframeUpdate);
    },
    
    reset: () => {
      const defaultDimensions: DimensionsValue = {
        width: { value: 100, type: 'relative' },
        height: { value: 100, type: 'relative' },
        minWidth: { value: 0, type: 'unset' },
        minHeight: { value: 0, type: 'unset' },
        maxWidth: { value: 100, type: 'relative' },
        maxHeight: { value: 100, type: 'relative' }
      };
      
      // Use setDimensions to reset all at once
      const changes: Record<string, any> = {};
      const pathParts = dataPath.split('.');
      let current = changes;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }
      
      // Format as CSS strings
      current[pathParts[pathParts.length - 1]] = {
        width: formatDimensionValue(defaultDimensions.width),
        height: formatDimensionValue(defaultDimensions.height),
        minWidth: formatDimensionValue(defaultDimensions.minWidth),
        minHeight: formatDimensionValue(defaultDimensions.minHeight),
        maxWidth: formatDimensionValue(defaultDimensions.maxWidth),
        maxHeight: formatDimensionValue(defaultDimensions.maxHeight)
      };
      onIframeUpdate(node.id, changes);
    }
  };
}