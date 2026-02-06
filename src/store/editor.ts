import { AgentStreamEvent } from '@/app/shop-manager/website/edit/[sessId]/types/builder';
import { atom } from 'jotai';



export interface SelectedNode {
  pageId: string;    // The ID of the page the node belongs to (e.g., 'home', 'about-us')
  nodeId: string;    // The ID of the node itself (e.g., 'main-header', 'site-footer')
  nodeName?: string; // Optional: A friendly name for display in the UI.
}

// Interface for tracking agent changes (create/delete/modify)
export interface AgentChange {
  id: string; // Unique ID for this change entry
  operation: 'create' | 'delete' | 'modify';
  targetScope: 'node' | 'page' | 'site';
  nodeId?: string; // Target node id for node-scoped changes
  nodeName?: string; // Optional friendly name
  originalNode?: any; // The complete node as it was before the change (for modify/delete)
  modifiedNode?: any; // The complete node as it is after the change (for modify/create)
  nodeData?: any; // Full node data for create operations (for redo)
  parentId?: string; // Parent node id (for create)
  propertyPath?: string; // Property that was modified (for modify)
  sectionId?: string; // Section id related to this change, if applicable
  sectionTitle?: string; // Optional section title metadata
  timestamp: number; // When the change was applied/recorded
}

// --- SELECTION & INTERACTION ATOMS ---

/** The current page being viewed/edited in the canvas. */
export const currentPageIdAtom = atom<string>(''); // Default to 'home' or get from router
export const currentPageNameAtom = atom<string>('');

/** An array of rich selection objects, supporting selections across multiple pages. */
export const selectedNodesAtom = atom<SelectedNode[]>([]);

/** The node ID the mouse is currently hovering over. For visual feedback. */
export const hoveredNodeIdAtom = atom<string | null>(null);

/** The current mode of the editor, for controlling mouse cursors and behavior. */
export const interactionModeAtom = atom<'select' | 'text-edit' | 'drag' | 'resize'>('select');

/** State for direct text editing on the canvas. */
export const textEditStateAtom = atom<{
  nodeId: string;
  propertyPath: string; // e.g., "params.items[0].label"
  initialValue: string;
} | null>(null);


// --- AGENT & CHANGE MANAGEMENT ATOMS ---

/** Is the AI agent currently processing a request? */
export const isAgentBusyAtom = atom<boolean>(false);
export const isKeeperBusyAtom = atom<boolean>(false);

/** The current session ID for the active agent stream. */
// export const agentSessionIdAtom = atom<string | null>(null);

/** The persistent agentChatId maintained across multi-turn conversations. */
// export const agentChatIdAtom = atom<string | null>(null);

// This ID represents the entire conversation and persists across turns.
export const conversationIdAtom = atom<string | null>(null);
export const keeperConversationIdAtom = atom<string | null>(null);

/** A log of all messages and steps from the current agent stream. For the chat UI. */
// export const agentStreamLogAtom = atom<Array<{
//   type: string; // e.g., 'step_started', 'step_progress'
//   message: string;
//   timestamp: number;
//   // ... other fields from your streaming spec
// }>>([]);

export const agentStreamLogAtom = atom<AgentStreamEvent[]>([]);

/** Chat debug mode toggle for showing raw vs processed responses */
export const chatDebugModeAtom = atom<'off' | 'raw'>('off');

/** Layout debug mode toggle for showing raw vs processed page structure */
export const layoutDebugModeAtom = atom<'off' | 'raw'>('off');

// --- UNDO/REDO CONTEXT ATOM ---
/** Shared context for useUndoRedo hook instances */
export const undoRedoContextAtom = atom<any>({}); 

export const changesAtom = atom<AgentChange[]>([]); 

// --- KEEPER ACTION LIFECYCLE TYPES ---

/** The lifecycle status of an action from suggestion to completion */
export type ActionStatus =
  | 'suggested'     // Parsed from the stream, waiting for the backend's validation command.
  | 'validated'     // Backend command received, payload checked, awaiting user approval.
  | 'executing'     // User clicked "Accept", and the real API call is in flight.
  | 'completed'     // The real API call succeeded.
  | 'failed'        // The real API call failed.
  | 'rejected';     // User clicked "Reject", action will not be executed.

/** Interface for tracking pending actions that need user approval */
export interface PendingAction {
  tempId: string; // A unique ID generated on the client (e.g., `temp-${Date.now()}`)
  actionId?: string; // The final ID from the backend's `EXECUTE_ACTION` command.
  toolName: string;
  payload: any; // The streaming, progressively-filled payload from `action_json`.
  status: ActionStatus;

  // This object will only be populated after the user clicks "Accept".
  executionResult?: {
    success: boolean;
    message: string;
  };
}

/** Atom for managing pending actions that need user approval */
export const pendingActionsAtom = atom<PendingAction[]>([]); 
