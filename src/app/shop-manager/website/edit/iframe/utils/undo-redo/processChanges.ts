// Define a type for history entries that tracks paths and values
// NOTE: this is left here since it was the original code
// we'll see soon how we will update this.
interface HistoryEntry {
  path: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}


/**
 * Processes changes by deduplicating, merging, and optimizing them for better undo/redo experience
 * This function handles:
 * 1. Deduplication of changes to the same path
 * 2. Merging of rapid changes to the same property
 * 3. Special handling for different data types (text, colors, numbers)
 * 4. Optimizing the undo stack by removing redundant entries
 * 
 * @param changes - Raw changes detected between states
 * @param undoStack - Current undo stack to check for mergeable entries
 * @param options - Configuration options for change processing
 * @returns Processed changes and indices to remove from undo stack
 */
const processChanges = (
  changes: HistoryEntry[],
  undoStack: HistoryEntry[],
  options: {
    mergeTimeThreshold: number, // ms
    mergeCharacterThreshold: number, // characters
    colorMergeEnabled: boolean,
    numberMergeEnabled: boolean,
    colorDiffThreshold: number // RGB Euclidean distance threshold
  } = {
    mergeTimeThreshold: 300,
    mergeCharacterThreshold: 5,
    colorMergeEnabled: true,
    numberMergeEnabled: true,
    colorDiffThreshold: 30
  }
): {
  processedChanges: HistoryEntry[],
  indicesToRemove: Set<number>
} => {
  // Group changes by path and only keep the latest one for each path
  const latestChanges = new Map<string, HistoryEntry>();
  
  for (const change of changes) {
    latestChanges.set(change.path, change);
  }
  
  // Convert map values back to array
  const uniqueChanges = Array.from(latestChanges.values());
  const now = Date.now();
  const indicesToRemove = new Set<number>();
  
  // Process each change
  uniqueChanges.forEach(change => {
    // Check if this change should be merged with a recent one
    undoStack.forEach((undoEntry, index) => {
      // Only consider entries with the same path
      if (undoEntry.path !== change.path) return;
      
      const timeDiff = now - undoEntry.timestamp;
      
      // Time-based merging (for all types)
      if (timeDiff <= options.mergeTimeThreshold) {
        // Default behavior: use the oldest value and timestamp
        change.oldValue = undoEntry.oldValue;
        change.timestamp = undoEntry.timestamp;
        indicesToRemove.add(index);
        return;
      }

      const oldValue = undoEntry.oldValue;
      const newValue = change.newValue;

      // Handle different data types
      if (handleText(oldValue, newValue, timeDiff, options, change, undoEntry, indicesToRemove, index)) return;
      if (handleColor(oldValue, newValue, timeDiff, options, change, undoEntry, indicesToRemove, index)) return;
      if (handleNumber(oldValue, newValue, timeDiff, options, change, undoEntry, indicesToRemove, index)) return;
    });
  });
  
  return {
    processedChanges: uniqueChanges,
    indicesToRemove
  };
}; 

/**
 * Handles text-specific change merging
 */
const handleText = (oldValue: any, newValue: any, timeDiff: number, options: any, change: HistoryEntry, undoEntry: HistoryEntry, indicesToRemove: Set<number>, index: number): boolean => {
  if (
    typeof oldValue === 'string' && 
    typeof newValue === 'string' && 
    timeDiff <= options.mergeTimeThreshold * 3
  ) {
    const lengthDiff = Math.abs(newValue.length - oldValue.length);
    
    if (lengthDiff <= options.mergeCharacterThreshold) {
      change.oldValue = undoEntry.oldValue;
      change.timestamp = undoEntry.timestamp;
      indicesToRemove.add(index);
      return true;
    }
  }
  return false;
};

/**
 * Handles color-specific change merging
 */
const handleColor = (oldValue: any, newValue: any, timeDiff: number, options: any, change: HistoryEntry, undoEntry: HistoryEntry, indicesToRemove: Set<number>, index: number): boolean => {
  if (options.colorMergeEnabled && 
      typeof oldValue === 'string' && 
      typeof newValue === 'string' &&
      timeDiff <= options.mergeTimeThreshold * 5 &&
      oldValue.match(/^#[0-9a-f]{3,8}$/i) && 
      newValue.match(/^#[0-9a-f]{3,8}$/i)) {

    // Convert hex colors to RGB for comparison
    const oldRGB = hexToRGB(oldValue);
    const newRGB = hexToRGB(newValue);

    if (!oldRGB || !newRGB) return false;

    // Calculate color difference using Euclidean distance
    const colorDiff = Math.sqrt(
      Math.pow(oldRGB.r - newRGB.r, 2) +
      Math.pow(oldRGB.g - newRGB.g, 2) +
      Math.pow(oldRGB.b - newRGB.b, 2)
    );

    // If colors are similar enough (using configurable threshold)
    if (colorDiff <= options.colorDiffThreshold) {
      change.oldValue = undoEntry.oldValue;
      change.timestamp = undoEntry.timestamp;
      indicesToRemove.add(index);
      return true;
    }
  }
  return false;
};

/**
 * Handles number-specific change merging
 */
const handleNumber = (oldValue: any, newValue: any, timeDiff: number, options: any, change: HistoryEntry, undoEntry: HistoryEntry, indicesToRemove: Set<number>, index: number): boolean => {
  if (options.numberMergeEnabled && 
      typeof oldValue === 'number' && 
      typeof newValue === 'number' &&
      timeDiff <= options.mergeTimeThreshold * 2) {
    
    change.oldValue = undoEntry.oldValue;
    change.timestamp = undoEntry.timestamp;
    indicesToRemove.add(index);
    return true;
  }
  return false;
};

/**
 * Converts a hex color string to RGB object
 */
function hexToRGB(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export { processChanges };