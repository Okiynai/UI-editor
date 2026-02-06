import { PageDefinition } from "@/OSDL/OSDL.types";
import { AgentChange } from "@/store/editor";
import { UNREObjectInterface } from "../undo-redo";
import { undo, redo } from "../undo-redo";

export interface DeleteOSDLNodeDependencies {
  setPageDefinition: (pageDefinition: PageDefinition | ((prev: PageDefinition | null) => PageDefinition | null)) => void;
  addToUndoStack: (operation: UNREObjectInterface) => void;
}

const deleteOSDLNode = (
  nodeId: string,
  deps: DeleteOSDLNodeDependencies,
  isAgentRequest?: boolean
): { success: boolean; error?: string; change?: AgentChange | null } => {
  console.log('[IframePage] Deleting OSDL node:', nodeId);

  let success = false;
  let error: string | undefined;
  let localChange: AgentChange | null = null;
  let undoOperation: UNREObjectInterface | null = null;

  deps.setPageDefinition(prevPageDef => {
    if (!prevPageDef) return prevPageDef;
    
    // Deep clone the page definition
    const newPageDef = JSON.parse(JSON.stringify(prevPageDef));
    
    let deletedNodeSnapshot: any | null = null;
    let deletedNodeParentId: string | 'root' | null = null;

    // Recursive function to find and remove node
    const removeNodeFromArray = (nodes: any[], depth: number = 0, parentId: string | 'root' = 'root'): boolean => {
      console.log(`[IframePage] Searching at depth ${depth}, found ${nodes.length} nodes`);
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        console.log(`[IframePage] Checking node at depth ${depth}:`, node.id);
        
        if (node.id === nodeId) {
          // Found the node to delete; keep snapshot for revert
          deletedNodeSnapshot = JSON.parse(JSON.stringify(node));
          deletedNodeParentId = parentId;
          nodes.splice(i, 1);
          console.log(`[IframePage] Deleted node "${nodeId}" at depth ${depth}`);
          return true;
        }
        
        // Check children recursively
        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          console.log(`[IframePage] Recursing into children of node ${node.id} at depth ${depth}`);
          if (removeNodeFromArray(node.children, depth + 1, node.id)) {
            return true;
          }
        }
      }
      return false;
    };
    
    // Try to remove from root nodes
    if (removeNodeFromArray(newPageDef.nodes)) {
      // Record pending change for 'delete'
      if (deletedNodeSnapshot) {
        const change: AgentChange = {
          id: crypto.randomUUID(),
          operation: 'delete',
          targetScope: 'node',
          nodeId,
          nodeName: deletedNodeSnapshot.name || nodeId,
          originalNode: deletedNodeSnapshot, // Store the deleted node for redo
          nodeData: JSON.parse(JSON.stringify(deletedNodeSnapshot)), // Full node data for redo
          parentId: deletedNodeParentId || undefined,
          sectionId: nodeId,
          timestamp: Date.now(),
        };
        localChange = change;
        
        console.log('[IframePage] Deleting OSDL node: twice?');
        // Create undo operation only if this is not an agent request
        if (!isAgentRequest) {
          undoOperation = {
            type: 'delete_node',
            executionContext: 'iframe',
            metadata: {
              operation: 'delete',
              nodeId,
              nodeName: deletedNodeSnapshot.name || nodeId,
              originalNode: deletedNodeSnapshot,
              parentId: deletedNodeParentId || 'root',
              timestamp: Date.now(),
            },
            undo: async (metadata: any, context: any) => {
              return undo(metadata, context);
            },
            redo: async (metadata: any, context: any) => {
              return redo(metadata, context);
            }
          };
        }
      }
      success = true;
      return newPageDef;
    } else {
      console.error(`[IframePage] Node with id "${nodeId}" not found for deletion`);
      error = `Node with id "${nodeId}" not found for deletion`;
      return prevPageDef;
    }
  });

  // Add to undo stack outside of the state setter to avoid React re-render issues
  if (undoOperation && !isAgentRequest) {
    deps.addToUndoStack(undoOperation);
  }

  return { success, error, change: localChange };
};

export default deleteOSDLNode; 