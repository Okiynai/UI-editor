import { PageDefinition } from "@/OSDL/OSDL.types";
import { UNREObjectInterface, TreeOperationDeps } from "../undo-redo";
import { undo, redo } from "../undo-redo";

export interface MoveOSDLNodeDependencies {
  setPageDefinition: (pageDefinition: PageDefinition | ((prev: PageDefinition | null) => PageDefinition | null)) => void;
  addToUndoStack: (operation: UNREObjectInterface) => void;
}

export type MoveDirection = 'up' | 'down';

const isOutOfFlowNode = (node: any): boolean => {
  const position = node?.positioning?.position;
  return position === 'absolute' || position === 'fixed';
};

const moveOSDLNode = (
  nodeId: string,
  direction: MoveDirection,
  deps: MoveOSDLNodeDependencies
) => {
  console.log(`[IframePage] Moving OSDL node ${nodeId} ${direction}`);
  
  let undoOperation: UNREObjectInterface | null = null;
  let originalPageDef: any = null;
  let modifiedPageDef: any = null;
  let didMove = false;

  deps.setPageDefinition(prevPageDef => {
    if (!prevPageDef) return prevPageDef;

    // Capture the original page definition state
    originalPageDef = JSON.parse(JSON.stringify(prevPageDef));

    const newPageDef = JSON.parse(JSON.stringify(prevPageDef));

    const findAndMoveNode = (nodes: any[], depth: number = 0, parentId: string | 'root' = 'root'): boolean => {
      console.log(`[IframePage] Searching for move at depth ${depth}, found ${nodes.length} nodes`);

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        console.log(`[IframePage] Checking node for move at depth ${depth}:`, node.id);

        if (node.id === nodeId) {
          if (isOutOfFlowNode(node)) {
            console.log(`[IframePage] Node "${nodeId}" is out-of-flow; skipping reorder`);
            return true;
          }

          // Match side-panel ordering behavior: move among in-flow siblings sorted by order.
          const sortedByOrder = [...nodes]
            .filter((sibling: any) => !isOutOfFlowNode(sibling))
            .sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0));
          const pos = sortedByOrder.findIndex((n: any) => n.id === nodeId);
          if (pos === -1) {
            console.warn(`[IframePage] Node ${nodeId} not found in sorted siblings for move`);
            return true;
          }

          if (direction === 'up') {
            if (pos === 0) {
              console.log(`[IframePage] Cannot move node "${nodeId}" up - already at the top by order`);
              return true;
            }
            const above = sortedByOrder[pos - 1] as any;
            const currentOrder = (node as any).order ?? 0;
            const aboveOrder = above?.order ?? 0;
            (node as any).order = aboveOrder;
            above.order = currentOrder;
            didMove = true;
            console.log(`[IframePage] Swapped order (up): ${nodeId} ${currentOrder} <-> ${above.id} ${aboveOrder}`);
          } else {
            if (pos === sortedByOrder.length - 1) {
              console.log(`[IframePage] Cannot move node "${nodeId}" down - already at the bottom by order`);
              return true;
            }
            const below = sortedByOrder[pos + 1] as any;
            const currentOrder = (node as any).order ?? 0;
            const belowOrder = below?.order ?? 0;
            (node as any).order = belowOrder;
            below.order = currentOrder;
            didMove = true;
            console.log(`[IframePage] Swapped order (down): ${nodeId} ${currentOrder} <-> ${below.id} ${belowOrder}`);
          }

          return true;
        }

        // Check children recursively
        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          console.log(`[IframePage] Recursing into children of node ${node.id} for move at depth ${depth}`);
          if (findAndMoveNode(node.children, depth + 1, node.id)) {
            return true;
          }
        }
      }
      return false;
    };

    if (findAndMoveNode(newPageDef.nodes)) {
      if (!didMove) {
        return prevPageDef;
      }
      // Capture the modified page definition state
      modifiedPageDef = JSON.parse(JSON.stringify(newPageDef));
      return newPageDef;
    } else {
      console.error(`[IframePage] Node with id "${nodeId}" not found for move`);
      return prevPageDef;
    }
  });

  // Create undo operation outside of setPageDefinition to avoid React re-render issues
  if (originalPageDef && modifiedPageDef) {
    undoOperation = {
      type: 'modify_node',
      executionContext: 'iframe',
      metadata: {
        operation: 'move', // Special operation type for moves
        nodeId,
        nodeName: nodeId, // We don't have the name here, but it's not critical
        originalPageDef: originalPageDef.nodes, // Store entire original tree
        modifiedPageDef: modifiedPageDef.nodes, // Store entire modified tree
        timestamp: Date.now(),
      },
      undo: async (metadata: any, deps: any) => {
        // Create TreeOperationDeps object with setPageDefinition
        const treeDeps: TreeOperationDeps = { setPageDefinition: deps.setPageDefinition };
        // For move operations, restore the entire original page definition
        deps.setPageDefinition((prev: any) => ({
          ...prev,
          nodes: metadata.originalPageDef
        }));
        return Promise.resolve();
      },
      redo: async (metadata: any, deps: any) => {
        // Create TreeOperationDeps object with setPageDefinition
        const treeDeps: TreeOperationDeps = { setPageDefinition: deps.setPageDefinition };
        // For move operations, restore the entire modified page definition
        deps.setPageDefinition((prev: any) => ({
          ...prev,
          nodes: metadata.modifiedPageDef
        }));
        return Promise.resolve();
      }
    };
  }

  // Add to undo stack outside of the state setter to avoid React re-render issues
  if (undoOperation) {
    deps.addToUndoStack(undoOperation);
  }
};

export default moveOSDLNode; 
