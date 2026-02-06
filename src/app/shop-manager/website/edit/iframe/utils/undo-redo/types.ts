import { SiteSettings } from "@/OSDL/OSDL.types";

// Core undo/redo types
export interface UndoRedoState {
  pages: Map<string, PageUndoRedoState>;
  currentPageId: string;
  isProcessing: boolean;
}

export interface PageUndoRedoState {
  undoStack: UndoRedoEntry[];
  redoStack: UndoRedoEntry[];
  lastSavedAt: number;
}

export interface UndoRedoEntry {
  operation: UNREObjectInterface;
  metadata?: Record<string, any>;
}

export interface processChangesOptions {
  mergeThreshold: number; // milliseconds
  maxBatchSize: number;
  enableAutoMerge: boolean;
}

// Parent communication types
export interface UndoRedoParentMessage {
  type: 'UNDO_REDO_STATE_CHANGED' | 'UNDO_REDO_OPERATION' | 'CHANGE_BATCH_READY' | 'ADD_TO_UNDO_STACK';
  payload: {
    currentPageUndoCount: number;
    currentPageRedoCount: number;
    currentPageId: string;
    allPagesWithChanges: string[];
    hasUnsavedChanges: boolean;
    lastOperation?: string;
  };
}

// UNRE Object types
export type UNREOperationType = 'create_node' | 'modify_node' | 'delete_node' | 'modify_site_settings' | 'agent_change_added' | 'agent_change_rejected' | 'agent_change_kept';


export type executionContextType = 'parent' | 'iframe';

export interface UNREObjectInterface {
  undo(metadata: any, context: any,): Promise<void> | void;
  redo(metadata: any, context: any): Promise<void> | void;
  type: UNREOperationType; // operation type
  metadata: Record<string, any>; // all data stored here
  executionContext: executionContextType;

  // Callback IDs for cross-context execution
  undoCallbackId?: string;
  redoCallbackId?: string;
}

// Hook return types
export interface UseUndoRedoReturn {
  // State
  currentPageUndoStack: UndoRedoEntry[];
  currentPageRedoStack: UndoRedoEntry[];
  canUndo: boolean;
  canRedo: boolean;
  isProcessing: boolean;
  currentPageId: string;
  allPagesWithChanges: string[];

  // Current page awareness
  currentActivePage: string;

  // Actions
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  addToUndoStack: (operation: UNREObjectInterface) => void;

  // Page management
  setCurrentPage: (pageId: string) => void;
  clearPageStacks: (pageId: string) => void;
  clearAllStacks: () => void;

  // Internal state setters (for advanced usage)
  setUndoRedoState: React.Dispatch<React.SetStateAction<UndoRedoState>>;
  getCurrentPageStacks: () => { undoStack: UndoRedoEntry[]; redoStack: UndoRedoEntry[] };
  getAllPagesWithChanges: () => string[];
}
