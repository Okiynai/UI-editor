import { PageDefinition } from "@/OSDL/OSDL.types";
import { UNREObjectInterface } from "../undo-redo";
import { undo, redo } from "../undo-redo";

export interface DuplicateOSDLNodeDependencies {
  setPageDefinition: (pageDefinition: PageDefinition | ((prev: PageDefinition | null) => PageDefinition | null)) => void;
  addToUndoStack: (operation: UNREObjectInterface) => void;
}

const duplicateOSDLNode = (
  nodeId: string, 
  deps: DuplicateOSDLNodeDependencies
) => {
  console.log('[IframePage] Duplicating OSDL node:', nodeId);
  
  let undoOperation: UNREObjectInterface | null = null;
  
  deps.setPageDefinition(prevPageDef => {
    if (!prevPageDef) return prevPageDef;
    const newPageDef = JSON.parse(JSON.stringify(prevPageDef));
    
    const findAndDuplicateNode = (nodes: any[], depth: number = 0, parentId: string | 'root' = 'root'): boolean => {
      console.log(`[IframePage] Searching for duplication at depth ${depth}, found ${nodes.length} nodes`);
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        console.log(`[IframePage] Checking node for duplication at depth ${depth}:`, node.id);
        
        if (node.id === nodeId) {
          const duplicatedNode = JSON.parse(JSON.stringify(node));
          
          const assignNewIds = (n: any) => {
            n.id = crypto.randomUUID();
            if (n.children && Array.isArray(n.children)) {
              n.children.forEach(assignNewIds);
            }
          };
          assignNewIds(duplicatedNode);
          
          nodes.splice(i + 1, 0, duplicatedNode);
          console.log(`[IframePage] Duplicated node "${nodeId}" with new ID "${duplicatedNode.id}" at depth ${depth}`);
          
          // Create undo operation for successful duplication
          undoOperation = {
            type: 'create_node',
            executionContext: 'iframe',
            metadata: {
              operation: 'create',
              nodeId: duplicatedNode.id,
              nodeName: duplicatedNode.name || duplicatedNode.id,
              parentId,
              nodeType: duplicatedNode.type,
              timestamp: Date.now(),
              // Store the full node data for redo
              nodeData: JSON.parse(JSON.stringify(duplicatedNode))
            },
            undo: async (metadata: any, context: any) => {
              return undo(metadata, context);
            },
            redo: async (metadata: any, context: any) => {
              return redo(metadata, context);
            }
          };
          
          return true;
        }
        
        // Check children recursively
        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          console.log(`[IframePage] Recursing into children of node ${node.id} for duplication at depth ${depth}`);
          if (findAndDuplicateNode(node.children, depth + 1, node.id)) {
            return true;
          }
        }
      }
      return false;
    };
    
    if (findAndDuplicateNode(newPageDef.nodes)) {
      return newPageDef;
    } else {
      console.error(`[IframePage] Node with id "${nodeId}" not found for duplication`);
      return prevPageDef;
    }
  });

  // Add to undo stack outside of the state setter to avoid React re-render issues
  if (undoOperation) {
    deps.addToUndoStack(undoOperation);
  }
};

export default duplicateOSDLNode; 