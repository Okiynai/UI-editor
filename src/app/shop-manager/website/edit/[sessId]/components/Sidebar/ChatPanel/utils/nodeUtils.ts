// Utility functions for finding and working with nodes in page definitions

export function findNodeRef(nodes: any[], nodeId: string): any | null {
  // Handle null, undefined, or empty nodes array
  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    return null;
  }

  // DFS with path cloning: clones nodes and their children arrays along the path
  const stack: Array<{ parentArray: any[]; index: number }> = [];

  // Iterate each root-level node
  for (let i = 0; i < nodes.length; i++) {
    const found = dfsClone(nodes, i, nodeId, stack);
    if (found) return found;
  }
  return null;
}

function dfsClone(parentArray: any[], index: number, nodeId: string, stack: Array<{ parentArray: any[]; index: number }>): any | null {
  const originalNode = parentArray[index];
  if (!originalNode || typeof originalNode !== 'object') return null;

  // Clone this node and replace it in the parent array to maintain immutability
  const clonedNode = { ...originalNode };
  parentArray[index] = clonedNode;

  if (clonedNode.id === nodeId) {
    return clonedNode;
  }

  // Traverse children if present
  const children = clonedNode.children;
  if (Array.isArray(children) && children.length > 0) {
    // Clone children array reference before descending
    clonedNode.children = [...children];
    for (let ci = 0; ci < clonedNode.children.length; ci++) {
      const found = dfsClone(clonedNode.children, ci, nodeId, stack);
      if (found) return found;
    }
  }

  return null;
}
