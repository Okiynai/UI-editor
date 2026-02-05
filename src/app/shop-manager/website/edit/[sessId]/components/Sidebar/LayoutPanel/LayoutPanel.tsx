import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { AtomNode, Node, SectionNode, SiteSettings } from '@/OSDL/OSDL.types';

import { 
    ChevronDownIcon, 
    ChevronRightIcon,
    Type,
    Image,
    MousePointerClick,
    Video,
    RectangleEllipsis,
    Link,
    Box,
    Scan,
    GripVertical,
    Star,
    MoreHorizontal,
    Edit,
    Trash2,
    Copy,
    Plus,
    ChevronLeft,
    ShoppingCart,
    CreditCard,
    User
} from 'lucide-react';
import { useAtom } from 'jotai';
import { layoutDebugModeAtom } from '@/store/editor';
import { useIframeCommunicationContext } from '../../../context/IframeCommunicationContext';
import SmartishEditor from '../../SmartishEditor/SmartishEditor';


// Context Menu Component
const ContextMenu = ({ 
    node, 
    position, 
    onClose
}: {
    node: Node;
    position: { x: number; y: number };
    onClose: () => void;
}) => {
    const handleRename = () => {
        // TODO: Implement rename functionality
        console.log('Rename node:', node.id);
        onClose();
    };

    const handleDelete = () => {
        // TODO: Implement delete functionality
        console.log('Delete node:', node.id);
        onClose();
    };

    const handleDuplicate = () => {
        // TODO: Implement duplicate functionality
        console.log('Duplicate node:', node.id);
        onClose();
    };

    const handleInsertBefore = () => {
        // TODO: Implement insert before functionality
        console.log('Insert before node:', node.id);
        onClose();
    };

    const handleInsertAfter = () => {
        // TODO: Implement insert after functionality
        console.log('Insert after node:', node.id);
        onClose();
    };

    const handleInsertInto = () => {
        // TODO: Implement insert into functionality
        console.log('Insert into node:', node.id);
        onClose();
    };

    const isSection = node.type === 'section';
    
    const menuItems = [
        { label: 'Rename', icon: Edit, onClick: handleRename, iconColor: 'text-blue-600' },
        { label: 'Delete', icon: Trash2, onClick: handleDelete, iconColor: 'text-red-600' },
        { label: 'Duplicate', icon: Copy, onClick: handleDuplicate, iconColor: 'text-green-600' },
        { label: 'Insert Before', icon: Plus, onClick: handleInsertBefore, iconColor: 'text-purple-600' },
        { label: 'Insert After', icon: Plus, onClick: handleInsertAfter, iconColor: 'text-purple-600' },
        ...(isSection ? [{ label: 'Insert Into', icon: Plus, onClick: handleInsertInto, iconColor: 'text-purple-600' }] : []),
    ];

    return (
        <>
            {/* Invisible wrapper to catch clicks outside */}
            <div 
                className="fixed inset-0 z-40"
                onClick={onClose}
            />
            {/* Context menu */}
            <div
                className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px]"
                style={{ left: position.x, top: position.y }}
            >
                {menuItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            item.onClick();
                            onClose();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                        {item.label}
                    </button>
                ))}
            </div>
        </>
    );
};

// Icon mapping for different node types - Memoized for performance
const iconMap: Record<string, any> = {
    'Text': Type,
    'Image': Image,
    'Button': MousePointerClick,
    'Video': Video,
    'Input': RectangleEllipsis,
    'Form': Type, // Using text icon for form
    'Link': Link,
    'Icon': Star,
    'ProgressBar': Type, // Using text icon for progress bar
    'ThreeJSScene': Box,
    'Spacer': Type, // Using text icon for spacer
    'Divider': Type, // Using text icon for divider
};

const getNodeIcon = (node: Node) => {
    if (node.type === 'section') {
        return Scan;
    }
    
    if (node.type === 'atom' && node.atomType) {
        return iconMap[node.atomType] || Type;
    }

    if (node.type === 'component') {
        // Prefer explicit params.iconName when present
        if (node.params?.iconName) {
            // For dynamic icon names, we'll need to handle this differently
            // For now, fall back to defaults
        }
        // Fallback defaults by component type
        const defaults: Record<string, any> = {
            Cart: ShoppingCart,
            Checkout: CreditCard,
            ModalButton: User,
        };
        return defaults[node.componentType] || Type;
    }
    
    return Type; // Default fallback
};


const isSectionNode = (node: Node): node is SectionNode => {
    return node.type === 'section';
};

// TreeNode Component - Memoized for performance
const TreeNode = React.memo(({ 
    node, 
    depth = 0, 
    panelWidth, 
    hoveredNodeId, 
    collapsedSections, 
    onNodeSelect, 
    onNodeHover, 
    onToggleSection, 
    onContextMenu 
}: {
    node: Node;
    depth?: number;
    panelWidth: number;
    hoveredNodeId: string | null;
    collapsedSections: Set<string>;
    onNodeSelect: (node: Node) => void;
    onNodeHover: (nodeId: string | null) => void;
    onToggleSection: (sectionId: string) => void;
    onContextMenu: (e: React.MouseEvent, node: Node) => void;
}) => {
    const indent = React.useMemo(() => 
        depth === 0 ? 0 : Math.max(28, Math.min(42, panelWidth * 0.07)), 
        [depth, panelWidth]
    );
    
    const IconComponent = React.useMemo(() => getNodeIcon(node), [node]);
    const isSection = node.type === 'section';

    // just for the fucking gay ass types

    const hasChildren = (node as SectionNode).children && (node as SectionNode).children.length > 0;
    const isExpanded = !collapsedSections.has(node.id);
    
    // Memoize sorted children to avoid sorting on every render
    const sortedChildren = React.useMemo(() => {
        if (!isSectionNode(node)) return [];
        return [...(node as SectionNode).children].sort((a, b) => a.order - b.order);
    }, [node]);
    
    const handleNodeClick = React.useCallback(() => {
        onNodeSelect(node);
    }, [onNodeSelect, node]);
    
    const handleSectionToggle = React.useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleSection(node.id);
    }, [onToggleSection, node.id]);

    const handleNodeMouseOver = React.useCallback(() => {
        onNodeHover(node.id);
    }, [onNodeHover, node.id]);

    const handleNodeMouseOut = React.useCallback(() => {
        onNodeHover(null);
    }, [onNodeHover]);
    
    return (
        <div style={{ marginLeft: `${indent}px` }} className="mb-2">
            <div 
                className={`group flex items-center gap-2 py-2 text-xs text-[#595959] cursor-pointer px-3 rounded-md transition-colors ${
                    hoveredNodeId === node.id ? 'bg-gray-100/50' : 'hover:bg-gray-100/50'
                }`}
                style={{ letterSpacing: '0em', fontWeight: 'bold' }}
                onContextMenu={(e) => onContextMenu(e, node)}
                onClick={handleNodeClick}
                onMouseOver={handleNodeMouseOver}
                onMouseOut={handleNodeMouseOut}
            >
                {/* Chevron (for sections only) - no icon for opened sections */}
                {isSection && hasChildren ? (
                    <button
                        onClick={handleSectionToggle}
                        className="w-4 h-4 flex items-center justify-center hover:[&>svg]:text-gray-900 rounded transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronDownIcon className="w-4 h-4 text-[#595959]" strokeWidth={2.5} />
                        ) : (
                            <ChevronRightIcon className="w-4 h-4 text-[#595959]" strokeWidth={2.5} />
                        )}
                    </button>
                ) : (
                    <IconComponent className="w-4 h-4 text-[#595959]" strokeWidth={2.5} />
                )}
                {/* Node name */}
                <span 
                    className={`${FontVar.variable} flex-1 max-w-[80%] truncate text-[#595959]`}
                    title={node.name || node.id}
                    style={{ fontFamily: 'var(--font-body)' }}
                >
                    {node.name || node.id}
                </span>
                
                {/* Drag handle */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-auto">
                    <GripVertical className="w-3 h-3 text-[#595959] hover:text-[#595959] !cursor-grab active:cursor-grabbing" strokeWidth={2.5} />
                </div>
            </div>
            
            {/* Render children if section is expanded */}
            {isSection && hasChildren && isExpanded && sortedChildren.length > 0 && (
                <div className="mt-2 mb-3">
                    {sortedChildren.map(child => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            panelWidth={panelWidth}
                            hoveredNodeId={hoveredNodeId}
                            collapsedSections={collapsedSections}
                            onNodeSelect={onNodeSelect}
                            onNodeHover={onNodeHover}
                            onToggleSection={onToggleSection}
                            onContextMenu={onContextMenu}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

TreeNode.displayName = 'TreeNode';

// Node List Component - Optimized
const NodeList = React.memo(({ nodes, onNodeSelect, onNodeHover, panelWidth, hoveredNodeId }: { 
    nodes: Node[], 
    onNodeSelect: (node: Node) => void, 
    onNodeHover: (nodeId: string | null) => void,
    panelWidth: number,
    hoveredNodeId: string | null
}) => {
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{ node: Node; position: { x: number; y: number } } | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const toggleSection = useCallback((sectionId: string) => {
        setCollapsedSections(prev => {
            const newCollapsed = new Set(prev);
            if (newCollapsed.has(sectionId)) {
                newCollapsed.delete(sectionId);
            } else {
                newCollapsed.add(sectionId);
            }
            return newCollapsed;
        });
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
        e.preventDefault();
        setContextMenu({ node, position: { x: e.clientX, y: e.clientY } });
    }, []);

    const handleNodeMouseOver = useCallback((nodeId: string | null) => {
        // clear the timeout if it exist
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            onNodeHover(nodeId);
        }, 100);
    }, [onNodeHover]);

    const handleNodeMouseOut = useCallback((nodeId: string | null) => {
        // A timeout helps prevent flickering when moving mouse over complex nested structures
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            onNodeHover(null);
        }, 100);
    }, [onNodeHover]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="py-3 flex-1 flex flex-col min-h-0">
            <div className='overflow-y-auto flex-1 min-h-0 pr-3'>
                {nodes.map((node: any) => (
                    <TreeNode
                        key={node.id}
                        node={node}
                        depth={0}
                        panelWidth={panelWidth}
                        hoveredNodeId={hoveredNodeId}
                        collapsedSections={collapsedSections}
                        onNodeSelect={onNodeSelect}
                        onNodeHover={handleNodeMouseOver}
                        onToggleSection={toggleSection}
                        onContextMenu={handleContextMenu}
                    />
                ))}
            </div>
            
            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    node={contextMenu.node}
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
});

NodeList.displayName = 'NodeList';

// Node Editor Component
const NodeEditor = ({ node }: { node: Node }) => {
    return (
        <div className="space-y-1 py-3 flex-1 flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1 min-h-0">
                {/* Empty editing area - ready for future content */}
            </div>
        </div>
    );
};

interface LayoutPanelProps {
    pageDefinition?: any;
    pageDefinitionState?: { isLoading: boolean; isRefetching?: boolean };
    siteSettings?: any;
    onActivePanelChange: (panel: string) => void;
}

export const LayoutPanel = ({ 
    pageDefinition, 
    pageDefinitionState,
    siteSettings,
    onActivePanelChange
}: LayoutPanelProps) => {
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [layoutDebugMode] = useAtom(layoutDebugModeAtom);
    const [panelWidth, setPanelWidth] = useState(300); // Default width
    const panelRef = useRef<HTMLDivElement>(null);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    const { iframeCommunicationManager } = useIframeCommunicationContext();

    // Effect to listen for messages from iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if(!pageDefinition) return;
            
            if (event.data.type === 'EDIT_NODE') {
                const { node } = event.data.payload;

                // set selected node to the node that is being edited
                console.log('[LayoutPanel] Editing node:', node);
                if(node) {
                    setSelectedNode(node);
                }

                onActivePanelChange("layout");
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [pageDefinition]);

    // Effect for hover interactions
    useEffect(() => {
        if (hoveredNodeId && pageDefinition?.nodes) {
            // Find the actual node object from the hoveredNodeId
            const findNodeById = (nodes: Node[], targetId: string): Node | null => {
                for (const node of nodes) {
                    if (node.id === targetId) {
                        return node;
                    }
                    if ('children' in node && node.children) {
                        const found = findNodeById(node.children as Node[], targetId);
                        if (found) return found;
                    }
                }
                return null;
            };

            const hoveredNode = findNodeById(pageDefinition.nodes, hoveredNodeId);
            if (hoveredNode && iframeCommunicationManager) {
                iframeCommunicationManager.sendLayoutNodeInteraction({
                    interactionType: 'hover',
                    node: hoveredNode
                });
            }
        }
    }, [hoveredNodeId, pageDefinition, iframeCommunicationManager]);

    // Effect for select interactions
    useEffect(() => {
        if (iframeCommunicationManager) {
            if (selectedNode) {
                console.log('[LayoutPanel] Selected node:', selectedNode);
                iframeCommunicationManager.sendLayoutNodeInteraction({
                    interactionType: 'select',
                    node: selectedNode
                });
            } else {
                console.log('[LayoutPanel] Deselecting node');
                iframeCommunicationManager.sendLayoutNodeInteraction({
                    interactionType: 'deselect'
                });
            }
        }
    }, [selectedNode, iframeCommunicationManager]);

    const handleRename = () => {
        // TODO: Implement rename functionality
        console.log('Rename node:', selectedNode?.id);
        setShowContextMenu(false);
    };

    const handleDelete = () => {
        // TODO: Implement delete functionality
        console.log('Delete node:', selectedNode?.id);
        setShowContextMenu(false);
    };

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Element)) {
                setShowContextMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ResizeObserver to listen for actual panel resizing
    useEffect(() => {
        if (!panelRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                setPanelWidth(width);
            }
        });

        resizeObserver.observe(panelRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // Use the iframe page definition data directly
    const isLoading = pageDefinitionState?.isLoading || false;
    
    // Memoize sorted nodes to avoid sorting on every render
    const sortedNodes = useMemo(() => {
        if (!pageDefinition?.nodes) return [];
        return [...pageDefinition.nodes].sort((a: any, b: any) => a.order - b.order);
    }, [pageDefinition?.nodes]);

    if (isLoading) {
        return (
            <div ref={panelRef} className="bg-white flex flex-col overflow-hidden p-4" 
            style={{ height: 'calc(100dvh - 56px)' }}>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="animate-spin mx-auto mb-4 w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                        <div className="text-gray-600">Loading page structure...</div>
                    </div>
                </div>
            </div>
        );
    }

    // Determine the body content based on debug mode and selected node
    const renderBodyContent = () => {
        if (layoutDebugMode === 'raw') {
            return (
                <div className="flex-1 overflow-auto">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-200">
                        {JSON.stringify(pageDefinition, null, 2)}
                    </pre>
                </div>
            );
        }

        if (selectedNode) {
            return (
                <NodeEditor 
                    node={selectedNode} 
                />
            );
        }

        if (pageDefinition?.nodes && pageDefinition.nodes.length > 0) {
            return (
                <NodeList 
                    nodes={sortedNodes} 
                    onNodeSelect={setSelectedNode}
                    onNodeHover={setHoveredNodeId}
                    panelWidth={panelWidth}
                    hoveredNodeId={hoveredNodeId}
                />
            );
        }

        return (
            <div className="text-gray-500 text-center text-sm flex items-center justify-center h-full">
                No page structure data yet. Make changes in the editor to see the hierarchy here.
            </div>
        );
    };

    return (
        <div ref={panelRef} className="bg-white flex flex-col overflow-hidden" 
        style={{ height: 'calc(100dvh - 56px)' }}>
            {/* Page Name Header */}
            {(pageDefinition?.name || selectedNode) && (
                <div className={`p-4 border-b border-gray-200 ${selectedNode ? 'pl-2' : ''}`}>
                    <div className="flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                            {selectedNode && (
                                <button
                                    onClick={() => setSelectedNode(null)}
                                    className="relative top-px flex items-center justify-center w-6 h-6 text-[#595959] hover:bg-gray-200 rounded transition-colors">
                                    <ChevronLeft className="w-4 h-4" strokeWidth={2} />
                                </button>
                            )}
                            <h2 className="text-sm font-bold text-[#595959]" style={{ fontFamily: 'var(--font-body)' }}>
                                {selectedNode ? selectedNode.name || selectedNode.id : pageDefinition.name}
                            </h2>
                        </div>

                        {/* Three dots menu - only show when editing a node */}
                        {selectedNode && (
                            <div className="flex flex-col relative top-0.5"
                            ref={contextMenuRef}>
                                <button
                                    onClick={() => setShowContextMenu(!showContextMenu)}
                                    className="flex items-center justify-center w-6 h-6 text-[#595959] hover:bg-gray-200 rounded transition-colors"
                                >
                                    <MoreHorizontal className="w-5 h-5" strokeWidth={2} />
                                </button>

                                {/* Context menu dropdown */}
                                {showContextMenu && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] z-50">
                                        <button
                                            onClick={handleRename}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <Edit className="w-4 h-4 text-blue-600" />
                                            Rename
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                            )}
                        </div>
                    </div>
                    {layoutDebugMode === 'raw' && (
                        <div className="text-sm text-gray-500 mt-1">Raw JSON View</div>
                    )}
                </div>
            )}

            {/* SmartishEditor Content */}
            {selectedNode ? (
                <div className="flex-1 flex flex-col min-h-0 overflow-auto">
                    <SmartishEditor node={selectedNode} siteSettings={siteSettings} pageDefinitionNodes={pageDefinition?.nodes} />
                </div>
            ): (
            <div className="px-2 flex-1 flex flex-col min-h-0">
            {/* Body Content - conditional based on debug mode and state */}
                {renderBodyContent()}
            </div>
            )}
            
        </div>
    );
}; 
