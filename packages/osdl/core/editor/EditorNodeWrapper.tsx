'use client';

import React, { useCallback } from 'react';
import { useAtom } from 'jotai';
import {
  selectedNodesAtom,
  hoveredNodeIdAtom,
  interactionModeAtom,
  currentPageIdAtom,
  SelectedNode,
  textEditStateAtom,
} from '@/store/editor';
import { Node, PageDefinition, LayoutConfig } from '@/OSDL.types';
import NodeRenderer, { NodeRendererProps } from '@/osdl/NodeRenderer';
import { Edit, CopyPlus, Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useRef, useState, useEffect } from 'react';
import ComponentRegistry from '@/ComponentRegistry';

interface EditorNodeWrapperProps {
  nodeSchema: Node;
  setPageDefinition?: React.Dispatch<React.SetStateAction<PageDefinition | null>>;
  ChildRenderer?: React.ComponentType<NodeRendererProps>;
  isInspectMode?: boolean;
  editingSections?: Set<string>;
  onDuplicateNode?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onMoveNode?: (nodeId: string, direction: 'up' | 'down') => void;
  pageDefinition?: PageDefinition;
  parentTemplatingContext?: Record<string, any>;

  // Pass other NodeRenderer props through
  [key: string]: any;
}

// A helper to determine if a node is of a type that can be directly text-edited.
function isTextEditable(nodeSchema: Node): boolean {
  if (nodeSchema.type === 'atom') {
    return ['Text', 'Button', 'Input'].includes(nodeSchema.atomType);
  }
  return false;
}

// Helper function to detect if a layout is horizontal
function isHorizontalLayout(layout: LayoutConfig): boolean {
  // Check flex layout
  if (layout.mode === 'flex') {
    // Flex direction row or row-reverse indicates horizontal layout
    if (layout.direction === 'row' || layout.direction === 'row-reverse') {
      return true;
    }
    // If flexWrap is wrap or wrap-reverse, it's also horizontal
    if (layout.flexWrap === 'wrap' || layout.flexWrap === 'wrap-reverse') {
      return true;
    }
  }
  
  // Check grid layout
  if (layout.mode === 'grid') {
    // Grid auto-flow column indicates horizontal layout
    if (layout.gridAutoFlow === 'column' || layout.gridAutoFlow === 'column dense') {
      return true;
    }
  }
  
  // Default to vertical layout
  return false;
}

// Helper function to find the parent section of a node
function findParentSection(nodes: Node[], targetId: string): Node | null {
  for (const node of nodes) {
    if (node.type === 'section' && 'children' in node && node.children) {
      // Check if this section contains the target node
      if (node.children.some(child => child.id === targetId)) {
        return node;
      }
      // Recursively search in children
      const found = findParentSection(node.children as Node[], targetId);
      if (found) return found;
    }
  }
  return null;
}

let timeoutId: NodeJS.Timeout | null = null;


export const EditorNodeWrapper: React.FC<EditorNodeWrapperProps> = ({ nodeSchema, setPageDefinition, ChildRenderer, 
  isInspectMode = false, editingSections, onDuplicateNode, onDeleteNode, onMoveNode, ...props }) => {
  const [selectedNodes, setSelectedNodes] = useAtom(selectedNodesAtom);
  const [hoveredNodeId, setHoveredNodeId] = useAtom(hoveredNodeIdAtom);
  const [interactionMode, setInteractionMode] = useAtom(interactionModeAtom);
  const [textEditState, setTextEditState] = useAtom(textEditStateAtom);
  const [currentPageId] = useAtom(currentPageIdAtom);

  const isSelected = selectedNodes.some(
    (sel) => sel.pageId === currentPageId && sel.nodeId === nodeSchema.id
  );

  const isHovered = hoveredNodeId === nodeSchema.id; // Don't show hover if selected
  const isBeingEditedByAI = editingSections?.has(nodeSchema.id) || editingSections?.has(nodeSchema.name || '');
  // const isBeingEditedByAI = true;
 
  // NOTE: not sure if wel'll ever use this, but we might when the smart editor comes.
  const isBeingEdited =
    interactionMode === 'text-edit' &&
    textEditState?.nodeId === nodeSchema.id;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    // Check if the click target is part of the floating toolbar
    const target = e.target as HTMLElement;

    console.log('target', target, nodeSchema.id);
    if (target.closest('.floating-toolbar') || target.closest('.plus-button') || target.closest('[data-plus-modal]')) {
      return; // Don't handle clicks on toolbar elements, plus buttons, or modal
    }

    if (!isInspectMode || isBeingEditedByAI) return; // Only respond to clicks in inspect mode

    // Find the actual node that was clicked by traversing up the DOM tree
    let clickedNodeId = nodeSchema.id;
    let currentElement: HTMLElement | null = target;
    
    // Traverse up the DOM tree to find the closest element with data-osdl-id
    while (currentElement && currentElement !== document.body) {
      const osdlId = currentElement.getAttribute('data-osdl-id');
      if (osdlId) {
        clickedNodeId = osdlId;
        break;
      }
      currentElement = currentElement.parentElement;
    }

    // If we found a different node ID, this means we clicked on a nested element
    // and we should handle the selection for that specific node, not this wrapper
    if (clickedNodeId !== nodeSchema.id) {
      // Don't handle the selection here - let the correct wrapper handle it
      return;
    }

    // Prevent default behavior and stop propagation immediately
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    e.nativeEvent.stopPropagation();

    const newSelection: SelectedNode = {
      pageId: currentPageId,
      nodeId: nodeSchema.id,
      nodeName: nodeSchema.name || (nodeSchema.type === 'atom' && nodeSchema.atomType) || nodeSchema.type,
    };

    // Helper function to get all child node IDs recursively
    const getAllChildNodeIds = (node: Node): string[] => {
      const childIds: string[] = [];
      if ('children' in node && node.children) {
        node.children.forEach(child => {
          childIds.push(child.id);
          childIds.push(...getAllChildNodeIds(child));
        });
      }
      return childIds;
    };

    // Helper function to get only top-level child node IDs (no recursion)
    const getTopLevelChildNodeIds = (node: Node): string[] => {
      const childIds: string[] = [];
      if ('children' in node && node.children) {
        node.children.forEach(child => {
          childIds.push(child.id);
        });
      }
      return childIds;
    };

    // Helper function to find parent section of a node
    const findParentSection = (nodes: Node[], targetId: string, parent: Node | null = null): Node | null => {
      for (const node of nodes) {
        if ('children' in node && node.children) {
          // Check if this node contains the target
          if (node.children.some(child => child.id === targetId || getAllChildNodeIds(child).includes(targetId))) {
            return node;
          }
          // Recursively search in children
          const found = findParentSection(node.children as Node[], targetId, node);
          if (found) return found;
        }
      }
      return null;
    };

    // Helper function to check if all top-level children of a section are selected
    const areAllTopLevelChildrenSelected = (section: Node, selectedNodeIds: string[]): boolean => {
      if (!('children' in section) || !section.children) return false;
      
      const topLevelChildIds = getTopLevelChildNodeIds(section);
      return topLevelChildIds.length > 0 && topLevelChildIds.every(childId => 
        selectedNodeIds.includes(childId)
      );
    };

    if (e.shiftKey) {
      // Multi-select mode
      if (!isSelected) {
        // Add to selection
        setSelectedNodes([...selectedNodes, newSelection]);
      } else {
        // Remove from selection
        setSelectedNodes(selectedNodes.filter(sn => 
          !(sn.nodeId === newSelection.nodeId && sn.pageId === newSelection.pageId)
        ));
      }
    } else {
      // Single select mode
      if (isSelected) {
        // Deselect if already selected
        setSelectedNodes([]);
      } else {
        // Select only this node
        setSelectedNodes([newSelection]);
      }
    }

    // After updating selection, check if we should select parent sections
    const updatedSelection = e.shiftKey 
      ? (isSelected 
          ? selectedNodes.filter(sn => !(sn.nodeId === newSelection.nodeId && sn.pageId === newSelection.pageId))
          : [...selectedNodes, newSelection]
        )
      : (isSelected ? [] : [newSelection]);

    // Check if we should select parent sections when all children are selected
    if (props.pageDefinition) {
      const selectedNodeIds = updatedSelection.map(sn => sn.nodeId);
      const sectionsToAdd: SelectedNode[] = [];

      // Find all sections that have all their top-level children selected
      const findSectionsWithAllTopLevelChildrenSelected = (nodes: Node[]): void => {
        nodes.forEach(node => {
          if (node.type === 'section' && 'children' in node && node.children) {
            if (areAllTopLevelChildrenSelected(node, selectedNodeIds)) {
              // Check if this section is not already selected
              const sectionSelection: SelectedNode = {
                pageId: currentPageId,
                nodeId: node.id,
                nodeName: node.name || node.type,
              };
              
              if (!updatedSelection.some(sn => sn.nodeId === node.id && sn.pageId === currentPageId)) {
                sectionsToAdd.push(sectionSelection);
              }
            }
            // Recursively check nested sections
            findSectionsWithAllTopLevelChildrenSelected(node.children as Node[]);
          }
        });
      };

      findSectionsWithAllTopLevelChildrenSelected(props.pageDefinition.nodes);

      // Add parent sections to selection
      if (sectionsToAdd.length > 0) {
        setSelectedNodes([...updatedSelection, ...sectionsToAdd]);
      } else {
        setSelectedNodes(updatedSelection);
      }
    } else {
      setSelectedNodes(updatedSelection);
    }

    if (interactionMode !== 'select') {
      setInteractionMode('select');
      setTextEditState(null);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isInspectMode || isBeingEditedByAI) return; // Only respond to double-click in inspect mode

    e.preventDefault();
    e.stopPropagation();
    if (isTextEditable(nodeSchema)) {
      // This needs a more robust way to find the editable property and its value
      const editableProp = 'content'; // Simplification
      const initialValue = (nodeSchema.params as any)[editableProp] || '';

      setInteractionMode('text-edit');
      setTextEditState({
        nodeId: nodeSchema.id,
        propertyPath: `params.${editableProp}`,
        initialValue: initialValue
      });
    }
  };


  const handleMouseOver = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isInspectMode || isBeingEditedByAI) {
      setHoveredNodeId(null);

      if (timeoutId) {
        clearTimeout(timeoutId);
      };

      return;
    }

    // Don't show hover effect if there are selected nodes (to prevent tooltip flickering)
    if (selectedNodes.length > 0) {
      setHoveredNodeId(null);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      return;
    }

    // Don't show hover effect if this node is already selected
    if (isSelected) {
      setHoveredNodeId(null);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      return;
    }

    // clear the timeout if it exist
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      setHoveredNodeId(nodeSchema.id);
    }, 100);
  };

  const handleMouseOut = (e: React.MouseEvent) => {
    if (!isInspectMode || isBeingEditedByAI || selectedNodes.length > 0) return; // Only respond to hover in inspect mode when no nodes are selected

    e.stopPropagation();
    // A timeout helps prevent flickering when moving mouse over complex nested structures
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (hoveredNodeId === nodeSchema.id) {
        setHoveredNodeId(null);
      }
    }, 100);
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Check if the target is part of the floating toolbar
    const target = e.target as HTMLElement;
    if (target.closest('.floating-toolbar')) {
      return; // Don't handle mouse down on toolbar elements
    }

    if (!isInspectMode || isBeingEditedByAI) return;
    
    // Prevent default behavior and stop propagation for mouse down events
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    e.nativeEvent.stopPropagation();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Check if the target is part of the floating toolbar
    const target = e.target as HTMLElement;
    if (target.closest('.floating-toolbar')) {
      return; // Don't handle mouse up on toolbar elements
    }

    if (!isInspectMode || isBeingEditedByAI) return;
    
    // Prevent default behavior and stop propagation for mouse up events
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    e.nativeEvent.stopPropagation();
  };

  useEffect(() => {
    if (wrapperRef.current) {
      // Find the correct element based on node type
      const findTargetElement = (): HTMLElement | null => {
        const lastChild = wrapperRef.current?.lastChild as HTMLElement;
        if (!lastChild) return null;
        
        // For sections with custom htmlTag (like nav, header, etc.), get the first child
        // For everything else (atoms, components, regular div sections), use lastChild directly
        if (nodeSchema.type == 'component') {
          return lastChild.firstChild as HTMLElement;
        } else {
          return lastChild;
        }
      };

      const content = findTargetElement();
      if (content) {
        const updateRect = () => {
          const rect = content.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(content);
          const marginTop = parseFloat(computedStyle.marginTop) || 0;
          const marginRight = parseFloat(computedStyle.marginRight) || 0;
          const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
          const marginLeft = parseFloat(computedStyle.marginLeft) || 0;
          
          const rectWithMargins = new DOMRect(
            rect.left - marginLeft,
            rect.top - marginTop,
            rect.width + marginLeft + marginRight,
            rect.height + marginTop + marginBottom
          );
          
          setRect(rectWithMargins);
        };
        updateRect();

        const resizeObserver = new ResizeObserver(updateRect);
        resizeObserver.observe(content);

        const scrollListener = () => updateRect();
        window.addEventListener('scroll', scrollListener, { passive: true });
        window.addEventListener('resize', updateRect);

        return () => {
          resizeObserver.disconnect();
          window.removeEventListener('scroll', scrollListener);
          window.removeEventListener('resize', updateRect);
        };
      }
    }
  }, [wrapperRef.current, nodeSchema.type, nodeSchema.id, nodeSchema.params]);

  return (
    <div
      className="contents" /* 
        This wrapper div was causing layout inconsistencies between the editor and the actual page renderer,
        particularly affecting grid column/row spans, flex layouts, and percentage-based widths.
        
        display: contents makes this div act as if it doesn't exist in the DOM layout - its children
        are treated as direct children of the div's parent element. This preserves the exact same layout
        structure as the OkiynaiPageRenderer component where this wrapper div isn't present.
        
        Without display: contents, this extra div would create a new block formatting context and
        break layout-dependent styles of its children.
      */
      onClick={handleClick}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      /* Capture phase (top-down) executes before bubble phase (bottom-up), allowing us to prevent both 
        React and native events with e.nativeEvent.stopImmediatePropagation() for elements that 
        are children of this wrapper div.
      */
      onMouseDownCapture={handleMouseDown}
      onMouseUpCapture={handleMouseUp}
      onClickCapture={handleClick}

      data-osdl-id={nodeSchema.id}
      ref={wrapperRef}
    >

      <NodeRenderer
        nodeSchema={nodeSchema}
        setPageDefinition={setPageDefinition || props.setPageDefinition}
        {...props}
        isBeingEdited={isBeingEdited}
        isInspectMode={isInspectMode}
        onDeleteNode={onDeleteNode}
        onDuplicateNode={onDuplicateNode}
        onMoveNode={onMoveNode}
        ChildRenderer={ChildRenderer}
        parentTemplatingContext={props.parentTemplatingContext}
      />
      


      {rect && (
        <>
          {(() => {
            const calculateLabelPosition = (rect: DOMRect): 'top' | 'bottom' => {
              const labelHeight = 20;
              
              let labelTop = rect.top - labelHeight - 2; // Default: above the element
              
              // Check if there's enough space at the top
              if (labelTop < 10) {
                return 'bottom';
              }
              
              return 'top';
            };

            const labelPosition = calculateLabelPosition(rect);

            return (
              <>
                {isInspectMode && ((isSelected && selectedNodes.length > 0 && selectedNodes[selectedNodes.length - 1].nodeId === nodeSchema.id)) && !isBeingEditedByAI && (
                  <FloatingToolbar
                    rect={rect}
                    nodeSchema={nodeSchema}
                    currentPageId={currentPageId}
                    onDuplicateNode={onDuplicateNode}
                    onDeleteNode={onDeleteNode}
                    onMoveNode={onMoveNode}
                    labelPosition={labelPosition}
                    pageDefinition={props.pageDefinition}
                  />
                )}

                <NodeOverlay
                  rect={rect}
                  isInspectMode={isInspectMode}
                  isHovered={isHovered}
                  isSelected={isSelected}
                  isBeingEditedByAI={isBeingEditedByAI}
                  nodeSchema={nodeSchema}
                  labelPosition={labelPosition}
                  pageDefinition={props.pageDefinition}
                />
              </>
            );
          })()}

		  {/* The animating border around the section */}
          {isBeingEditedByAI && 
            <div style={{position: 'fixed', top: rect.top, left: rect.left, width: rect.width, height: rect.height }}>
              <div className="ai-editing-border">
                <div className="inner" />
              </div>
            </div>
          }

          {/* Condom so the user does not click on the section that's being edited by AI */}
          {isBeingEditedByAI && <div style={{position: 'fixed', top: rect.top, left: rect.left, width: rect.width, height: rect.height, 
				zIndex: 40, pointerEvents: 'auto', userSelect: 'none'}} />
          }
        </>
      )}
    </div>
  );
};

const FloatingToolbar: React.FC<{
  rect: DOMRect;
  nodeSchema: Node;
  currentPageId: string | null;
  onDuplicateNode?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onMoveNode?: (nodeId: string, direction: 'up' | 'down') => void;
  labelPosition?: 'top' | 'bottom';
  pageDefinition?: any;
}> = ({ rect, nodeSchema, currentPageId, onDuplicateNode, onDeleteNode, onMoveNode, labelPosition = 'top', pageDefinition }) => {
  const [currentPageName] = useAtom(currentPageNameAtom);
  const [selectedNodes, setSelectedNodes] = useAtom(selectedNodesAtom);

  // Determine if the node can be moved up or down
  const canMoveUp = (() => {
    if (!pageDefinition?.nodes || !onMoveNode) return false;
    
    // Find the current node and its parent
    const findNodeAndParent = (nodes: Node[], targetId: string, parent: Node | null = null): { node: Node | null, parent: Node | null, siblings: Node[], index: number } => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.id === targetId) {
          return { node, parent, siblings: nodes, index: i };
        }
        if ('children' in node && node.children) {
          const result = findNodeAndParent(node.children as Node[], targetId, node);
          if (result.node) {
            return result;
          }
        }
      }
      return { node: null, parent: null, siblings: [], index: -1 };
    };
    
    const { siblings, index } = findNodeAndParent(pageDefinition.nodes, nodeSchema.id);
    
    // Can move up if not the first node in its sibling array
    return index > 0;
  })();

  const canMoveDown = (() => {
    if (!pageDefinition?.nodes || !onMoveNode) return false;
    
    // Find the current node and its parent
    const findNodeAndParent = (nodes: Node[], targetId: string, parent: Node | null = null): { node: Node | null, parent: Node | null, siblings: Node[], index: number } => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.id === targetId) {
          return { node, parent, siblings: nodes, index: i };
        }
        if ('children' in node && node.children) {
          const result = findNodeAndParent(node.children as Node[], targetId, node);
          if (result.node) {
            return result;
          }
        }
      }
      return { node: null, parent: null, siblings: [], index: -1 };
    };
    
    const { siblings, index } = findNodeAndParent(pageDefinition.nodes, nodeSchema.id);
    
    // Can move down if not the last node in its sibling array
    return index >= 0 && index < siblings.length - 1;
  })();

  const handleActionClick = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();

    if (action === 'edit') {
      const message = {
        type: 'EDIT_NODE',
        payload: { node: nodeSchema }
      };

      window.parent.postMessage(message, '*');
      return;
    }

    if(action === 'duplicate') {
      onDuplicateNode?.(nodeSchema.id);
      return;
    }

    if(action === 'delete') {
      onDeleteNode?.(nodeSchema.id);
      setSelectedNodes(selectedNodes.filter(sn => sn.nodeId !== nodeSchema.id));
      return;
    }

    if(action === 'move-up') {
      onMoveNode?.(nodeSchema.id, 'up');
      return;
    }

    if(action === 'move-down') {
      onMoveNode?.(nodeSchema.id, 'down');
      return;
    }

    console.log(`Action: ${action} on selected node.`);
    // Here you would dispatch an action to the editor store
  };

  const approxToolbarWidth = 186; // Slightly increased from 160 to accommodate the new button
  const approxToolbarHeight = 36;
  const labelHeight = 20; // Approximate label width
  const plusButtonOffset = 14; // Offset of plus buttons from element edge
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

  // Calculate toolbar position with label awareness
  let toolbarTop = rect.bottom + plusButtonOffset + 2; // Position below plus buttons with 2px gap (only 10px outside)
  let toolbarLeft = rect.left + rect.width / 2 - approxToolbarWidth / 2;
  
  // Calculate label rect to avoid overlap
  const getLabelWidth = () => {
    // Calculate based on text content using canvas
    const labelText = nodeSchema.name || (nodeSchema.type === 'atom' ? (nodeSchema as any).atomType : nodeSchema.type);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = '10px sans-serif'; // Match the label font
      const textWidth = context.measureText(labelText).width;
      return textWidth + 12; // Add padding (6px on each side)
    }
    return 120; // Fallback
  };
  
  const labelWidth = getLabelWidth();
  const labelRect = {
    left: rect.left,
    right: rect.left + labelWidth,
    top: labelPosition === 'top' ? rect.top - labelHeight : rect.bottom,
    bottom: labelPosition === 'top' ? rect.top : rect.bottom + labelHeight,
    width: labelWidth,
    height: labelHeight
  };

  // Check for collision between label and toolbar
  const detectCollision = (toolbarLeft: number, toolbarWidth: number, labelRect: any): boolean => {
    return toolbarLeft < labelRect.right && toolbarLeft + toolbarWidth > labelRect.left;
  };

  // Smart positioning that tries to stay close to the element and avoids label
  if (labelPosition === 'bottom') {
    // Try to stay centered but avoid label overlap
    let centerPosition = rect.left + rect.width / 2 - approxToolbarWidth / 2;
    
    // Check if centered position overlaps with label
    const centerOverlapsLabel = detectCollision(centerPosition, approxToolbarWidth, labelRect);
    
    if (!centerOverlapsLabel && centerPosition >= 10 && centerPosition + approxToolbarWidth <= viewportWidth - 10) {
      // Can stay centered
      toolbarLeft = centerPosition;
    } else {
      // Try right side first (closer to element)
      let rightPosition = Math.min(
        viewportWidth - approxToolbarWidth - 10,
        centerPosition + 40 // Smaller offset to stay closer
      );
      
      // Check if right position overlaps with label
      const rightOverlapsLabel = detectCollision(rightPosition, approxToolbarWidth, labelRect);
      
      // Try left side if right doesn't work
      let leftPosition = Math.max(10, centerPosition - 40);
      const leftOverlapsLabel = detectCollision(leftPosition, approxToolbarWidth, labelRect);
      
      // Choose the position that keeps toolbar closest to element and doesn't overlap label
      if (!rightOverlapsLabel && rightPosition + approxToolbarWidth <= viewportWidth - 10) {
        toolbarLeft = rightPosition;
      } else if (!leftOverlapsLabel && leftPosition >= 10) {
        toolbarLeft = leftPosition;
      } else {
        // If neither side works, move to bottom
        toolbarTop = rect.bottom + labelHeight + 4; // Use original logic when there's collision
        toolbarLeft = centerPosition; // Stay centered
      }
    }
  } else {
    // Label is at top, check if toolbar would overlap with viewport
    if (toolbarTop + approxToolbarHeight > viewportHeight - 10) {
      toolbarTop = rect.top - approxToolbarHeight - plusButtonOffset - 2;
    }
  }

  // Ensure toolbar stays within viewport bounds
  toolbarLeft = Math.max(10, Math.min(viewportWidth - approxToolbarWidth - 10, toolbarLeft));
  toolbarTop = Math.max(10, Math.min(viewportHeight - approxToolbarHeight - 10, toolbarTop));

  return createPortal(
    <div
      className="bg-black rounded-lg p-1 flex items-center gap-0.5 shadow-2xl z-[9999] floating-toolbar"
      style={{
        position: 'fixed',
        top: toolbarTop,
        left: toolbarLeft,
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <button className="p-1.5 hover:bg-zinc-700 rounded-md transition-colors duration-150"
        title="Edit" onClick={(e) => handleActionClick(e, 'edit')}>
        <Edit className="text-white" strokeWidth={1.5} size={16} />
      </button>
      <button className="p-1.5 hover:bg-zinc-700 rounded-md transition-colors duration-150"
        title="Duplicate" onClick={(e) => handleActionClick(e, 'duplicate')}>
        <CopyPlus className="text-white" strokeWidth={1.5} size={16} />
      </button>
      <button className="p-1.5 hover:bg-zinc-700 rounded-md transition-colors duration-150"
        title="Delete" onClick={(e) => handleActionClick(e, 'delete')}>
        <Trash2 className="text-white" strokeWidth={1.5} size={16} />
      </button>
      <button 
        className={`p-1.5 rounded-md transition-colors duration-150 ${
          canMoveUp 
            ? 'hover:bg-zinc-700 cursor-pointer' 
            : 'opacity-50 cursor-not-allowed'
        }`}
        title={canMoveUp ? "Move Up" : "Cannot move up"}
        onClick={canMoveUp ? (e) => handleActionClick(e, 'move-up') : undefined}
        disabled={!canMoveUp}
      >
        <ArrowUp className={`${canMoveUp ? 'text-white' : 'text-gray-400'}`} strokeWidth={1.5} size={16} />
      </button>
      <button 
        className={`p-1.5 rounded-md transition-colors duration-150 ${
          canMoveDown 
            ? 'hover:bg-zinc-700 cursor-pointer' 
            : 'opacity-50 cursor-not-allowed'
        }`}
        title={canMoveDown ? "Move Down" : "Cannot move down"}
        onClick={canMoveDown ? (e) => handleActionClick(e, 'move-down') : undefined}
        disabled={!canMoveDown}
      >
        <ArrowDown className={`${canMoveDown ? 'text-white' : 'text-gray-400'}`} strokeWidth={1.5} size={16} />
      </button>
    </div>,
    document.body
  );
};

const NodeOverlay: React.FC<{
  rect: DOMRect;
  isInspectMode: boolean;
  isHovered: boolean;
  isSelected: boolean;
  isBeingEditedByAI: boolean | undefined;
  nodeSchema: Node;
  labelPosition: 'top' | 'bottom';
  pageDefinition?: PageDefinition;
}> = ({ rect, isInspectMode, isHovered, isSelected, isBeingEditedByAI, nodeSchema, labelPosition, pageDefinition }) => {
  // Determine outline style based on selection and hover state
  let outlineStyle = 'none';
  if (isInspectMode && !isBeingEditedByAI) {
    if (isSelected) {
      outlineStyle = '1px solid #3b82f6'; // Blue for selected (same thickness as hover)
    } else if (isHovered) {
      outlineStyle = '1px solid #60a5fa'; // Lighter blue for hover
    }
  }

  // Determine if plus buttons should be shown for this section
  const shouldShowPlusButtons = (() => {
    // Only show for sections
    if (nodeSchema.type !== 'section') {
      return false;
    }
    
    // Only show in inspect mode
    if (!isInspectMode) {
      return false;
    }
    
    // Don't show if being edited by AI
    if (isBeingEditedByAI) {
      return false;
    }
    
    // Show when hovered OR selected
    if (!isHovered && !isSelected) {
      return false;
    }
    
    return true;
  })();

  // Determine button positioning based on parent layout
  const getButtonPositioning = (() => {
    if (!pageDefinition) {
      return 'vertical'; // Default to vertical
    }
    
    const parentSection = findParentSection(pageDefinition.nodes, nodeSchema.id);
    if (!parentSection) {
      return 'vertical'; // No parent = vertical (add to page level)
    }
    
    // Check if parent has horizontal layout
    if (parentSection.type === 'section' && 'layout' in parentSection && parentSection.layout) {
      return isHorizontalLayout(parentSection.layout) ? 'horizontal' : 'vertical';
    }
    
    return 'vertical'; // Default to vertical
  })();

  // Check if buttons will fit on screen edges
  const buttonSize = 20;
  const buttonOffset = 10;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

  const canShowTopButton = rect.top - buttonOffset >= 0;
  const canShowBottomButton = rect.bottom + buttonOffset <= viewportHeight;
  const canShowLeftButton = rect.left - buttonOffset >= 0;
  const canShowRightButton = rect.right + buttonOffset <= viewportWidth;

  const [showPlusModal, setShowPlusModal] = useState<{ position: 'top' | 'bottom' | 'left' | 'right'; buttonRect: DOMRect } | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  const handlePlusClick = (position: 'top' | 'bottom' | 'left' | 'right') => {
    console.log(`Plus button clicked at ${position} for node ${nodeSchema.id}`);
    
    // Get the button element to calculate its position
    const buttonElement = document.querySelector(`[data-plus-button="${nodeSchema.id}-${position}"]`) as HTMLElement;
    if (buttonElement) {
      const buttonRect = buttonElement.getBoundingClientRect();
      setShowPlusModal({ position, buttonRect });
    }
  };

  const handleClosePlusModal = () => {
    setShowPlusModal(null);
    setHoveredSection(null);
  };

  // Hide modal when inspect mode is turned off
  useEffect(() => {
    if (!isInspectMode) {
      setShowPlusModal(null);
    }
  }, [isInspectMode]);

  // Hide modal when this section is no longer selected
  useEffect(() => {
    if (!isSelected) {
      setShowPlusModal(null);
    }
  }, [isSelected]);



  // Add click listener to detect clicks outside the modal
  useEffect(() => {
    if (!showPlusModal) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const modalElement = document.querySelector('[data-plus-modal]') as HTMLElement;
      
      if (modalElement && !modalElement.contains(target)) {
        setShowPlusModal(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPlusModal]);


  return (
    <>
      {createPortal(
        <div
          style={{
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            pointerEvents: 'none',
            zIndex: 9999,
            outline: outlineStyle,
            outlineOffset: '-1px',
          }}
        >
          {isInspectMode && (isHovered || isSelected) && !isBeingEditedByAI && (
            <div 
              style={{ 
                position: 'absolute', 
                top: labelPosition === 'top' ? -20 : rect.height, 
                left: 0
              }} 
              className="bg-blue-500 text-white px-1.5 py-0.5 text-[10px] font-sans"
            >
              {nodeSchema.name || (nodeSchema.type === 'atom' ? (nodeSchema as any).atomType : nodeSchema.type)}
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Plus buttons in completely separate portal */}
      {shouldShowPlusButtons && createPortal(
        <>
          {getButtonPositioning === 'vertical' ? (
            <>
              {/* Top button - for vertical layout */}
              <button
                className="plus-button"
                data-plus-button={`${nodeSchema.id}-top`}
                style={{
                  position: 'fixed',
                  top: Math.max(10, rect.top - buttonOffset),
                  left: Math.max(10, Math.min(viewportWidth - buttonSize - 10, rect.left + rect.width / 2 - buttonSize / 2)),
                  width: buttonSize,
                  height: buttonSize,
                  zIndex: 100000,
                  pointerEvents: 'auto',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  userSelect: 'none',
                  border: 'none',
                  outline: 'none',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  handlePlusClick('top');
                }}
                title="Add section above"
              >
                <Plus className="text-white" strokeWidth={2} size={16} />
              </button>

              {/* Bottom button - for vertical layout */}
              <button
                className="plus-button"
                data-plus-button={`${nodeSchema.id}-bottom`}
                style={{
                  position: 'fixed',
                  top: Math.min(viewportHeight - buttonSize - 10, rect.bottom - buttonOffset),
                  left: Math.max(10, Math.min(viewportWidth - buttonSize - 10, rect.left + rect.width / 2 - buttonSize / 2)),
                  width: buttonSize,
                  height: buttonSize,
                  zIndex: 100000,
                  pointerEvents: 'auto',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  userSelect: 'none',
                  border: 'none',
                  outline: 'none',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  handlePlusClick('bottom');
                }}
                title="Add section below"
              >
                <Plus className="text-white" strokeWidth={2} size={16} />
              </button>
            </>
          ) : (
            <>
              {/* Left button - for horizontal layout */}
              <button
                className="plus-button"
                data-plus-button={`${nodeSchema.id}-left`}
                style={{
                  position: 'fixed',
                  top: Math.max(10, Math.min(viewportHeight - buttonSize - 10, rect.top + rect.height / 2 - buttonSize / 2)),
                  left: Math.max(10, rect.left - buttonOffset),
                  width: buttonSize,
                  height: buttonSize,
                  zIndex: 100000,
                  pointerEvents: 'auto',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  userSelect: 'none',
                  border: 'none',
                  outline: 'none',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  handlePlusClick('left');
                }}
                title="Add section before"
              >
                <Plus className="text-white" strokeWidth={2} size={16} />
              </button>

              {/* Right button - for horizontal layout */}
              <button
                className="plus-button"
                data-plus-button={`${nodeSchema.id}-right`}
                style={{
                  position: 'fixed',
                  top: Math.max(10, Math.min(viewportHeight - buttonSize - 10, rect.top + rect.height / 2 - buttonSize / 2)),
                  left: Math.min(viewportWidth - buttonSize - 10, rect.right - buttonOffset),
                  width: buttonSize,
                  height: buttonSize,
                  zIndex: 100000,
                  pointerEvents: 'auto',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  userSelect: 'none',
                  border: 'none',
                  outline: 'none',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  handlePlusClick('right');
                }}
                title="Add section after"
              >
                <Plus className="text-white" strokeWidth={2} size={16} />
              </button>
            </>
          )}
        </>,
        document.body
      )}

      {/* Floating modal for adding sections */}
      {showPlusModal && createPortal(
        <div
          data-plus-modal
          style={{
            position: 'fixed',
            width: 600,
            minHeight: 400,
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e5e7eb',
            zIndex: 1000000,
            pointerEvents: 'auto',
            display: 'flex',
            ...(() => {
              const { position } = showPlusModal;
              const modalWidth = 600;
              const margin = 20;
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              
              // Calculate available space at the modal's position
              let availableHeight = 500; // Default max height
              let top, left;

              if (position === 'top') {
                // Above the section - available height is from top of viewport to section top
                availableHeight = rect.top - margin;
                top = Math.max(margin, rect.top - availableHeight - margin);
                left = Math.max(margin, Math.min(viewportWidth - modalWidth - margin, rect.left + rect.width / 2 - modalWidth / 2));
              } else if (position === 'bottom') {
                // Below the section - available height is from section bottom to bottom of viewport
                availableHeight = viewportHeight - rect.bottom - margin;
                top = rect.bottom + margin;
                left = Math.max(margin, Math.min(viewportWidth - modalWidth - margin, rect.left + rect.width / 2 - modalWidth / 2));
              } else if (position === 'left') {
                // Left of the section
                let leftPosition = rect.left - modalWidth - margin;
                
                if (leftPosition < margin || leftPosition + modalWidth > rect.left) {
                  // Move below - available height is from section bottom to bottom of viewport
                  availableHeight = viewportHeight - rect.bottom - margin;
                  top = rect.bottom + margin;
                  left = Math.max(margin, Math.min(viewportWidth - modalWidth - margin, rect.left + rect.width / 2 - modalWidth / 2));
                } else {
                  // Can fit to the left - available height is full viewport height
                  availableHeight = viewportHeight - (margin * 2);
                  top = Math.max(margin, Math.min(viewportHeight - availableHeight - margin, rect.top + rect.height / 2 - availableHeight / 2));
                  left = Math.max(margin, leftPosition);
                }
              } else if (position === 'right') {
                // Right of the section
                let rightPosition = rect.right + margin;
                
                if (rightPosition + modalWidth > viewportWidth - margin || rightPosition < rect.right) {
                  // Move below - available height is from section bottom to bottom of viewport
                  availableHeight = viewportHeight - rect.bottom - margin;
                  top = rect.bottom + margin;
                  left = Math.max(margin, Math.min(viewportWidth - modalWidth - margin, rect.left + rect.width / 2 - modalWidth / 2));
                } else {
                  // Can fit to the right - available height is full viewport height
                  availableHeight = viewportHeight - (margin * 2);
                  top = Math.max(margin, Math.min(viewportHeight - availableHeight - margin, rect.top + rect.height / 2 - availableHeight / 2));
                  left = Math.min(viewportWidth - modalWidth - margin, rightPosition);
                }
              }

              // Constrain the available height
              availableHeight = Math.max(400, Math.min(600, availableHeight)) - 10; // 10px offset so we don't touch the edges of the screen

              return { 
                top, 
                left,
                maxHeight: availableHeight
              };
            })(),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Section List */}
          <div style={{ width: '180px', overflow: 'auto', height: '100%' }}>
            {(() => {
              const prebuilt = [
                { id: 'navbar', name: 'Navigation Bar', previewImage: `/pre-built-sections/default_navbar.png`, kind: 'prebuilt' as const },
                { id: 'heroSection', name: 'Hero Section', previewImage: `/pre-built-sections/default_hero.png`, kind: 'prebuilt' as const },
              ];
              const components = Object.keys(ComponentRegistry).map(k => ({ id: k, name: k, previewImage: `/pre-built-sections/default_hero.png`, kind: 'component' as const }));
              const items = [...prebuilt, ...components];
              return items.map((section) => (
                <div
                  key={`${section.kind}:${section.id}`}
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: hoveredSection === `${section.kind}:${section.id}` ? '#f8fafc' : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredSection(`${section.kind}:${section.id}`)}
                  onMouseLeave={() => setHoveredSection(null)}
                  onClick={() => {
                    console.log('[EditorNodeWrapper] Item clicked:', section);
                    
                    // Calculate order based on button position using sibling-aware gaps
                    const computeSiblingAwareOrder = (position: 'left' | 'right' | 'top' | 'bottom'): number => {
                      const currentOrder = (nodeSchema as any).order as number;
                      const findParentNode = (nodes: Node[], targetId: string): any => {
                        for (const n of nodes) {
                          if (n.id === targetId) return n;
                          // @ts-ignore
                          if ((n as any).children && Array.isArray((n as any).children)) {
                            // @ts-ignore
                            const found = findParentNode((n as any).children, targetId);
                            if (found) return found;
                          }
                        }
                        return null;
                      };

                      let siblings: any[] = [];
                      if (pageDefinition) {
                        const parentId = (() => {
                          const findParent = (nodes: Node[], targetId: string): string | null => {
                            for (const node of nodes) {
                              if (node.type === 'section' && 'children' in node && node.children) {
                                if (node.children.some(child => child.id === targetId)) {
                                  return node.id;
                                }
                                const found = findParent(node.children as Node[], targetId);
                                if (found) return found;
                              }
                            }
                            return null;
                          };
                          const parent = findParent(pageDefinition.nodes, nodeSchema.id);
                          return parent || 'root';
                        })();

                        if (parentId === 'root') {
                          siblings = pageDefinition.nodes.slice();
                        } else {
                          const parentNode = findParentNode(pageDefinition.nodes, parentId);
                          siblings = (parentNode?.children || []).slice();
                        }
                      }

                      siblings.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                      const idx = siblings.findIndex(s => s.id === (nodeSchema as any).id);

                      if (position === 'left' || position === 'top') {
                        if (idx > 0) {
                          const prev = siblings[idx - 1];
                          return (Number(prev.order) + Number(currentOrder)) / 2;
                        }
                        return Number(currentOrder) - 1;
                      } else {
                        if (idx >= 0 && idx < siblings.length - 1) {
                          const next = siblings[idx + 1];
                          return (Number(next.order) + Number(currentOrder)) / 2;
                        }
                        return Number(currentOrder) + 1;
                      }
                    };

                    let order = 0;
                    if (showPlusModal) {
                      const { position } = showPlusModal;
                      order = computeSiblingAwareOrder(position);
                    }

                    const parentId = (() => {
                      if (!pageDefinition) return 'root';
                      const findParent = (nodes: Node[], targetId: string): string | null => {
                        for (const node of nodes) {
                          if (node.type === 'section' && 'children' in node && node.children) {
                            if (node.children.some(child => child.id === targetId)) {
                              return node.id;
                            }
                            const found = findParent(node.children as Node[], targetId);
                            if (found) return found;
                          }
                        }
                        return null;
                      };
                      const parent = findParent(pageDefinition.nodes, nodeSchema.id);
                      return parent || 'root';
                    })();

                    if (section.kind === 'component') {
                      const componentNode = {
                        id: `component-${crypto.randomUUID().slice(0,8)}`,
                        type: 'component',
                        componentType: section.id,
                        name: section.name,
                        order,
                        params: {}
                      } as any;

                      const message = {
                        type: 'CREATE_OSDL_NODE',
                        payload: { node: componentNode, parentId }
                      };
                      window.postMessage(message, '*');
                      handleClosePlusModal();
                      return;
                    }

                    const message = {
                      type: 'ADD_PRE_BUILT_SECTION',
                      payload: { sectionId: section.id, parentId, name: section.name, order }
                    };
                    window.postMessage(message, '*');
                    handleClosePlusModal();
                  }}
                >
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: hoveredSection === `${section.kind}:${section.id}` ? '#1e40af' : '#374151',
                    transition: 'color 0.2s ease'
                  }}>
                    {section.name}
                  </h4>
                </div>
              ));
            })()}
          </div>
          
          {/* Image Preview */}
          <div style={{ 
            flex: 1, 
            backgroundColor: '#f8fafc',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderTopRightRadius: '12px',
            borderBottomRightRadius: '12px',
            borderLeft: '1px solid #e5e7eb'
          }}>
            {hoveredSection && (
              <img
                src={(() => {
                  const prebuilt = [
                    { id: 'navbar', name: 'Navigation Bar', previewImage: `/pre-built-sections/default_navbar.png`, kind: 'prebuilt' as const },
                    { id: 'heroSection', name: 'Hero Section', previewImage: `/pre-built-sections/default_hero.png`, kind: 'prebuilt' as const },
                  ];
                  const components = Object.keys(ComponentRegistry).map(k => ({ id: k, name: k, previewImage: `/pre-built-sections/default_hero.png`, kind: 'component' as const }));
                  const items = [...prebuilt, ...components];
                  const section = items.find(s => `${s.kind}:${s.id}` === hoveredSection);
                  return section?.previewImage || `/pre-built-sections/default_hero.png`;
                })()}
                alt="Preview"
                style={{
                  maxWidth: '95%',
                  maxHeight: '95%',
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
                onLoad={() => console.log('[EditorNodeWrapper] Preview image loaded successfully')}
                onError={(e) => {
                  console.error('[EditorNodeWrapper] Preview image failed to load');
                  // Fallback to a placeholder
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Q0ExQUEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5QcmV2aWV3PC90ZXh0Pgo8L3N2Zz4K';
                }}
              />
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
