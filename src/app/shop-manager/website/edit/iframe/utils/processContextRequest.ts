import { PageDefinition, SiteSettings } from "@/OSDL/OSDL.types";

const findNodeRecursive = (nodes: any[], targetId: string): any | null => {
    for (const node of nodes) {
        if (node.id === targetId) return node;
        if (node.children) {
            const found = findNodeRecursive(node.children, targetId);
            if (found) return found;
        }
    }
    return null;
};

// Enhanced search functions for new capabilities
const searchNodesByOrder = (nodes: any[], targetOrder: number, location: 'root' | 'all' | 'node_id', parentId?: string): any[] => {
    const results: any[] = [];
    
    const searchInNodes = (nodeList: any[], parentNodeId?: string) => {
        for (const node of nodeList) {
            // Check if this node matches the order criteria
            if (node.order === targetOrder) {
                // Check location constraints
                if (location === 'root' && !parentNodeId) {
                    results.push({ ...node, parent_id: parentNodeId || 'root' });
                } else if (location === 'all') {
                    results.push({ ...node, parent_id: parentNodeId || 'root' });
                } else if (location === 'node_id' && parentId && parentNodeId === parentId) {
                    results.push({ ...node, parent_id: parentNodeId });
                }
            }
            
            // Recursively search in children if we're searching all or in a specific node
            if (node.children && (location === 'all' || (location === 'node_id' && parentId))) {
                searchInNodes(node.children, node.id);
            }
        }
    };
    
    searchInNodes(nodes);
    return results;
};

const searchNodesByType = (nodes: any[], targetTypes: string[], location: 'root' | 'all' | 'node_id', parentId?: string): any[] => {
    const results: any[] = [];
    
    const searchInNodes = (nodeList: any[], parentNodeId?: string) => {
        for (const node of nodeList) {
            // Check if this node matches the type criteria
            if (targetTypes.includes(node.type)) {
                // Check location constraints
                if (location === 'root' && !parentNodeId) {
                    results.push({ ...node, parent_id: parentNodeId || 'root' });
                } else if (location === 'all') {
                    results.push({ ...node, parent_id: parentNodeId || 'root' });
                } else if (location === 'node_id' && parentId && parentNodeId === parentId) {
                    results.push({ ...node, parent_id: parentNodeId });
                }
            }
            
            // Recursively search in children if we're searching all or in a specific node
            if (node.children && (location === 'all' || (location === 'node_id' && parentId))) {
                searchInNodes(node.children, node.id);
            }
        }
    };
    
    searchInNodes(nodes);
    return results;
};

const searchNodesByCriteria = (nodes: any[], criteria: any, location: 'root' | 'all' | 'node_id', parentId?: string): any[] => {
    const results: any[] = [];
    
    const searchInNodes = (nodeList: any[], parentNodeId?: string) => {
        for (const node of nodeList) {
            let matches = true;
            
            // Check order criteria
            if (criteria.order !== undefined && node.order !== criteria.order) {
                matches = false;
            }
            
            // Check type criteria
            if (criteria.types && !criteria.types.includes(node.type)) {
                matches = false;
            }
            
            // Check name criteria
            if (criteria.name_contains && (!node.name || !node.name.toLowerCase().includes(criteria.name_contains.toLowerCase()))) {
                matches = false;
            }
            
            // Check children criteria
            if (criteria.has_children !== undefined) {
                const hasChildren = node.children && node.children.length > 0;
                if (criteria.has_children !== hasChildren) {
                    matches = false;
                }
            }
            
            // If all criteria match, check location constraints
            if (matches) {
                if (location === 'root' && !parentNodeId) {
                    results.push({ ...node, parent_id: parentNodeId || 'root' });
                } else if (location === 'all') {
                    results.push({ ...node, parent_id: parentNodeId || 'root' });
                } else if (location === 'node_id' && parentId && parentNodeId === parentId) {
                    results.push({ ...node, parent_id: parentNodeId });
                }
            }
            
            // Recursively search in children if we're searching all or in a specific node
            if (node.children && (location === 'all' || (location === 'node_id' && parentId))) {
                searchInNodes(node.children, node.id);
            }
        }
    };
    
    searchInNodes(nodes);
    return results;
};

export const processContextRequestUtil = (scope: string, details: any, pageDefinition: PageDefinition | null, editableSiteSettings: SiteSettings | null) => {
    console.log("processContextRequest", scope, details);
    console.log("processContextRequest pageDefinition", pageDefinition);
    if (!pageDefinition && (scope !== 'site_settings')) {
        console.error("Cannot process context request: pageDefinition is not loaded.");
        return { error: "Page not loaded" };
    }
    if (!pageDefinition) {
        console.error("Cannot process context request: pageDefinition is not loaded.");
        return { error: "Page not loaded" };
    }

    switch (scope) {
        case 'root_with_children':
            // Replicates _fetch_root_with_children
            const rootNodes = pageDefinition.nodes.map((node: any) => {
                const nodeCopy = { ...node };
                if (nodeCopy.children) {
                    nodeCopy.children = nodeCopy.children.map((child: any) => ({ ...child, children: undefined }));
                }
                return nodeCopy;
            });
            return { 
                osdl_nodes: rootNodes,
                search_metadata: {
                    scope: 'root_with_children',
                    criteria: { location: 'root' },
                    result_count: rootNodes.length
                }
            };

        case 'specific_nodes':
            // Replicates _fetch_specific_nodes
            const foundNodes: Record<string, any> = {};
            const foundNodesArray: any[] = [];
            details.node_ids.forEach((nodeId: string) => {
                const node = findNodeRecursive(pageDefinition.nodes, nodeId);
                if (node) {
                    foundNodes[nodeId] = node;
                    foundNodesArray.push({ ...node, parent_id: 'root' }); // Add parent_id for consistency
                }
            });
            return { 
                osdl_nodes: foundNodesArray, // Return as array for consistency
                search_metadata: {
                    scope: 'specific_nodes',
                    criteria: { node_ids: details.node_ids },
                    result_count: foundNodesArray.length
                }
            };

        case 'search_by_order':
            // NEW: Search for nodes with specific order values
            const { order, location, parent_id } = details;
            const orderResults = searchNodesByOrder(pageDefinition.nodes, order, location, parent_id);
            return { 
                osdl_nodes: orderResults,
                search_metadata: {
                    scope: 'search_by_order',
                    criteria: { order, location, parent_id },
                    result_count: orderResults.length
                }
            };

        case 'search_by_type':
            // NEW: Search for nodes of specific types
            const { types, location: typeLocation, parent_id: typeParentId } = details;
            const typeResults = searchNodesByType(pageDefinition.nodes, types, typeLocation, typeParentId);
            return { 
                osdl_nodes: typeResults,
                search_metadata: {
                    scope: 'search_by_type',
                    criteria: { types, location: typeLocation, parent_id: typeParentId },
                    result_count: typeResults.length
                }
            };

        case 'search_by_criteria':
            // NEW: Advanced search with multiple criteria
            const { criteria, location: criteriaLocation, parent_id: criteriaParentId } = details;
            const criteriaResults = searchNodesByCriteria(pageDefinition.nodes, criteria, criteriaLocation, criteriaParentId);
            return { 
                osdl_nodes: criteriaResults,
                search_metadata: {
                    scope: 'search_by_criteria',
                    criteria: { ...criteria, location: criteriaLocation, parent_id: criteriaParentId },
                    result_count: criteriaResults.length
                }
            };

        case 'page_settings':
            // Replicates get_page_settings
            const { nodes, ...settings } = pageDefinition;
            return settings;

        case 'site_settings':
            // Replicates get_site_settings
            return editableSiteSettings;

        default:
            return { error: `Unknown context scope: ${scope}` };
    }
};