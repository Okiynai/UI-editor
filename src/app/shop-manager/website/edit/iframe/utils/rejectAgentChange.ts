import { AgentChange } from '@/store/editor';
import { PageDefinition } from '@/OSDL/OSDL.types';

export interface AgentChangeDeps {
  setPageDefinition: (updater: (prev: PageDefinition | null) => PageDefinition | null) => void;
}

export function undoAgentChange(change: AgentChange, deps: AgentChangeDeps) {
  switch (change.operation) {
    case 'modify': {
      if (!change.nodeId || !change.originalNode) return;
      deps.setPageDefinition((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        const updateNodes = (nodes: any[]): any[] => {
          return nodes.map((node) => {
            if (node.id === change.nodeId) {
              return change.originalNode;
            }
            if (node.children && Array.isArray(node.children)) {
              return { ...node, children: updateNodes(node.children) };
            }
            return node;
          });
        };
        next.nodes = updateNodes(next.nodes);
        return next;
      });
      break;
    }
    case 'create': {
      if (!change.nodeId) return;
      deps.setPageDefinition((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        const removeNodeFromArray = (nodes: any[]): boolean => {
          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.id === change.nodeId) {
              nodes.splice(i, 1);
              return true;
            }
            if (node.children && Array.isArray(node.children) && removeNodeFromArray(node.children)) {
              return true;
            }
          }
          return false;
        };
        removeNodeFromArray(next.nodes);
        return next;
      });
      break;
    }
    case 'delete': {
      if (!change.originalNode) return;
      deps.setPageDefinition((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        const { originalNode, parentId } = change;
        if (!parentId || parentId === 'root') {
          next.nodes.push(originalNode);
          return next;
        }
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
        const parent = findById(next.nodes, parentId);
        if (parent) {
          if (!Array.isArray(parent.children)) parent.children = [];
          parent.children.push(originalNode);
        } else {
          // fallback to root
          next.nodes.push(originalNode);
        }
        return next;
      });
      break;
    }
    default:
      break;
  }
}

export function redoAgentChange(change: AgentChange, deps: AgentChangeDeps) {
  // For redo, we re-apply the change (opposite of undo)
  switch (change.operation) {
    case 'modify': {
      if (!change.nodeId || !change.modifiedNode) {
        console.warn('[IframePage] Redo modify: missing nodeId or modifiedNode data');
        return;
      }
      deps.setPageDefinition((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        const updateNodes = (nodes: any[]): any[] => {
          return nodes.map((node) => {
            if (node.id === change.nodeId) {
              return change.modifiedNode; // Apply the modified state
            }
            if (node.children && Array.isArray(node.children)) {
              return { ...node, children: updateNodes(node.children) };
            }
            return node;
          });
        };
        next.nodes = updateNodes(next.nodes);
        return next;
      });
      break;
    }
    case 'create': {
      if (!change.nodeData || !change.parentId) {
        console.warn('[IframePage] Redo create: missing nodeData or parentId');
        return;
      }
      deps.setPageDefinition((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        const nodeToCreate = JSON.parse(JSON.stringify(change.nodeData));
        
        if (change.parentId === 'root') {
          // Add to root level
          next.nodes.push(nodeToCreate);
        } else {
          // Find parent and add to its children
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
          const parent = findById(next.nodes, change.parentId!);
          if (parent) {
            if (!Array.isArray(parent.children)) parent.children = [];
            parent.children.push(nodeToCreate);
          } else {
            // Fallback to root
            next.nodes.push(nodeToCreate);
          }
        }
        return next;
      });
      break;
    }
    case 'delete': {
      if (!change.nodeId) {
        console.warn('[IframePage] Redo delete: missing nodeId');
        return;
      }
      deps.setPageDefinition((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        const removeNodeFromArray = (nodes: any[]): boolean => {
          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.id === change.nodeId) {
              nodes.splice(i, 1);
              return true;
            }
            if (node.children && Array.isArray(node.children) && removeNodeFromArray(node.children)) {
              return true;
            }
          }
          return false;
        };
        removeNodeFromArray(next.nodes);
        return next;
      });
      break;
    }
    default:
      break;
  }
}