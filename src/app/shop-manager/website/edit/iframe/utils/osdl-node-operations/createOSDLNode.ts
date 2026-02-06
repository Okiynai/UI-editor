import { PageDefinition } from "@/OSDL/OSDL.types";
import { AgentChange } from "@/store/editor";
import { undo, redo, UNREObjectInterface } from "../undo-redo";

export interface CreateOSDLNodeDependencies {
  setPageDefinition: (pageDefinition: PageDefinition | ((prev: PageDefinition | null) => PageDefinition | null)) => void;
  addToUndoStack: (operation: UNREObjectInterface) => void;
}

const createOSDLNode = (
  node: any,
  parentId: string,
  deps: CreateOSDLNodeDependencies,
  isAgentRequest?: boolean
): { success: boolean; error?: string; nodeName?: string; nodeId?: string; childNodeIds?: string[]; childNodeNames?: string[]; change?: AgentChange | null } => {
  console.log('[IframePage] Creating OSDL node:', { node, parentId });

  let localChange: AgentChange | null = null;

  if (!node || typeof node !== 'object') {
    console.error("[IframePage] createOSDLNode received invalid data. Aborting.", node);
    return { success: false, error: "Invalid node data provided", childNodeIds: [], childNodeNames: [] };
  }

  if (node.order == undefined || node.order == null) {
    console.error("[IframePage] Node was missing an 'order'");
    return { success: false, error: "Node was missing an 'order'", childNodeIds: [], childNodeNames: [] };
  }

  if (node.type == undefined || node.type == null) {
    console.error("[IframePage] Node was missing a 'type'");
    return { success: false, error: "Node was missing a 'type'", childNodeIds: [], childNodeNames: [] };
  }
  if (node.type !== 'atom' && node.type !== 'section' && node.type !== 'component') {
    console.error("[IframePage] Node type was invalid");
    return { success: false, error: "Node type was invalid", childNodeIds: [], childNodeNames: [] };
  }
  if (node.type === 'atom') {
    // Check if atomType is at top level (correct according to interface)
    if (node.atomType == undefined || node.atomType == null) {
      console.error("[IframePage] Node was missing an 'atomType' at top level");
      return { success: false, error: "Node was missing an 'atomType' at top level", childNodeIds: [], childNodeNames: [] };
    }
    // Check if atomType is incorrectly placed inside params
    if (node.params && node.params.atomType !== undefined) {
      console.error("[IframePage] Node has 'atomType' incorrectly placed inside 'params'");
      return { success: false, error: "Node has 'atomType' incorrectly placed inside 'params' - it should be at the top level of the node", childNodeIds: [], childNodeNames: [] };
    }
  }
  if (node.type === 'component') {
    // Require componentType at top level
    if (node.componentType == undefined || node.componentType == null) {
      console.error("[IframePage] Component node was missing a 'componentType' at top level");
      return { success: false, error: "Component node was missing a 'componentType' at top level", childNodeIds: [], childNodeNames: [] };
    }
  }

  if (node.type === 'section' && node.layout == undefined || node.type === 'section' && node.layout == null) {
    console.error("[IframePage] Node was missing a 'layout'");
    return { success: false, error: "Node was missing a 'layout'", childNodeIds: [], childNodeNames: [] };
  }


  // Arrays to collect all generated node IDs and names (including children)
  const allNodeIds: string[] = [];
  const allNodeNames: string[] = [];

  // Array to collect all validation errors
  const validationErrors: string[] = [];

  // Helper function to validate RQL dataRequirements and repeater configuration
  const validateRQLConfiguration = (n: any, nodePath: string, parentDataRequirements: any[] = []) => {
    // Check if node has dataRequirements
    if (n.dataRequirements && Array.isArray(n.dataRequirements)) {
      n.dataRequirements.forEach((req: any, index: number) => {
        const reqPath = `${nodePath}.dataRequirements[${index}]`;
        
        // Validate required fields
        if (!req.key) {
          validationErrors.push(`${reqPath}: Missing required 'key' field`);
        }
        if (!req.source || req.source.type !== 'rql') {
          validationErrors.push(`${reqPath}: Missing or invalid 'source' field (must be type 'rql')`);
        }
        if (req.source?.queries && typeof req.source.queries === 'object') {
          Object.entries(req.source.queries).forEach(([queryName, query]: [string, any]) => {
            const queryPath = `${reqPath}.source.queries.${queryName}`;
            
            // Check for missing contract field (critical for RQL to work)
            if (!query.contract) {
              validationErrors.push(`${queryPath}: Missing required 'contract' field - RQL queries must specify which contract to execute`);
            }
            
            // Check for missing select field
            if (!query.select || typeof query.select !== 'object') {
              validationErrors.push(`${queryPath}: Missing or invalid 'select' field - RQL queries must specify what data to return`);
            }
          });
        }
      });
    }

    // Check if node has repeater (for dynamic content)
    if (n.repeater) {
      const repeaterPath = `${nodePath}.repeater`;
      
      if (!n.repeater.source) {
        validationErrors.push(`${repeaterPath}: Missing required 'source' field`);
      }
      if (!n.repeater.template) {
        validationErrors.push(`${repeaterPath}: Missing required 'template' field`);
      }
      
      // Validate repeater source path format for RQL data
      if (n.repeater.source) {
        const sourcePath = n.repeater.source;
        const expectedPattern = /^nodeData\.[^.]+\.([^.]+)\.[^.]+$/;
        
        if (!expectedPattern.test(sourcePath)) {
          validationErrors.push(`${repeaterPath}: Invalid source path format. Expected: 'nodeData.{key}.{queryName}.{field}' but got: '${sourcePath}'`);
        }
        
        // Check if source path references valid dataRequirements (either from this node or parent)
        const sourceParts = sourcePath.split('.');
        if (sourceParts.length >= 3) {
          const key = sourceParts[1];
          const queryName = sourceParts[2];
          
          // Check this node's dataRequirements first
          let hasMatchingDataReq = false;
          if (n.dataRequirements) {
            hasMatchingDataReq = n.dataRequirements.some((req: any) => 
              req.key === key && req.source?.queries?.[queryName]
            );
          }
          
          // If not found in this node, check parent's dataRequirements
          if (!hasMatchingDataReq && parentDataRequirements.length > 0) {
            hasMatchingDataReq = parentDataRequirements.some((req: any) => 
              req.key === key && req.source?.queries?.[queryName]
            );
          }
          
                      if (!hasMatchingDataReq) {
              validationErrors.push(`${repeaterPath}: CRITICAL Repeater Error - cannot reference '${sourcePath}' because no dataRequirements exist for key '${key}' and query '${queryName}'. You have 2 options:\n\n1. ADD dataRequirements to THIS section:\n   "dataRequirements": [{\n     "key": "${key}",\n     "source": {\n       "type": "rql",\n       "queries": {\n         "${queryName}": {\n           "contract": "products.get",\n           "params": {"limit": 10},\n           "select": {"products": true}\n         }\n       }\n     }\n   }]\n\n2. ENSURE parent section has dataRequirements first, then create child with repeater.\n\nThe repeater cannot work without data to iterate over!`);
            }
        }
      }
    }
  };

  // Recursive helper function to ensure every node in the tree has an ID.
  const sanitizeNodeTree = (n: any, nodePath: string = 'root', parentDataRequirements: any[] = []) => {
    console.log(`[IframePage] Sanitizing node at ${nodePath}:`, { id: n.id, type: n.type, name: n.name });

    // 1. Enforce Random IDs
    n.id = `agent_node_${Math.random() * 1e10}`;
    console.log(`[IframePage] Assigned new ID to node: ${n.id}`);

    // 2. Collect the generated ID and determine a meaningful name
    allNodeIds.push(n.id);

    // Try to create a meaningful name based on node properties
    let meaningfulName = n.name;

    if (!meaningfulName) {
      // For atoms, try to use content or atomType
      if (n.type === 'atom') {
        if (n.params?.content) {
          meaningfulName = `${n.atomType || 'Atom'}: ${n.params.content.substring(0, 20)}`;
        } else {
          meaningfulName = n.atomType || `${n.type}_${n.id.slice(-6)}`;
        }
      }
      // For sections, try to use a descriptive name
      else if (n.type === 'section') {
        meaningfulName = `Section_${n.id.slice(-6)}`;
      }
      // Fallback to type + partial ID
      else {
        meaningfulName = `${n.type}_${n.id.slice(-6)}`;
      }
    }

    allNodeNames.push(meaningfulName);
    console.log(`[IframePage] Node name determined: ${meaningfulName}`);

    // 3. Ensure children array exists if it's a container type.
    if (n.type === 'section' && !Array.isArray(n.children)) {
      n.children = [];
    }

    // 4. Validate RQL configuration for this node (pass parent dataRequirements)
    validateRQLConfiguration(n, nodePath, parentDataRequirements);

    // 5. Recursively sanitize all children and validate their properties.
    if (Array.isArray(n.children)) {
      console.log(`[IframePage] Processing ${n.children.length} children for node ${n.id}`);
      n.children.forEach((childNode: any, index: number) => {
        const childPath = `${nodePath}.children[${index}]`;
        console.log(`[IframePage] Processing child ${index} at ${childPath}:`, { type: childNode.type, name: childNode.name });

        // Validate child node properties and collect errors instead of throwing
        if (childNode.type === 'section' && (childNode.layout === undefined || childNode.layout === null)) {
          const errorMsg = `${childPath}: Section node is missing a 'layout' property`;
          validationErrors.push(errorMsg);
          console.error(`[IframePage] Child validation error: ${errorMsg}`);
        }
        if (childNode.type === 'atom') {
          // Check if atomType is at top level (correct according to interface)
          if (childNode.atomType === undefined || childNode.atomType === null) {
            const errorMsg = `${childPath}: Atom node is missing an 'atomType' property at the top level`;
            validationErrors.push(errorMsg);
            console.error(`[IframePage] Child validation error: ${errorMsg}`);
          }
          // Check if atomType is incorrectly placed inside params
          if (childNode.params && childNode.params.atomType !== undefined) {
            const errorMsg = `${childPath}: Atom node has 'atomType' incorrectly placed inside 'params' - it should be at the top level of the node`;
            validationErrors.push(errorMsg);
            console.error(`[IframePage] Child validation error: ${errorMsg}`);
          }
        }

        // Continue sanitizing even if there are validation errors
        console.log(`[IframePage] Recursively sanitizing child ${index}`);
        // Pass current node's dataRequirements + parent's dataRequirements to children
        const currentDataRequirements = n.dataRequirements || [];
        const allParentDataRequirements = [...parentDataRequirements, ...currentDataRequirements];
        sanitizeNodeTree(childNode, childPath, allParentDataRequirements);
      });
    } else {
      console.log(`[IframePage] No children to process for node ${n.id}`);
    }

    // 6. If params is undefined, and type is section, set it to an empty object
    if (n.type === 'section' && n.params === undefined) {
      n.params = {};
    }
    
    return n; // Return the sanitized node
  };

  try {
    node = sanitizeNodeTree(node);
    
    // Check if there were any validation errors collected
    if (validationErrors.length > 0) {
      const errorMessage = `Validation errors found:\n${validationErrors.join('\n')}`;
      console.error(`[IframePage] Node validation failed: ${errorMessage}`);
      console.error(`[IframePage] Total validation errors: ${validationErrors.length}`);
      console.error(`[IframePage] Node creation will be aborted due to validation errors`);

      // Notify parent of the validation failure with detailed error information
      setTimeout(() => {
        window.parent.postMessage({
          type: 'STATE_CHANGED',
          payload: {
            type: 'action_failed',
            sectionId: node.id,
            error: errorMessage
          }
        }, '*');
      }, 0);

      return { success: false, error: errorMessage, childNodeIds: [], childNodeNames: [] };
    } else {
      console.log(`[IframePage] Node validation passed - no errors found. Proceeding with creation.`);
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[IframePage] Error during node sanitization: ${errorMessage}`);

    // Notify parent of the sanitization failure
    setTimeout(() => {
      window.parent.postMessage({
        type: 'STATE_CHANGED',
        payload: {
          type: 'action_failed',
          sectionId: node?.id,
          error: `Node sanitization failed: ${errorMessage}`
        }
      }, '*');
    }, 0);

    return { success: false, error: `Node sanitization failed: ${errorMessage}`, childNodeIds: [], childNodeNames: [] };
  }
  
  let success = false;
  let error: string | undefined;
  let nodeName = node.name || node.id;
  let nodeId = node.id;
  
  try {
    // Use error tracking like applyDiff does
    let creationError: string | undefined;
    let undoOperation: UNREObjectInterface | null = null;
    
    deps.setPageDefinition(prevPageDef => {
      if (!prevPageDef) {
        creationError = "Page definition is null";
        return prevPageDef;
      }
      
      // Deep clone the page definition
      const newPageDef = JSON.parse(JSON.stringify(prevPageDef));
      
      // Find the parent node to append to
      const findParentNode = (nodes: any[], targetId: string): any => {
        for (const nodeItem of nodes) {
          if (nodeItem.id === targetId) {
            return nodeItem;
          }
          
          if (nodeItem.children && Array.isArray(nodeItem.children)) {
            const found = findParentNode(nodeItem.children, targetId);
            if (found) return found;
          }
        }
        return null;
      };
      
      // Handle root-level nodes
      if (parentId === 'root') {
        // Check for order conflicts at root level
        const existingNodeWithSameOrder = newPageDef.nodes.find((existingNode: any) => existingNode.order === node.order);
        if (existingNodeWithSameOrder) {
          console.warn(`[IframePage] Order conflict: Node with order ${node.order} already exists at root level (${existingNodeWithSameOrder.id})`);
          creationError = `Order conflict: A node with order ${node.order} already exists at root level. Consider using a different order value.`;
          return prevPageDef;
        }

        // Add to the root nodes array
        newPageDef.nodes.push(node);
        console.log('[IframePage] Successfully added node to root level');
        // No error means success
      } else {
        // Find the parent node
        const parentNode = findParentNode(newPageDef.nodes, parentId);

        if (!parentNode) {
          console.error(`[IframePage] Parent node with id "${parentId}" not found`);
          creationError = `Parent node with id "${parentId}" not found`;
          return prevPageDef;
        }

        // CRITICAL VALIDATION: Check if child has repeater but parent lacks dataRequirements
        if (node.repeater && node.repeater.source) {
          const sourcePath = node.repeater.source;
          const sourceParts = sourcePath.split('.');
          if (sourceParts.length >= 3) {
            const key = sourceParts[1];
            const queryName = sourceParts[2];

            // Check if parent has dataRequirements that match the repeater source
            const hasMatchingDataReq = parentNode.dataRequirements && parentNode.dataRequirements.some((req: any) =>
              req.key === key && req.source?.queries?.[queryName]
            );

            if (!hasMatchingDataReq) {
              console.error(`[IframePage] CRITICAL: Child node has repeater referencing '${sourcePath}' but parent "${parentId}" lacks matching dataRequirements. Parent must have dataRequirements with key '${key}' and query '${queryName}' before child with repeater can be added.`);
              creationError = `CRITICAL: Repeater error - cannot reference '${sourcePath}' because no dataRequirements exist for key '${key}' and query '${queryName}'. You have 2 options:\n\n1. ADD dataRequirements to THIS section (recommended for standalone sections):\n   "dataRequirements": [{\n     "key": "${key}",\n     "source": {\n       "type": "rql",\n       "queries": {\n         "${queryName}": {\n           "contract": "products.get",\n           "params": {"limit": 10},\n           "select": {"products": true}\n         }\n       }\n     }\n   }]\n\n2. ENSURE parent section "${parentId}" has dataRequirements first, then create child with repeater.\n\nThe repeater cannot work without data to iterate over!`;
              return prevPageDef;
            }
          }
        }

        // Ensure parent has children array
        if (!parentNode.children) {
          parentNode.children = [];
        }

        // Check for order conflicts within parent's children
        const existingChildWithSameOrder = parentNode.children.find((existingChild: any) => existingChild.order === node.order);
        if (existingChildWithSameOrder) {
          console.warn(`[IframePage] Order conflict: Child with order ${node.order} already exists in parent "${parentId}" (${existingChildWithSameOrder.id})`);
          creationError = `Order conflict: A child node with order ${node.order} already exists in parent "${parentId}". Consider using a different order value.`;
          return prevPageDef;
        }

        // Add the new node to parent's children
        parentNode.children.push(node);
        console.log(`[IframePage] Successfully added node to parent "${parentId}"`);
        // No error means success
      }

      // Record pending change for 'create' - always create the change object
      const change: AgentChange = {
        id: crypto.randomUUID(),
        operation: 'create',
        targetScope: 'node',
        nodeId,
        nodeName,
        parentId,
        nodeData: JSON.parse(JSON.stringify(node)), // Store full node data for redo
        modifiedNode: JSON.parse(JSON.stringify(node)), // The created node is the "modified" state
        sectionId: nodeId,
        timestamp: Date.now(),
      };
      localChange = change;
   
      // Create the undo operation only if this is not an agent request
      if (!isAgentRequest) {
        undoOperation = {
          type: 'create_node',
          executionContext: 'iframe',
          metadata: {
            operation: 'create',
            nodeId,
            nodeName,
            parentId,
            nodeType: node.type,
            timestamp: Date.now(),
            // Store the full node data for redo
            nodeData: JSON.parse(JSON.stringify(node))
          },
          undo: async (metadata: any, context: any) => {
            return undo(metadata, context);
          },
          redo: async (metadata: any, context: any) => {
            return redo(metadata, context);
          }
        };
      }
      
      return newPageDef;
    });
    
    // Add to undo stack outside of the state setter to avoid React re-render issues
    if (undoOperation && !isAgentRequest) {
      deps.addToUndoStack(undoOperation);
    }
    
    // Determine success based on whether an error occurred (like applyDiff does)
    if (creationError) {
      console.log('[IframePage] Node creation failed with error:', creationError);
      success = false;
      error = creationError;
    } else {
      console.log('[IframePage] Node creation succeeded, no error detected');
      success = true;
    }
    
  } catch (e) {
    error = `Exception during node creation: ${e}`;
    console.error(`[IframePage] ${error}`);
    success = false;
  }
  
  // Ensure we have a proper error message if success is false but no error was set
  if (!success && !error) {
    error = "Node creation failed for unknown reason. This may be due to a state update issue or validation failure.";
    console.error(`[IframePage] ${error}`);
  }
  
  // Log final result for debugging
  console.log(`[IframePage] Final createOSDLNode result: success=${success}, error=${error}, nodeId=${nodeId}, nodeName=${nodeName}`);
  
  // Extract child node IDs and names (all except the main node)
  const childNodeIds = allNodeIds.length > 1 ? allNodeIds.slice(1) : [];
  const childNodeNames = allNodeNames.length > 1 ? allNodeNames.slice(1) : [];
  
  return { success, error, nodeName, nodeId, childNodeIds, childNodeNames, change: localChange };
};

export default createOSDLNode; 
