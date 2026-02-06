import { useState, useCallback, useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { UndoRedoState, UNREObjectInterface, UseUndoRedoReturn } from './types';
import { processChanges } from './processChanges';
import { isInParent, sendToIframe, sendToParent, syncStateToParent, createMessageHandler, registerCallback, executeCallback } from './parentCommunication';
import { undoRedoContextAtom } from '@/store/editor';

export function useUndoRedo(context?: any): UseUndoRedoReturn {
  // Use Jotai atom for shared context
  const [sharedContext, setSharedContext] = useAtom(undoRedoContextAtom);
  
  // Track previous context to prevent infinite loops
  const previousContextRef = useRef<any>(null);

  // Share context with other instances
  useEffect(() => {
    if (context && JSON.stringify(previousContextRef.current) !== JSON.stringify(context)) {
      previousContextRef.current = context;
      setSharedContext(context);
    }
  }, [context]);

  // Core state
  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState>({
    pages: new Map(),
    currentPageId: '',
    isProcessing: false
  });

  // Current page awareness
  const [currentActivePage, setCurrentActivePage] = useState<string>('');

  // Get current page stacks for computed values - MOVED UP HERE
  const getCurrentPageStacks = useCallback(() => {
    const currentPage = undoRedoState.pages.get(currentActivePage);
    return {
      undoStack: currentPage?.undoStack || [],
      redoStack: currentPage?.redoStack || []
    };
  }, [undoRedoState.pages, currentActivePage]);

  const currentPageUndoStack = getCurrentPageStacks().undoStack;
  const currentPageRedoStack = getCurrentPageStacks().redoStack;

  // State variables for canUndo/canRedo - MOVED UP HERE so functions can use them
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Update canUndo/canRedo state variables when stacks change
  useEffect(() => {
    setCanUndo(currentPageUndoStack.length > 0 && !undoRedoState.isProcessing);
    setCanRedo(currentPageRedoStack.length > 0 && !undoRedoState.isProcessing);
  }, [currentPageUndoStack.length, currentPageRedoStack.length, undoRedoState.isProcessing]);

  // 1. Continuously sync canUndo, canRedo, and page state with the parent
  useEffect(() => {
    syncStateToParent(canUndo, canRedo, currentActivePage, undoRedoState.pages);
  }, [canUndo, canRedo, currentActivePage, undoRedoState.pages]);

  // 2. Message listener for cross-context communication
  useEffect(() => {
    const handleMessage = createMessageHandler(
      setCanUndo,
      setCanRedo,
      setUndoRedoState,
      setCurrentActivePage,
      currentActivePage,
      undoRedoState,
      sharedContext
    );

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setCanUndo, setCanRedo, setUndoRedoState, setCurrentActivePage, currentActivePage, undoRedoState, sharedContext]);

  // ===================================================================
  // **                    Function Definitions                      **
  // **              Core undo/redo operations                       **
  // ===================================================================

  // 1. Main function to add operations to undo stack
  const addToUndoStack = useCallback((operation: UNREObjectInterface) => {
    console.log('[useUndoRedo] addToUndoStack called from', isInParent() ? 'parent' : 'iframe', 'for operation:', operation);

    // If we're in parent context and operation needs parent execution, register callbacks
    if (isInParent() && operation.executionContext === 'parent') {
      console.log('[useUndoRedo] From Parent... Registering callbacks for parent-executed operation');

      // Extract and register the actual undo/redo functions
      const undoCallbackId = `undo_${Date.now()}_${Math.random()}`;
      const redoCallbackId = `redo_${Date.now()}_${Math.random()}`;

      registerCallback(undoCallbackId, operation.undo);
      registerCallback(redoCallbackId, operation.redo);

      // Create modified operation with callback IDs and dispatchers
      const operationWithCallbacks: UNREObjectInterface = {
        ...operation,
        undoCallbackId,
        redoCallbackId,
        undo: (metadata, context) => {
          sendToParent('EXECUTE_CALLBACK', { callbackId: undoCallbackId, metadata });
        },
        redo: (metadata, context) => {
          sendToParent('EXECUTE_CALLBACK', { callbackId: redoCallbackId, metadata });
        }
      };

      console.log('[useUndoRedo] From Parent... Sending operation with callbacks to iframe:', operationWithCallbacks);
      sendToIframe('ADD_TO_UNDO_STACK', operationWithCallbacks);

      // ALSO ADD TO PARENT'S OWN UNDO STACK!
      setUndoRedoState(prev => ({ ...prev, isProcessing: true }));

      // Clear the redo stack for current page
      setUndoRedoState(prev => {
        const newPages = new Map(prev.pages);
        const currentPage = newPages.get(currentActivePage);

        if (currentPage) {
          newPages.set(currentActivePage, {
            ...currentPage,
            redoStack: [] // Clear redo stack for current page
          });
        }

        return { ...prev, pages: newPages };
      });

      // Add the operation WITH CALLBACK IDs to parent's undo stack
      setUndoRedoState(prev => {
        const newPages = new Map(prev.pages);
        const currentPage = newPages.get(currentActivePage);

        // Create operation with callback IDs (NO functions, just IDs)
        const operationWithCallbackIds = {
          ...operation,
          undoCallbackId,
          redoCallbackId,
          // Keep placeholder functions to satisfy TypeScript
          undo: () => {},
          redo: () => {}
        };

        if (currentPage) {
          newPages.set(currentActivePage, {
            ...currentPage,
            undoStack: [...currentPage.undoStack, {
              operation: operationWithCallbackIds,
              metadata: operation.metadata
            }]
          });
        } else {
          // Create new page state if it doesn't exist
          newPages.set(currentActivePage, {
            undoStack: [{
              operation: operationWithCallbackIds,
              metadata: operation.metadata
            }],
            redoStack: [],
            lastSavedAt: 0
          });
        }

        return { ...prev, pages: newPages };
      });

      setUndoRedoState(prev => ({ ...prev, isProcessing: false }));
      return;
    }

    // If we're in parent context but operation should execute in iframe, send as-is
    if (isInParent()) {
      console.log('[useUndoRedo] From Parent... Sending iframe-executed operation to iframe:', operation);
      sendToIframe('ADD_TO_UNDO_STACK', operation);

      // ALSO ADD TO PARENT'S OWN UNDO STACK!
      setUndoRedoState(prev => ({ ...prev, isProcessing: true }));

      // Clear the redo stack for current page
      setUndoRedoState(prev => {
        const newPages = new Map(prev.pages);
        const currentPage = newPages.get(currentActivePage);

        if (currentPage) {
          newPages.set(currentActivePage, {
            ...currentPage,
            redoStack: [] // Clear redo stack for current page
          });
        }

        return { ...prev, pages: newPages };
      });

      // Add the operation to parent's undo stack
      setUndoRedoState(prev => {
        const newPages = new Map(prev.pages);
        const currentPage = newPages.get(currentActivePage);

        if (currentPage) {
          newPages.set(currentActivePage, {
            ...currentPage,
            undoStack: [...currentPage.undoStack, {
              operation: operation,
              metadata: operation.metadata
            }]
          });
        } else {
          // Create new page state if it doesn't exist
          newPages.set(currentActivePage, {
            undoStack: [{
              operation: operation,
              metadata: operation.metadata
            }],
            redoStack: [],
            lastSavedAt: 0
          });
        }

        return { ...prev, pages: newPages };
      });

      setUndoRedoState(prev => ({ ...prev, isProcessing: false }));
      return;
    }

    // Set processing to true at the beginning
    setUndoRedoState(prev => ({ ...prev, isProcessing: true }));

    // Step 1: Create the UNRE object for the change
    // (operation is already passed in, so we can use it directly)

    // Step 2: Clear the redo stack for current page only
    setUndoRedoState(prev => {
      const newPages = new Map(prev.pages);
      const currentPage = newPages.get(currentActivePage);

      if (currentPage) {
        newPages.set(currentActivePage, {
          ...currentPage,
          redoStack: [] // Clear redo stack for current page
        });
      }

      return { ...prev, pages: newPages };
    });

    // Step 3: Call process changes for modify_node and modify_site_settings operations
    let processedChanges: any[] = [];
    let indicesToRemove: Set<number> = new Set();

    if (operation.type === 'modify_node' || operation.type === 'modify_site_settings') {
      if (operation.metadata.propertyPath) {
        // Handle property-level changes (with merging)
        let oldValue: any;
        let newValue: any;

        if (operation.type === 'modify_node') {
          // Check if this is a node-level update (UPDATE_NODE operations use nodeId as path)
          if (operation.metadata.propertyPath === operation.metadata.nodeId) {
            oldValue = operation.metadata.originalNode; // Use full node for node-level updates
            newValue = operation.metadata.modifiedNode;
          } else {
            oldValue = getNestedValue(operation.metadata.originalNode, operation.metadata.propertyPath);
            newValue = getNestedValue(operation.metadata.modifiedNode, operation.metadata.propertyPath);
          }
        } else if (operation.type === 'modify_site_settings') {
          // Check if this is a site-level update
          if (operation.metadata.propertyPath?.startsWith('site.')) {
            oldValue = operation.metadata.originalSettings; // Use full settings for site-level updates
            newValue = operation.metadata.modifiedSettings;
          } else {
            oldValue = getNestedValue(operation.metadata.originalSettings, operation.metadata.propertyPath);
            newValue = getNestedValue(operation.metadata.modifiedSettings, operation.metadata.propertyPath);
          }
        }

        const historyEntry = {
          path: operation.metadata.propertyPath,
          oldValue: oldValue,        // Specific property value, not entire node
          newValue: newValue,        // Specific property value, not entire node
          timestamp: operation.metadata.timestamp
        };

        const historyEntries = currentPageUndoStack
          .filter(entry => entry.operation.type === 'modify_node' || entry.operation.type === 'modify_site_settings').map(entry => {
            if (entry.operation.type === 'modify_node') {
              return {
                path: entry.metadata?.propertyPath || `node.${entry.metadata?.nodeId}`,
                oldValue: entry.metadata?.originalNode,
                newValue: entry.metadata?.modifiedNode,
                timestamp: entry.metadata?.timestamp || Date.now()
              };
            } else if (entry.operation.type === 'modify_site_settings') {
              return {
                path: entry.metadata?.propertyPath || `site.${entry.metadata?.targetId}`,
                oldValue: entry.metadata?.originalSettings,
                newValue: entry.metadata?.modifiedSettings,
                timestamp: entry.metadata?.timestamp || Date.now()
              };
            }
            return null;
          }).filter(entry => entry !== null);

        const result = processChanges([historyEntry], historyEntries, {
          mergeTimeThreshold: 300,
          mergeCharacterThreshold: 5,
          colorMergeEnabled: true,
          numberMergeEnabled: true,
          colorDiffThreshold: 30
        });

        processedChanges = result.processedChanges;
        indicesToRemove = result.indicesToRemove;

        console.log('[useUndoRedo] Property change detected:', {
          path: operation.metadata.propertyPath,
          oldValue,
          newValue,
          processedChanges,
          indicesToRemove
        });
      }

      console.log('[useUndoRedo] Processing changes for modify_node or modify_site_settings operation:', operation);
    } else {
      console.log('[useUndoRedo] Skipping processChanges for non-modify operation:', operation.type);
    }

    // Step 4: Update the undo stack
    setUndoRedoState(prev => {
      const newPages = new Map(prev.pages);
      const currentPage = newPages.get(currentActivePage);

      if (currentPage) {
        // If we have processed changes, handle merging logic
        if (processedChanges.length > 0) {
          // Remove old entries that should be merged
          const filteredUndoStack = currentPage.undoStack.filter((_, index) => !indicesToRemove.has(index));

          // Convert processedChanges (HistoryEntry[]) back to UndoRedoEntry[] format
          const newUndoEntries = processedChanges.map(historyEntry => ({
            operation: operation, // Use the current operation
            metadata: {
              ...operation.metadata,
              propertyPath: historyEntry.path,
              originalValue: historyEntry.oldValue,
              modifiedValue: historyEntry.newValue,
              timestamp: historyEntry.timestamp
            }
          }));

          // Add the processed changes
          const newUndoStack = [...filteredUndoStack, ...newUndoEntries];

          newPages.set(currentActivePage, {
            ...currentPage,
            undoStack: newUndoStack
          });
        } else {
          // Add the operation to undo stack normally
          newPages.set(currentActivePage, {
            ...currentPage,
            undoStack: [...currentPage.undoStack, {
              operation: operation,
              metadata: operation.metadata
            }]
          });
        }
      } else {
        // Create new page state if it doesn't exist
        newPages.set(currentActivePage, {
          undoStack: [{
            operation: operation,
            metadata: operation.metadata
          }],
          redoStack: [],
          lastSavedAt: 0
        });
      }

      return { ...prev, pages: newPages };
    });


    setUndoRedoState(prev => ({ ...prev, isProcessing: false }));
  }, [currentActivePage]);

  // 2. Undo function
  const undo = useCallback(async (): Promise<boolean> => {
    console.log('[useUndoRedo] Undo function called from', isInParent() ? 'parent' : 'iframe', 'canUndo:', canUndo);
    if (!canUndo) return false;

    // Get current state outside of set function
    const currentPage = undoRedoState.pages.get(currentActivePage);

    console.log('[useUndoRedo] Current page:', currentPage,
      'undoStack:', currentPage?.undoStack,
      'redoStack:', currentPage?.redoStack
    );

    if (!currentPage || currentPage.undoStack.length === 0) {
      return false;
    }

    // Get the last operation from undo stack
    const lastOperation = currentPage.undoStack[currentPage.undoStack.length - 1];

    // Check execution context (source of truth)
    const executionContext = lastOperation.operation.executionContext;

    console.log('[useUndoRedo] Last operation:', lastOperation,
      'executionContext:', executionContext,
      'currentContext:', isInParent() ? 'parent' : 'iframe'
    );

    if (executionContext === 'parent' && !isInParent()) {
      // We're in iframe but operation needs parent execution
      if (lastOperation.operation.undoCallbackId) {
        // Use callback ID approach
        sendToParent('EXECUTE_CALLBACK', {
          callbackId: lastOperation.operation.undoCallbackId,
          metadata: lastOperation.metadata
        });
      } else {
        // Fallback to generic parent execution
        sendToParent('UNDO');
        return true; // Don't update stacks here, parent will sync back
      }
    } else if (executionContext === 'parent' && isInParent()) {
      // We're in parent and operation should execute here - use callback ID to access registry
      console.log('[useUndoRedo] Executing parent operation using callback registry');
      console.log('[useUndoRedo] Context being passed to executeCallback:', sharedContext);
      if (lastOperation.operation.undoCallbackId) {
        executeCallback(lastOperation.operation.undoCallbackId, lastOperation.metadata, sharedContext);
      } else {
        console.error('[useUndoRedo] No undoCallbackId found for parent-executed operation');
      }

      // Update stacks locally AFTER executing callback
      setUndoRedoState(prev => {
        const newPages = new Map(prev.pages);
        const currentPage = newPages.get(currentActivePage);

        if (currentPage) {
          const newUndoStack = currentPage.undoStack.slice(0, -1);
          const newRedoStack = [...currentPage.redoStack, lastOperation];

          newPages.set(currentActivePage, {
            ...currentPage,
            undoStack: newUndoStack,
            redoStack: newRedoStack
          });
        }

        return { ...prev, pages: newPages };
      });

      // Sync to iframe after local execution
      console.log('[useUndoRedo] From Parent... Sending sync stack update to iframe:');
      sendToIframe('SYNC_STACK_UPDATE', {
        action: 'undo',
        pageId: currentActivePage,
        operation: lastOperation.operation
      });
      return true;
    } else if (executionContext === 'iframe' && isInParent()) {
      console.log('[useUndoRedo] Executing undo operation in iframe');
      // We're in parent but operation needs iframe - just tell iframe to undo
      sendToIframe('UNDO');
      return true; // Don't update stacks here, iframe will handle
    } else {
      // Execute locally (iframe operation in iframe context)
      try {
        lastOperation.operation.undo(lastOperation.metadata, sharedContext || {});
      } catch (error) {
        console.error('[useUndoRedo] Error during undo:', error);
      }
    }

    // Update stacks locally (only when executing in iframe) - minimal set function body
    setUndoRedoState(prev => {
      const newPages = new Map(prev.pages);
      const currentPage = newPages.get(currentActivePage);

      if (currentPage) {
        const newUndoStack = currentPage.undoStack.slice(0, -1);
        const newRedoStack = [...currentPage.redoStack, lastOperation];

        newPages.set(currentActivePage, {
          ...currentPage,
          undoStack: newUndoStack,
          redoStack: newRedoStack
        });
      }

      return { ...prev, pages: newPages };
    });

    return true;
  }, [currentActivePage, canUndo, undoRedoState.pages]);

  // 3. Redo function
  const redo = useCallback(async (): Promise<boolean> => {
    if (!canRedo) return false;

    // Get current state outside of set function
    const currentPage = undoRedoState.pages.get(currentActivePage);

    if (!currentPage || currentPage.redoStack.length === 0) {
      return false;
    }

    // Get the last operation from redo stack
    const lastOperation = currentPage.redoStack[currentPage.redoStack.length - 1];

    // Check execution context (source of truth)
    const executionContext = lastOperation.operation.executionContext;

    if (executionContext === 'parent' && !isInParent()) {
      // We're in iframe but operation needs parent execution
      if (lastOperation.operation.redoCallbackId) {
        // Use callback ID approach
        sendToParent('EXECUTE_CALLBACK', {
          callbackId: lastOperation.operation.redoCallbackId,
          metadata: lastOperation.metadata
        });
      } else {
        // Fallback to generic parent execution
        sendToParent('REDO');
        return true; // Don't update stacks here, parent will sync back
      }
    } else if (executionContext === 'parent' && isInParent()) {
      // We're in parent and operation should execute here - use callback ID to access registry
      console.log('[useUndoRedo] Executing parent operation using callback registry');
      console.log('[useUndoRedo] Context being passed to executeCallback:', sharedContext);
      if (lastOperation.operation.redoCallbackId) {
        executeCallback(lastOperation.operation.redoCallbackId, lastOperation.metadata, sharedContext);
      } else {
        console.error('[useUndoRedo] No redoCallbackId found for parent-executed operation');
      }

      // Update stacks locally AFTER executing callback
      setUndoRedoState(prev => {
        const newPages = new Map(prev.pages);
        const currentPage = newPages.get(currentActivePage);

        if (currentPage) {
          const newRedoStack = currentPage.redoStack.slice(0, -1);
          const newUndoStack = [...currentPage.undoStack, lastOperation];

          newPages.set(currentActivePage, {
            ...currentPage,
            undoStack: newUndoStack,
            redoStack: newRedoStack
          });
        }

        return { ...prev, pages: newPages };
      });

      // Sync to iframe after local execution
      sendToIframe('SYNC_STACK_UPDATE', {
        action: 'redo',
        pageId: currentActivePage,
        operation: lastOperation.operation
      });
      return true;
    } else if (executionContext === 'iframe' && isInParent()) {
      // We're in parent but operation needs iframe - just tell iframe to redo
      sendToIframe('REDO');
      return true; // Don't update stacks here, iframe will handle
    } else {
      // Execute locally (iframe operation in iframe context)
      try {
        lastOperation.operation.redo(lastOperation.metadata, sharedContext || {});
      } catch (error) {
        console.error('[useUndoRedo] Error during redo:', error);
      }
    }

    // Update stacks locally (only when executing in iframe) - minimal set function body
    setUndoRedoState(prev => {
      const newPages = new Map(prev.pages);
      const currentPage = newPages.get(currentActivePage);

      if (currentPage) {
        const newRedoStack = currentPage.redoStack.slice(0, -1);
        const newUndoStack = [...currentPage.undoStack, lastOperation];

        newPages.set(currentActivePage, {
          ...currentPage,
          undoStack: newUndoStack,
          redoStack: newRedoStack
        });
      }

      return { ...prev, pages: newPages };
    });

    return true;
  }, [currentActivePage, canRedo, undoRedoState.pages]);

  // 4. Get undo/redo stacks for current page
  const getAllPagesWithChanges = useCallback(() => {
    const pagesWithChanges: string[] = [];
    undoRedoState.pages.forEach((pageState, pageId) => {
      if (pageState.undoStack.length > 0 || pageState.redoStack.length > 0) {
        pagesWithChanges.push(pageId);
      }
    });
    return pagesWithChanges;
  }, [undoRedoState.pages]);

  // 5. Set current active page
  const setCurrentPage = useCallback((pageId: string) => {
    setCurrentActivePage(pageId);
    setUndoRedoState(prev => ({
      ...prev,
      currentPageId: pageId
    }));
  }, []);

  // 6. Clear stacks for specific page
  const clearPageStacks = useCallback((pageId: string) => {
    setUndoRedoState(prev => {
      const newPages = new Map(prev.pages);
      newPages.delete(pageId);
      return {
        ...prev,
        pages: newPages
      };
    });
  }, []);

  // 7. Clear all stacks
  const clearAllStacks = useCallback(() => {
    setUndoRedoState(prev => ({
      ...prev,
      pages: new Map(),
      currentPageId: ''
    }));
  }, []);

  const allPagesWithChanges = getAllPagesWithChanges();

  // Return the hook interface
  return {
    // Current page state
    currentPageUndoStack,
    currentPageRedoStack,
    currentPageId: currentActivePage,
    currentActivePage,

    // Global state
    isProcessing: undoRedoState.isProcessing,
    allPagesWithChanges,

    // Capabilities
    canUndo,
    canRedo,

    // Core actions
    undo,
    redo,
    addToUndoStack,

    // Page management
    setCurrentPage,
    clearPageStacks,
    clearAllStacks,

    // Utility functions
    getCurrentPageStacks,
    getAllPagesWithChanges,

    // Advanced usage
    setUndoRedoState,
  };
}



// Helper function to extract nested property values
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};