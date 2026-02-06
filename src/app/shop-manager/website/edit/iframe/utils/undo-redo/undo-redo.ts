import { PageDefinition } from '@/OSDL/OSDL.types';

export interface TreeOperationDeps {
  setPageDefinition: (pageDefinition: PageDefinition | ((prev: PageDefinition | null) => PageDefinition | null)) => void;
}

export function undo(metadata: any, deps: TreeOperationDeps): Promise<void> {
  return new Promise<void>((resolve) => {
    deps.setPageDefinition((prevPageDef: PageDefinition | null) => {
      if (!prevPageDef) {
        resolve();
        return prevPageDef;
      }

      const newPageDef = JSON.parse(JSON.stringify(prevPageDef));

      // Handle different operation types
      switch (metadata.operation) {
        case 'create': {
          // Remove the created node
          const removeNode = (nodes: any[]): boolean => {
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].id === metadata.nodeId) {
                nodes.splice(i, 1);
                return true;
              }
              if (nodes[i].children && removeNode(nodes[i].children)) {
                return true;
              }
            }
            return false;
          };
          removeNode(newPageDef.nodes);
          break;
        }
        case 'modify': {
          // Restore the original node
          const updateNodes = (nodes: any[]): any[] => {
            return nodes.map((node) => {
              if (node.id === metadata.nodeId) {
                return metadata.originalNode;
              }
              if (node.children && Array.isArray(node.children)) {
                return { ...node, children: updateNodes(node.children) };
              }
              return node;
            });
          };
          newPageDef.nodes = updateNodes(newPageDef.nodes);
          break;
        }
        case 'delete': {
          // Recreate the deleted node
          const { originalNode, parentId } = metadata;
          if (!parentId || parentId === 'root') {
            newPageDef.nodes.push(originalNode);
          } else {
            const findById = (nodes: any[], id: string): any | null => {
              for (const n of nodes) {
                if (n.id === id) return n;
                if (n.children) {
                  const f = findById(n.children, id);
                  if (f) return f;
                }
              }
              return null;
            };
            const parent = findById(newPageDef.nodes, parentId);
            if (parent) {
              if (!Array.isArray(parent.children)) parent.children = [];
              parent.children.push(originalNode);
            } else {
              // fallback to root
              newPageDef.nodes.push(originalNode);
            }
          }
          break;
        }
      }

      resolve();
      return newPageDef;
    });
  });
}

export function redo(metadata: any, deps: TreeOperationDeps): Promise<void> {
  return new Promise<void>((resolve) => {
    deps.setPageDefinition((prevPageDef: PageDefinition | null) => {
      if (!prevPageDef) {
        resolve();
        return prevPageDef;
      }

      const newPageDef = JSON.parse(JSON.stringify(prevPageDef));

      // Handle different operation types
      switch (metadata.operation) {
        case 'create': {
          // Recreate the node
          const nodeToRecreate = JSON.parse(JSON.stringify(metadata.nodeData));
          nodeToRecreate.id = metadata.nodeId;
          
          if (metadata.parentId === 'root') {
            newPageDef.nodes.push(nodeToRecreate);
          } else {
            const addNode = (nodes: any[], targetParentId: string, nodeToAdd: any): boolean => {
              for (const currentNode of nodes) {
                if (currentNode.id === targetParentId) {
                  if (!currentNode.children) currentNode.children = [];
                  currentNode.children.push(nodeToAdd);
                  return true;
                }
                if (currentNode.children && addNode(currentNode.children, targetParentId, nodeToAdd)) {
                  return true;
                }
              }
              return false;
            };
            addNode(newPageDef.nodes, metadata.parentId, nodeToRecreate);
          }
          break;
        }
        case 'modify': {
          // Apply the modification again
          const updateNodes = (nodes: any[]): any[] => {
            return nodes.map((node) => {
              if (node.id === metadata.nodeId) {
                return metadata.modifiedNode;
              }
              if (node.children && Array.isArray(node.children)) {
                return { ...node, children: updateNodes(node.children) };
              }
              return node;
            });
          };
          newPageDef.nodes = updateNodes(newPageDef.nodes);
          break;
        }
        case 'delete': {
          // Remove the node again
          const removeNode = (nodes: any[]): boolean => {
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].id === metadata.nodeId) {
                nodes.splice(i, 1);
                return true;
              }
              if (nodes[i].children && removeNode(nodes[i].children)) {
                return true;
              }
            }
            return false;
          };
          removeNode(newPageDef.nodes);
          break;
        }
      }

      resolve();
      return newPageDef;
    });
  });
}

// ===========================================
// SITE SETTINGS UNDO/REDO OPERATIONS
// ===========================================

/**
 * Undo function for site settings modifications
 * Restores the original site settings state
 */
export function undoSiteSettings(metadata: any, context: any): Promise<void> {
  return new Promise<void>((resolve) => {
    // Restore the original site settings using context
    if (context?.setEditableSiteSettings) {
      context.setEditableSiteSettings(metadata.originalSettings);
    }
    resolve();
  });
}

/**
 * Redo function for site settings modifications
 * Applies the modified site settings again
 */
export function redoSiteSettings(metadata: any, context: any): Promise<void> {
  return new Promise<void>((resolve) => {
    // Apply the modified site settings using context
    if (context?.setEditableSiteSettings) {
      context.setEditableSiteSettings(metadata.modifiedSettings);
    }
    resolve();
  });
}
