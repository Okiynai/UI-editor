import { UndoRedoState } from './types';

export const isInParent = () => {
  try {
    return window === window.parent;
  } catch (e) {
    return false;
  }
};

// Callback registry for cross-context function execution
const callbackRegistry = new Map<string, (metadata: any, context: any) => Promise<void> | void>();

export const registerCallback = (callbackId: string, callback: (metadata: any, context: any) => Promise<void> | void) => {
  callbackRegistry.set(callbackId, callback);
};

export const unregisterCallback = (callbackId: string) => {
  callbackRegistry.delete(callbackId);
};

export const executeCallback = async (callbackId: string, metadata: any, context: any) => {
  const callback = callbackRegistry.get(callbackId);
  if (!callback) {
    console.error(`[parentCommunication] Callback not found: ${callbackId}`);
    return false;
  }

  try {
    await callback(metadata, context);
    return true;
  } catch (error) {
    console.error(`[parentCommunication] Error executing callback ${callbackId}:`, error);
    return false;
  }
};

// Helper function to serialize operations safely (preserves callback IDs, removes functions)
const serializeOperation = (operation: any) => {
  return {
    type: operation.type,
    metadata: operation.metadata,
    executionContext: operation.executionContext,
    undoCallbackId: operation.undoCallbackId,
    redoCallbackId: operation.redoCallbackId,
    // Functions are removed - will be reconstructed in iframe
  };
};

// Helper function to reconstruct operation with dispatcher functions in iframe
const reconstructOperation = (serializedOperation: any) => {
  // Reconstruct dispatcher functions if we have callback IDs but no functions
  if ((serializedOperation.undoCallbackId || serializedOperation.redoCallbackId) &&
      (!serializedOperation.undo || !serializedOperation.redo)) {
    return {
      ...serializedOperation,
      undo: serializedOperation.undoCallbackId ?
        ((metadata: any, context: any) => {
          sendToParent('EXECUTE_CALLBACK', {
            callbackId: serializedOperation.undoCallbackId,
            metadata
          });
        }) : serializedOperation.undo,
      redo: serializedOperation.redoCallbackId ?
        ((metadata: any, context: any) => {
          sendToParent('EXECUTE_CALLBACK', {
            callbackId: serializedOperation.redoCallbackId,
            metadata
          });
        }) : serializedOperation.redo
    };
  }
  return serializedOperation;
};

export const sendToIframe = (type: 'UNDO' | 'REDO' | 'ADD_TO_UNDO_STACK' | 'EXECUTE_UNDO_OPERATION' | 'EXECUTE_REDO_OPERATION' | 'SYNC_STACK_UPDATE' | 'SYNC_PAGE_STATE', operation?: any) => {
  const iframe = document.querySelector('iframe');
  if ((type === 'ADD_TO_UNDO_STACK' || type === 'EXECUTE_UNDO_OPERATION' || type === 'EXECUTE_REDO_OPERATION' || type === 'SYNC_STACK_UPDATE' || type === 'SYNC_PAGE_STATE') && operation) {
    // Serialize the operation to remove function references
    const serializedOperation = serializeOperation(operation);
    iframe?.contentWindow?.postMessage({
      type,
      operation: serializedOperation,
    }, '*');
  } else {
    iframe?.contentWindow?.postMessage({ type }, '*');
  }
};

// Helper function to serialize pages data safely (preserves callback IDs, removes functions)
const serializePagesData = (pages: Map<string, any>) => {
  const serializedPages = new Map<string, any>();

  pages.forEach((pageState, pageId) => {
    const serializedPageState = {
      ...pageState,
      undoStack: pageState.undoStack.map((entry: any) => ({
        ...entry,
        operation: {
          type: entry.operation.type,
          metadata: entry.operation.metadata,
          executionContext: entry.operation.executionContext,
          undoCallbackId: entry.operation.undoCallbackId,    // ✅ Preserve callback IDs
          redoCallbackId: entry.operation.redoCallbackId     // ✅ Preserve callback IDs
        }
      })),
      redoStack: pageState.redoStack.map((entry: any) => ({
        ...entry,
        operation: {
          type: entry.operation.type,
          metadata: entry.operation.metadata,
          executionContext: entry.operation.executionContext,
          undoCallbackId: entry.operation.undoCallbackId,    // ✅ Preserve callback IDs
          redoCallbackId: entry.operation.redoCallbackId     // ✅ Preserve callback IDs
        }
      }))
    };
    serializedPages.set(pageId, serializedPageState);
  });

  return Array.from(serializedPages.entries());
};

export const syncStateToParent = (
  canUndo: boolean,
  canRedo: boolean,
  currentActivePage?: string,
  pages?: Map<string, any>
) => {
  if (window !== window.parent) {
    // Convert Map to array for serialization (safely)
    const pagesArray = pages ? serializePagesData(pages) : undefined;

    window.parent.postMessage({
      type: 'UNDO_REDO_STATE_UPDATE',
      canUndo,
      canRedo,
      currentActivePage,
      pages: pagesArray
    }, '*');
  }
};

export const sendToParent = (type: string, data?: any) => {
  if (window !== window.parent) {
    window.parent.postMessage({
      type,
      ...data
    }, '*');
  }
};

// NEW: Centralized message handler for cross-context communication
export const createMessageHandler = (
  setCanUndo: React.Dispatch<React.SetStateAction<boolean>>,
  setCanRedo: React.Dispatch<React.SetStateAction<boolean>>,
  setUndoRedoState: React.Dispatch<React.SetStateAction<UndoRedoState>>,
  setCurrentActivePage: React.Dispatch<React.SetStateAction<string>>,
  currentActivePage: string,
  undoRedoState: UndoRedoState,
  context?: any
) => {
  return (event: MessageEvent) => {
    if (isInParent()) {
      // Handle messages from iframe to parent
      if (event.data.type === 'UNDO_REDO_STATE_UPDATE') {
        setCanUndo(event.data.canUndo);
        setCanRedo(event.data.canRedo);

        // Sync page state from iframe
        if (event.data.currentActivePage !== undefined) {
          setCurrentActivePage(event.data.currentActivePage);
        }

        if (event.data.pages) {
          // Convert array back to Map with proper typing
          const pagesMap = new Map<string, any>(event.data.pages);
          setUndoRedoState(prev => ({
            ...prev,
            pages: pagesMap
          }));
        }
      }
      // Handle simple undo/redo commands from iframe to parent
      else if (event.data.type === 'UNDO') {
        // Just update stacks in parent - DON'T execute the operation here
        // The iframe will execute the actual operation and sync back
        setUndoRedoState(prev => {
          const newPages = new Map(prev.pages);
          const currentPage = newPages.get(currentActivePage);

          if (!currentPage || currentPage.undoStack.length === 0) {
            return prev;
          }

          const lastOperation = currentPage.undoStack[currentPage.undoStack.length - 1];
          // NOTE: We do NOT execute the operation here - just update stacks
          // The iframe will execute the actual undo operation

          const newUndoStack = currentPage.undoStack.slice(0, -1);
          const newRedoStack = [...currentPage.redoStack, lastOperation];

          newPages.set(currentActivePage, {
            ...currentPage,
            undoStack: newUndoStack,
            redoStack: newRedoStack
          });

          return { ...prev, pages: newPages };
        });
      }
      else if (event.data.type === 'REDO') {
        // Just update stacks in parent - DON'T execute the operation here
        // The iframe will execute the actual operation and sync back
        setUndoRedoState(prev => {
          const newPages = new Map(prev.pages);
          const currentPage = newPages.get(currentActivePage);

          if (!currentPage || currentPage.redoStack.length === 0) {
            return prev;
          }

          const lastOperation = currentPage.redoStack[currentPage.redoStack.length - 1];
          // NOTE: We do NOT execute the operation here - just update stacks
          // The iframe will execute the actual redo operation

          const newRedoStack = currentPage.redoStack.slice(0, -1);
          const newUndoStack = [...currentPage.undoStack, lastOperation];

          newPages.set(currentActivePage, {
            ...currentPage,
            undoStack: newUndoStack,
            redoStack: newRedoStack
          });

          return { ...prev, pages: newPages };
        });
      }
      // Handle callback execution requests from iframe
      else if (event.data.type === 'EXECUTE_CALLBACK') {
        const { callbackId, metadata } = event.data;
        executeCallback(callbackId, metadata, context);
      }
    } else {
      // Handle messages from parent to iframe
      if (event.data.type === 'ADD_TO_UNDO_STACK') {
        console.log('[useUndoRedo] From Iframe... Receiving operation to iframe:', event.data);
        const { operation } = event.data;

        // Reconstruct operation with dispatcher functions if needed
        const reconstructedOperation = reconstructOperation(operation);
        if (reconstructedOperation) {
          // Process the operation directly in the iframe (duplicate logic to avoid recursion)
          setUndoRedoState((prev: UndoRedoState) => ({ ...prev, isProcessing: true }));

          // Clear the redo stack for current page only
          setUndoRedoState((prev: UndoRedoState) => {
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

          // Add the operation to undo stack normally
          setUndoRedoState((prev: UndoRedoState) => {
            const newPages = new Map(prev.pages);
            const currentPage = newPages.get(currentActivePage);

            if (currentPage) {
              newPages.set(currentActivePage, {
                ...currentPage,
                undoStack: [...currentPage.undoStack, {
                  operation: reconstructedOperation,
                  metadata: reconstructedOperation.metadata
                }]
              });
            } else {
              // Create new page state if it doesn't exist
              newPages.set(currentActivePage, {
                undoStack: [{
                  operation: reconstructedOperation,
                  metadata: reconstructedOperation.metadata
                }],
                redoStack: [],
                lastSavedAt: 0
              });
            }

            return { ...prev, pages: newPages };
          });

          setUndoRedoState((prev: UndoRedoState) => ({ ...prev, isProcessing: false }));
        }
      }
      // Handle simple undo/redo commands from parent to iframe
      else if (event.data.type === 'UNDO') {
        // Execute operation and update stacks in iframe
        const currentPage = undoRedoState.pages.get(currentActivePage);

        if (currentPage && currentPage.undoStack.length > 0) {
          const lastOperation = currentPage.undoStack[currentPage.undoStack.length - 1];

          // Execute the operation outside of setState
          try {
            lastOperation.operation.undo(lastOperation.metadata, context || {});
          } catch (error) {
            console.error('[useUndoRedo] Error during undo in iframe:', error);
          }

          // Then update stacks
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
        }
      }
      else if (event.data.type === 'REDO') {
        // Execute operation and update stacks in iframe
        const currentPage = undoRedoState.pages.get(currentActivePage);

        if (currentPage && currentPage.redoStack.length > 0) {
          const lastOperation = currentPage.redoStack[currentPage.redoStack.length - 1];

          // Execute the operation outside of setState
          try {
            lastOperation.operation.redo(lastOperation.metadata, context || {});
          } catch (error) {
            console.error('[useUndoRedo] Error during redo in iframe:', error);
          }

          // Then update stacks
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
        }
      }
      // Handle stack sync from parent to iframe
      else if (event.data.type === 'SYNC_STACK_UPDATE') {
        const { action, pageId } = event.data;
        if (pageId === currentActivePage) {
          setUndoRedoState((prev: UndoRedoState) => {
            const newPages = new Map(prev.pages);
            const currentPage = newPages.get(currentActivePage);

            if (currentPage) {
              if (action === 'undo' && currentPage.undoStack.length > 0) {
                const lastOperation = currentPage.undoStack[currentPage.undoStack.length - 1];
                const newUndoStack = currentPage.undoStack.slice(0, -1);
                const newRedoStack = [...currentPage.redoStack, lastOperation];

                newPages.set(currentActivePage, {
                  ...currentPage,
                  undoStack: newUndoStack,
                  redoStack: newRedoStack
                });
              } else if (action === 'redo' && currentPage.redoStack.length > 0) {
                const lastOperation = currentPage.redoStack[currentPage.redoStack.length - 1];
                const newRedoStack = currentPage.redoStack.slice(0, -1);
                const newUndoStack = [...currentPage.undoStack, lastOperation];

                newPages.set(currentActivePage, {
                  ...currentPage,
                  undoStack: newUndoStack,
                  redoStack: newRedoStack
                });
              }
            }

            return { ...prev, pages: newPages };
          });
        }
      }
      // Handle page state sync from parent to iframe
      else if (event.data.type === 'SYNC_PAGE_STATE') {
        const { currentActivePage: newCurrentActivePage, pages: pagesArray } = event.data;

        if (newCurrentActivePage !== undefined) {
          setCurrentActivePage(newCurrentActivePage);
        }

        if (pagesArray) {
          // Merge serialized data with existing data to preserve function references
          const pagesMap = new Map<string, any>(pagesArray);

          setUndoRedoState(prev => {
            const mergedPages = new Map(prev.pages);

            pagesMap.forEach((serializedPageState, pageId) => {
              const existingPageState = mergedPages.get(pageId);

              if (existingPageState) {
                // Merge stacks while preserving existing operation functions
                const mergedPageState = {
                  ...serializedPageState,
                  undoStack: serializedPageState.undoStack.map((serializedEntry: any, index: number) => {
                    const existingEntry = existingPageState.undoStack[index];
                    return existingEntry ? {
                      ...serializedEntry,
                      operation: existingEntry.operation // Preserve existing function
                    } : serializedEntry;
                  }),
                  redoStack: serializedPageState.redoStack.map((serializedEntry: any, index: number) => {
                    const existingEntry = existingPageState.redoStack[index];
                    return existingEntry ? {
                      ...serializedEntry,
                      operation: existingEntry.operation // Preserve existing function
                    } : serializedEntry;
                  })
                };
                mergedPages.set(pageId, mergedPageState);
              } else {
                mergedPages.set(pageId, serializedPageState);
              }
            });

            return {
              ...prev,
              pages: mergedPages
            };
          });
        }
      }
    }
  };
};

