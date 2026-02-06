// Export the main hook
export { useUndoRedo } from './useUndoRedo';

// Export the core undo/redo functions
export { undo, redo, undoSiteSettings, redoSiteSettings } from './undo-redo';

// Export all types
export type {
  UndoRedoState,
  PageUndoRedoState,
  UndoRedoEntry,
  processChangesOptions,
  UndoRedoParentMessage,
  UNREOperationType,
  UNREObjectInterface,
  UseUndoRedoReturn
} from './types';

// Export the TreeOperationDeps interface from undo-redo
export type { TreeOperationDeps } from './undo-redo';

// Export parent communication utilities
export { isInParent, sendToIframe, syncStateToParent } from './parentCommunication';



