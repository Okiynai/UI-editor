import { PageDefinition, SiteSettings } from "@/OSDL/OSDL.types";
import { AgentChange } from "@/store/editor";
import { undo, redo, undoSiteSettings, redoSiteSettings, UNREObjectInterface } from "./undo-redo";

export interface ApplyDiffDependencies {
  setPageDefinition: (pageDefinition: PageDefinition | ((prev: PageDefinition | null) => PageDefinition | null)) => void;
  setEditableSiteSettings: (settings: SiteSettings | ((prev: SiteSettings | null) => SiteSettings | null)) => void;
  addToUndoStack: (operation: UNREObjectInterface) => void;
}

/**
 * Stringifies a JavaScript object with its keys sorted recursively.
 * This is crucial for creating a "canonical" representation for diffing.
 * @param obj The object to stringify.
 * @returns A JSON string with keys sorted alphabetically.
 */
function stringifyWithSortedKeys(obj: any): string {
  // A replacer function that sorts the keys of an object.
  const replacer = (key: string, value: any) =>
    value instanceof Object && !(value instanceof Array)
      ? Object.keys(value)
          .sort()
          .reduce((sorted, key) => {
            sorted[key] = value[key];
            return sorted;
          }, {} as { [key: string]: any })
      : value;

  return JSON.stringify(obj, replacer, 2); // Using 2 spaces for indentation
}

const performAdvancedStringSearch = (currentStr: string, searchStr: string, replaceStr: string, propertyPath?: string): { success: boolean, newValue: string } => {
	// Normalize line endings for comparison
	const normalizeLineEndings = (str: string) => str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	const normalizedCurrent = normalizeLineEndings(currentStr);
	const normalizedSearch = normalizeLineEndings(searchStr);
	const normalizedReplace = normalizeLineEndings(replaceStr);
	
	// Try exact match first
	if (normalizedCurrent.includes(normalizedSearch)) {
		const newValue = normalizedCurrent.replace(normalizedSearch, normalizedReplace);
		console.log(`[IframePage] Successfully updated ${propertyPath} (exact match)`);
		return { success: true, newValue };
	}

	// STRATEGY 1: Check if this is a full content replacement.
	const isFullReplacement = Math.abs(normalizedCurrent.length - normalizedSearch.length) < (normalizedSearch.length * 0.1); // Allow 10% tolerance
	if (isFullReplacement && normalizedCurrent.includes(normalizedSearch)) {
		console.log(`[IframePage] Strategy: Full Overwrite. Replacing entire content of ${propertyPath}.`);
		const newValue = normalizedReplace;
		return { success: true, newValue };
	}

	// STRATEGY 2: Check for a smaller, partial (multi-line) replacement.
	if (normalizedCurrent.includes(normalizedSearch)) {
		console.log(`[IframePage] Strategy: Partial Replace. Found substring to replace.`);
		const newValue = normalizedCurrent.replace(normalizedSearch, normalizedReplace);
		return { success: true, newValue };
	}
  
	// Try trimmed match for code blocks (remove leading/trailing whitespace)
	const trimmedCurrent = normalizedCurrent.trim();
	const trimmedSearch = normalizedSearch.trim();
	if (trimmedCurrent.includes(trimmedSearch)) {
		const trimmedReplace = normalizeLineEndings(replaceStr).trim();
		const trimmedIndex = normalizedCurrent.indexOf(trimmedSearch);
		if (trimmedIndex !== -1) {
			const newValue = normalizedCurrent.substring(0, trimmedIndex) + 
							   trimmedReplace + 
							   normalizedCurrent.substring(trimmedIndex + trimmedSearch.length);
			return { success: true, newValue };
		}
	}
	
	// Try indentation-insensitive match (for code blocks with different indentation)
	const removeIndentation = (str: string) => str.split('\n').map(line => line.trim()).join('\n');
	const indentInsensitiveCurrent = removeIndentation(normalizedCurrent);
	const indentInsensitiveSearch = removeIndentation(normalizedSearch);
	
	if (indentInsensitiveCurrent.includes(indentInsensitiveSearch)) {
		const lines = normalizedCurrent.split('\n');
		const searchLines = normalizedSearch.split('\n');
		let startLineIndex = -1;
		for (let i = 0; i <= lines.length - searchLines.length; i++) {
			if (lines[i].trim() === searchLines[0].trim()) {
				let allMatch = true;
				for (let j = 1; j < searchLines.length; j++) {
					if (i + j >= lines.length || lines[i + j].trim() !== searchLines[j].trim()) {
						allMatch = false;
						break;
					}
				}
				if (allMatch) { startLineIndex = i; break; }
			}
		}
		if (startLineIndex !== -1) {
			const beforeLines = lines.slice(0, startLineIndex);
			const afterLines = lines.slice(startLineIndex + searchLines.length);
			const replaceLines = normalizeLineEndings(replaceStr).split('\n');
			const newContent = [...beforeLines, ...replaceLines, ...afterLines].join('\n');
			return { success: true, newValue: newContent };
		}
	}
	
	// If no match found, try a fuzzy approach for very long strings
	if (searchStr.length > 1000) {
		const searchStart = searchStr.substring(0, 100);
		const searchEnd = searchStr.substring(searchStr.length - 100);
		const startIndex = normalizedCurrent.indexOf(searchStart);
		const endIndex = normalizedCurrent.lastIndexOf(searchEnd);
		
		if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
			const extractedContent = normalizedCurrent.substring(startIndex, endIndex + searchEnd.length);
			if (Math.abs(extractedContent.length - searchStr.length) < searchStr.length * 0.1) {
				const newValue = normalizedCurrent.substring(0, startIndex) + 
								 normalizeLineEndings(replaceStr) + 
								 normalizedCurrent.substring(endIndex + searchEnd.length);
				return { success: true, newValue };
			}
		}
	}
	
	return { success: false, newValue: currentStr }; // Return original if all strategies fail
};

const performSearchAndReplace = (currentValue: any, searchValue: string, replaceValue: string, propertyPath?: string): { success: boolean, newValue: any } => {
    if (typeof currentValue === 'number') {
        console.log(`[IframePage] Performing NUMBER replacement on '${propertyPath}'`);
        const searchNumber = parseInt(searchValue, 10);
        const replaceNumber = parseInt(replaceValue, 10);

        if (currentValue === searchNumber) {
            currentValue = replaceNumber;
            console.log(`[IframePage] Successfully updated ${propertyPath} from ${currentValue} to ${replaceNumber}`);
            return { success: true, newValue: currentValue };
        } else {
            console.error(`[IframePage] Search value ${searchNumber} does not match current number ${currentValue}.`);
              return { success: false, newValue: currentValue };
        }
    }
    

    // Handle string properties 
    if (typeof currentValue === 'string') {
      // Handle quoted vs unquoted search values
      let actualSearchValue = searchValue;
      let actualReplaceValue = replaceValue;
      
      if (searchValue.startsWith('"') && searchValue.endsWith('"') && !currentValue.startsWith('"')) {
        actualSearchValue = searchValue.slice(1, -1); // Remove quotes
      }
      if (replaceValue.startsWith('"') && replaceValue.endsWith('"') && !currentValue.startsWith('"')) {
        actualReplaceValue = replaceValue.slice(1, -1); // Remove quotes
      }
      
      console.log(`[IframePage] Searching for multi-line content in ${propertyPath}`);
      const result = performAdvancedStringSearch(currentValue, actualSearchValue, actualReplaceValue, propertyPath);

      if (result.success) {
          return { success: true, newValue: result.newValue };
      } else {
        // If all else fails, provide detailed error information
        console.error(`[IframePage] Search value not found in ${propertyPath}.`);
        console.error(`[IframePage] Current value preview: "${currentValue.substring(0, 200)}${currentValue.length > 200 ? '...' : ''}"`);
        console.error(`[IframePage] Search value: "${actualSearchValue.substring(0, 200)}${actualSearchValue.length > 200 ? '...' : ''}"`);
        return { success: false, newValue: currentValue };
      }
    }
    
    // Handle object properties 
    if (typeof currentValue === 'object' && currentValue !== null) {
      try {
        // if (typeof currentValue === 'object' && currentValue !== null &&
        //     typeof replaceValue === 'object' && replaceValue !== null) {

        //     console.log(`[IframePage] Strategy: Direct Object Overwrite for property '${propertyPath}'.`);
        //     // Instead of searching, just merge/overwrite. A simple overwrite is safest.
        //     // The model is now responsible for providing the FULL new object state.
        //     return { success: true, newValue: replaceValue };
        // }

        // Convert object to formatted JSON string for search/replace
        // const jsonString = JSON.stringify(currentValue, null, 2);
        const jsonString = stringifyWithSortedKeys(currentValue);
        console.log(`[IframePage] Searching within stringified JSON for property: ${propertyPath}`);
        
        const result = performAdvancedStringSearch(jsonString, searchValue, replaceValue, propertyPath);

        if (result.success) {
            // Parse the successfully modified string back into an object
            try {
                const updatedObject = JSON.parse(result.newValue);
                console.log(`[IframePage] Object updated successfully for property ${propertyPath}`);
                return { success: true, newValue: updatedObject };
            } catch (parseError) {
                console.error(`[IframePage] Failed to parse JSON after replacement:`, parseError);
                console.error(`[IframePage] Invalid JSON produced:`, result.newValue);
                return { success: false, newValue: currentValue }; // Abort on parse error
            }
        } else {
          // The advanced search failed, log the error.
          console.error(`[IframePage] Search value not found in ${propertyPath} JSON.`);
          console.error(`[IframePage] Looking for: "${searchValue}"`);
          console.error(`[IframePage] Current JSON: "${jsonString.substring(0, 200)}${jsonString.length > 200 ? '...' : ''}"`);
          return { success: false, newValue: currentValue };
        }
      } catch (error) {
        console.error(`[IframePage] Failed to stringify JSON during object modification:`, error);
        return { success: false, newValue: currentValue };
      }
    }

    return { success: false, newValue: currentValue };
};

const applyDiff = (
  payload: {
    diffType: 'node' | 'page' | 'site';
    targetId: string;
    propertyPath: string;
    searchValue: string;
    replaceValue: string;
    sectionId?: string;
    sectionTitle?: string;
    actionId?: string;
    isAgentRequest?: boolean;
  },
  deps: ApplyDiffDependencies
): { success: boolean; error?: string; change?: AgentChange | null } => {
  const { diffType, targetId, propertyPath, searchValue, replaceValue } = payload;
  console.log(`[IframePage] Applying '${diffType}' diff to target '${targetId}'`);
  console.log('[applyDiff] Input payload:', payload);

  let diffError: string | undefined;
  let undoOperation: UNREObjectInterface | null = null;

  // This is the generic state updater function that contains YOUR logic.
  const updateState = (prevState: any) => {
    if (!prevState) return prevState;

    const newState = JSON.parse(JSON.stringify(prevState));
    let targetObject = newState;
    let originalNode: any = null;
    let originalSiteSettings: any = null;

    // STEP 1 - Find the correct object to modify. This is the routing logic.
    if (diffType === 'node') {
      const findNode = (nodes: any[]): any => {
        for (const node of nodes) {
          if (node.id === targetId || node.name === targetId) return node;
          if (node.children && Array.isArray(node.children)) {
            const found = findNode(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      targetObject = findNode(newState.nodes);
      if (!targetObject) {
        console.error(`[IframePage] Node with id/name "${targetId}" not found`);
        diffError = `Node with id/name "${targetId}" not found`;
        return prevState; // Abort with error
      }
      // Save the original node state before applying diff
      originalNode = JSON.parse(JSON.stringify(targetObject));
    } else if (diffType === 'site') {
      // Save the original site settings state before applying diff
      originalSiteSettings = JSON.parse(JSON.stringify(prevState));
    }
    // For 'page' and 'site' diffs, targetObject is already correct (the root of the state).
    // No 'else' block is needed.

    // Create AgentChange for tracking (will be updated after successful modification)
    if (diffType === 'node' && targetObject) {
      // We'll create the change after successful modification to capture the modified state
    }

    // CASE 1: Object-level patch (propertyPath is null or empty). Applies to node, page, or site.
    if (propertyPath === null || propertyPath === "") {
      console.log(`[IframePage] Applying object-level patch to ${diffType} '${targetId}'`);
      const { success, newValue } = performSearchAndReplace(targetObject, searchValue, replaceValue);

      if (success) {
        // Merge the changes from the modified object back into our cloned state
        Object.assign(targetObject, newValue);
        console.log(`[IframePage] Successfully patched ${diffType} object '${targetId}'`);

        // Create AgentChange for tracking after successful modification
        if (diffType === 'node' && originalNode) {
          const change: AgentChange = {
            id: crypto.randomUUID(),
            operation: 'modify',
            targetScope: diffType,
            nodeId: targetId,
            nodeName: targetObject.name || targetObject.id,
            originalNode: originalNode,
            modifiedNode: JSON.parse(JSON.stringify(targetObject)), // Capture modified state
            propertyPath: propertyPath,
            sectionId: targetId,
            sectionTitle: payload.sectionTitle,
            timestamp: Date.now()
          };
          resultingChange = change; // capture for return to parent
        }

        // Create undo operation for successful modification only if this is not an agent request
        if (!payload.isAgentRequest) {
          if (diffType === 'node' && originalNode) {
            const modifiedNode = JSON.parse(JSON.stringify(targetObject));
            undoOperation = {
              type: 'modify_node',
              executionContext: 'iframe',
              metadata: {
                operation: 'modify',
                nodeId: targetId,
                nodeName: targetObject.name || targetObject.id,
                originalNode: originalNode,
                modifiedNode: modifiedNode,
                propertyPath: propertyPath,
                searchValue: searchValue,
                replaceValue: replaceValue,
                timestamp: Date.now(),
              },
              undo: async (metadata: any, context: any) => {
                return undo(metadata, {
                  setPageDefinition: deps.setPageDefinition
                });
              },
              redo: async (metadata: any, context: any) => {
                return redo(metadata, {
                  setPageDefinition: deps.setPageDefinition
                });
              }
            };
          } else if (diffType === 'site' && originalSiteSettings) {
            const modifiedSiteSettings = JSON.parse(JSON.stringify(targetObject));
            undoOperation = {
              type: 'modify_site_settings',
              executionContext: 'iframe',
              metadata: {
                operation: 'modify',
                targetId: targetId,
                originalSettings: originalSiteSettings,
                modifiedSettings: modifiedSiteSettings,
                propertyPath: propertyPath,
                searchValue: searchValue,
                replaceValue: replaceValue,
                timestamp: Date.now(),
              },
              undo: async (metadata: any, context: any) => {
                return undoSiteSettings(metadata, context);
              },
              redo: async (metadata: any, context: any) => {
                return redoSiteSettings(metadata, context);
              }
            };
          }
        }

        return newState;
      } else {
        console.error(`[IframePage] Failed to apply object-level patch to ${diffType} '${targetId}'`);
        diffError = `Failed to apply object-level patch to ${diffType} '${targetId}'. Search value not found.`;
        return prevState; // Abort with error
      }
    } else {

      // CASE 2: Property-path-based patch (the original logic).
      const pathParts = propertyPath.split('.');
      let targetParent = targetObject;
      const lastKey = pathParts.pop();

      if (!lastKey) {
        console.error(`[IframePage] Invalid propertyPath: "${propertyPath}"`);
        diffError = `Invalid propertyPath: "${propertyPath}"`;
        return prevState;
      }

      for (let i = 0; i < pathParts.length; i++) {
        const key = pathParts[i];
        if (targetParent[key] === undefined || targetParent[key] === null) {
          const currentPath = pathParts.slice(0, i + 1).join('.');
          const availableKeys = targetParent && typeof targetParent === 'object' ? Object.keys(targetParent) : [];
          const errorMsg = `Invalid key "${key}" in property path: "${currentPath}". Available keys at this level: ${availableKeys.join(', ')}`;
          console.error(`[IframePage] ${errorMsg}`);
          diffError = errorMsg;
          console.log('[applyDiff] Setting diffError during path navigation:', diffError);
          return prevState;
        }
        targetParent = targetParent[key];
      }

      if (!(lastKey in targetParent)) {
        const errorMsg = `Final property "${lastKey}" not found in target. Available properties: ${Object.keys(targetParent).join(', ')}`;
        console.error(`[IframePage] ${errorMsg}`);
        diffError = errorMsg;
        console.log('[applyDiff] Setting diffError:', diffError);
        return prevState;
      }

      const currentValue = targetParent[lastKey];

      const { success, newValue } = performSearchAndReplace(currentValue, searchValue, replaceValue, propertyPath);

      if (success) {
        targetParent[lastKey] = newValue;
        console.log(`[IframePage] Successfully updated property '${propertyPath}'`);

        // Create AgentChange for tracking after successful modification
        if (diffType === 'node' && originalNode) {
          const change: AgentChange = {
            id: crypto.randomUUID(),
            operation: 'modify',
            targetScope: diffType,
            nodeId: targetId,
            nodeName: targetObject.name || targetObject.id,
            originalNode: originalNode,
            modifiedNode: JSON.parse(JSON.stringify(targetObject)), // Capture modified state
            propertyPath: propertyPath,
            sectionId: targetId,
            sectionTitle: payload.sectionTitle,
            timestamp: Date.now()
          };
          resultingChange = change; // capture for return to parent
        }

        // Create undo operation for successful modification only if this is not an agent request
        if (!payload.isAgentRequest) {
          if (diffType === 'node' && originalNode) {
            const modifiedNode = JSON.parse(JSON.stringify(targetObject));
            undoOperation = {
              type: 'modify_node',
              executionContext: 'iframe',
              metadata: {
                operation: 'modify',
                nodeId: targetId,
                nodeName: targetObject.name || targetObject.id,
                originalNode: originalNode,
                modifiedNode: modifiedNode,
                propertyPath: propertyPath,
                searchValue: searchValue,
                replaceValue: replaceValue,
                timestamp: Date.now(),
              },
              undo: async (metadata: any, context: any) => {
                return undo(metadata, {
                  setPageDefinition: deps.setPageDefinition
                });
              },
              redo: async (metadata: any, context: any) => {
                return redo(metadata, {
                  setPageDefinition: deps.setPageDefinition
                });
              }
            };
          } else if (diffType === 'site' && originalSiteSettings) {
            const modifiedSiteSettings = JSON.parse(JSON.stringify(targetObject));
            undoOperation = {
              type: 'modify_site_settings',
              executionContext: 'iframe',
              metadata: {
                operation: 'modify',
                targetId: targetId,
                originalSettings: originalSiteSettings,
                modifiedSettings: modifiedSiteSettings,
                propertyPath: propertyPath,
                searchValue: searchValue,
                replaceValue: replaceValue,
                timestamp: Date.now(),
              },
              undo: async (metadata: any, context: any) => {
                return undoSiteSettings(metadata, context);
              },
              redo: async (metadata: any, context: any) => {
                return redoSiteSettings(metadata, context);
              }
            };
          }
        }

        return newState;
      } else {
        console.error(`[IframePage] Failed to apply diff. Search value not found in property: ${propertyPath}`);
        diffError = `Search value not found in property: ${propertyPath}. The content may have changed or the search value is incorrect.`;
        return prevState; // Abort if search failed
      }
    }
  };

  // STEP 2 - Route the result of the logic to the correct React state setter.
  let success = false;
  let error: string | undefined;
  let resultingChange: AgentChange | null = null;

  try {
    console.log('[applyDiff] Starting switch statement with diffType:', diffType);
    switch (diffType) {
      case 'node':
      case 'page':
        console.log('[applyDiff] Processing node/page diff');
        // If it's a 'node' or 'page' diff, the logic operates on the pageDefinition state.
        deps.setPageDefinition(updateState);
        // Check if we captured an error during the update
        if (diffError) {
          console.log('[applyDiff] Found diffError:', diffError);
          success = false;
          error = diffError;
        } else {
          console.log('[applyDiff] No diffError, setting success = true');
          success = true;
        }
        break;
      case 'site':
        console.log('[applyDiff] Processing site diff');
        console.log('[applyDiff] diffError before state update:', diffError);
        // If it's a 'site' diff, the logic operates on the siteSettings state.
        deps.setEditableSiteSettings(updateState);
        console.log('[applyDiff] diffError after state update:', diffError);
        // Check if we captured an error during the update
        if (diffError) {
          console.log('[applyDiff] Found diffError:', diffError);
          success = false;
          error = diffError;
        } else {
          console.log('[IframePage] Site settings updated');
          success = true;
        }
        break;
      default:
        error = `Unknown diff type received: ${diffType}`;
        console.error(`[IframePage] ${error}`);
    }
  } catch (e) {
    error = `Exception during diff application: ${e}`;
    console.error(`[IframePage] ${error}`);
  }

  // Add to undo stack outside of the state setter to avoid React re-render issues
  if (undoOperation && !payload.isAgentRequest) {
    deps.addToUndoStack(undoOperation);
  }

  // If applyDiff failed, notify parent with action_failed for the section/node
  if (!success) {
    // Removed STATE_CHANGED message to parent
  }

  console.log('[applyDiff] Final result:', { success, error });
  return { success, error, change: resultingChange };
};

export default applyDiff; 
