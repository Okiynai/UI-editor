import React from "react";
import { Field, RendererProps } from "../types";
import { Node } from "@/OSDL/OSDL.types";
import { defaultReader } from "../utils/defaults/defaultReader";
import { defaultMutatorsCreator } from "../utils/defaults/defaultMutatorsCreator";
import { ArrowUp, ArrowDown, Info } from "lucide-react";
import { Tooltip } from "@/app/shop-manager/website/edit/[sessId]/components/shared/Tooltip";

// Helper: find siblings for a node id within pageDefinitionNodes tree
function findSiblingsForNode(nodeId: string, nodes: Node[] | null | undefined): Node[] | null {
  if (!nodes || nodes.length === 0) return null;
  for (const node of nodes) {
    if ((node as any).children && Array.isArray((node as any).children)) {
      const children = (node as any).children as Node[];
      if (children.some((c) => c.id === nodeId)) {
        return children;
      }
      const found = findSiblingsForNode(nodeId, children);
      if (found) return found;
    }
  }
  return null;
}

// Helper: find parent section for a node id within pageDefinitionNodes tree
function findParentSection(nodeId: string, nodes: Node[] | null | undefined): Node | null {
  if (!nodes || nodes.length === 0) return null;
  for (const node of nodes) {
    if (node.type === 'section' && 'children' in node && node.children) {
      // Check if this section contains the target node
      if (node.children.some(child => child.id === nodeId)) {
        return node;
      }
      // Recursively search in children
      const found = findParentSection(nodeId, node.children as Node[]);
      if (found) return found;
    }
  }
  return null;
}

// Helper: check if atom is the only child in its parent section
function isOnlyChildInSection(nodeId: string, nodes: Node[] | null | undefined): boolean {
  const parentSection = findParentSection(nodeId, nodes);
  if (!parentSection || !('children' in parentSection) || !parentSection.children) {
    return false;
  }
  
  // Filter out out-of-flow children (absolute/fixed positioned)
  const inFlowChildren = parentSection.children.filter((child: any) => {
    const pos = child?.positioning?.position;
    return !(pos === 'absolute' || pos === 'fixed');
  });
  
  return inFlowChildren.length === 1 && inFlowChildren[0].id === nodeId;
}

// Helper: out-of-flow positioning check (absolute/fixed) from root positioning
const isOutOfFlow = (n: any): boolean => {
  const pos = n?.positioning?.position;
  return pos === 'absolute' || pos === 'fixed';
};

export const orderingField: Field = {
  id: "ordering",
  rendererKey: "ordering",
  showOverrides: true,
  // Do not render ordering when node is out of normal flow
  shouldRender: (node) => {
    const pos = (node as any)?.positioning?.position;
    return !(pos === 'absolute' || pos === 'fixed');
  },

  reader: (node: Node, siteSettings?: any, pageDefinitionNodes?: Node[] | null) => {
    const base = defaultReader({ type: "number", dataPath: "order" }, node, siteSettings);
    const allSiblings = findSiblingsForNode(node.id, pageDefinitionNodes) || pageDefinitionNodes || [];
    const inFlowSiblings = (allSiblings as any[]).filter((s) => !isOutOfFlow(s));
    
    // Check if this atom is the only child in its parent section
    const isOnlyChild = isOnlyChildInSection(node.id, pageDefinitionNodes);
    const parentSection = isOnlyChild ? findParentSection(node.id, pageDefinitionNodes) : null;
    
    // If it's the only child, we need to work with the parent's siblings instead
    let targetSiblings = inFlowSiblings;
    let targetNodeId = node.id;
    let targetNodeType = node.type;
    
    if (isOnlyChild && parentSection) {
      // Find the parent's siblings (the parent section's siblings)
      const parentSiblings = findSiblingsForNode(parentSection.id, pageDefinitionNodes) || [];
      const inFlowParentSiblings = parentSiblings.filter((s) => !isOutOfFlow(s));
      targetSiblings = inFlowParentSiblings;
      targetNodeId = parentSection.id;
      targetNodeType = parentSection.type;
    }

    return {
      ...base,
      nodeId: targetNodeId,
      nodeType: targetNodeType,
      siblings: targetSiblings,
      isOnlyChild,
      originalNodeId: node.id,
      parentSectionId: parentSection?.id,
    };
  },

  createMutators: (
    node: Node,
    onIframeUpdate: (nodeId: string, changes: Record<string, any>) => void,
    _interactionsInlineStyle?: string,
    pageDefinitionNodes?: Node[] | null,
  ) => {
    const base = defaultMutatorsCreator({ type: "number", dataPath: "order" }, node, onIframeUpdate);

    // Check if this atom is the only child in its parent section
    const isOnlyChild = isOnlyChildInSection(node.id, pageDefinitionNodes);
    const parentSection = isOnlyChild ? findParentSection(node.id, pageDefinitionNodes) : null;

    const getSortedSiblings = (): Node[] => {
      let raw: Node[];
      
      if (isOnlyChild && parentSection) {
        // Work with parent's siblings
        raw = findSiblingsForNode(parentSection.id, pageDefinitionNodes) || pageDefinitionNodes || [];
      } else {
        // Work with atom's siblings
        raw = findSiblingsForNode(node.id, pageDefinitionNodes) || pageDefinitionNodes || [];
      }
      
      const inFlow = (raw as any[]).filter((s) => !isOutOfFlow(s));
      return [...inFlow].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    };

    const getTargetNodeId = (): string => {
      return isOnlyChild && parentSection ? parentSection.id : node.id;
    };

    return {
      ...base,

      moveUp: () => {
        const siblings = getSortedSiblings();
        const targetId = getTargetNodeId();
        const idx = siblings.findIndex((s) => s.id === targetId);
        if (idx <= 0) return;
        const above = siblings[idx - 1] as any;
        const current = siblings[idx] as any;
        onIframeUpdate(current.id, { order: above.order });
        onIframeUpdate(above.id, { order: current.order });
      },

      moveDown: () => {
        const siblings = getSortedSiblings();
        const targetId = getTargetNodeId();
        const idx = siblings.findIndex((s) => s.id === targetId);
        if (idx === -1 || idx >= siblings.length - 1) return;
        const below = siblings[idx + 1] as any;
        const current = siblings[idx] as any;
        onIframeUpdate(current.id, { order: below.order });
        onIframeUpdate(below.id, { order: current.order });
      },

      normalizeOrder: () => {
        const siblings = getSortedSiblings();
        siblings.forEach((s, i) => {
          const currentOrder = (s as any).order ?? i;
          if (currentOrder !== i) {
            onIframeUpdate(s.id, { order: i });
          }
        });
      },
    };
  },
};

export default orderingField;

// Minimal custom renderer: label with Up/Down buttons on the same row
export const OrderingRenderer: React.FC<RendererProps<any, any, Record<string, never>>> = ({ data, mutations, pageDefinitionNodes }) => {
  const nodeId: string | undefined = data?.nodeId;
  const isOnlyChild: boolean = data?.isOnlyChild || false;
  const originalNodeId: string | undefined = data?.originalNodeId;
  const parentSectionId: string | undefined = data?.parentSectionId;

  // Prefer reader-provided siblings; if absent/empty, derive from pageDefinitionNodes and filter in-flow
  let siblings: Node[] = Array.isArray(data?.siblings) && data.siblings.length
    ? [...data.siblings]
    : [];

  if ((!siblings || siblings.length === 0) && nodeId) {
    const raw = findSiblingsForNode(nodeId, pageDefinitionNodes) || pageDefinitionNodes || [];
    const arr = Array.isArray(raw) ? (raw as Node[]) : [];
    siblings = arr.filter((s: any) => !isOutOfFlow(s));
  }

  const sorted = siblings.sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0));
  const idx = nodeId ? sorted.findIndex((s) => s.id === nodeId) : -1;

  const canMoveUp = idx > 0;
  const canMoveDown = idx !== -1 && idx < sorted.length - 1;

  const handleUp = () => {
    if (canMoveUp && typeof mutations?.moveUp === 'function') {
      mutations.moveUp();
    }
  };
  const handleDown = () => {
    if (canMoveDown && typeof mutations?.moveDown === 'function') {
      mutations.moveDown();
    }
  };

  // Determine the label based on whether we're working on behalf of the parent
  const getLabel = () => {
    if (isOnlyChild) {
      return "Order (Parent)";
    }
    return "Order";
  };

  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <label className="text-sm font-medium text-gray-900">
            {getLabel()}
          </label>
          {isOnlyChild && (
            <Tooltip 
              content="This element is the only child in its section. Order controls will work on the parent section instead."
              delay={0}
            >
              <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleUp}
            className={`p-1 rounded hover:bg-gray-100 ${canMoveUp ? 'text-gray-700' : 'text-gray-300 disabled:pointer-events-none'}`}
            aria-label="Move up"
            title={isOnlyChild ? "Move parent section up" : "Move up"}
            disabled={!canMoveUp}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDown}
            className={`p-1 rounded hover:bg-gray-100 ${canMoveDown ? 'text-gray-700' : 'text-gray-300 disabled:pointer-events-none'}`}
            aria-label="Move down"
            title={isOnlyChild ? "Move parent section down" : "Move down"}
            disabled={!canMoveDown}
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

