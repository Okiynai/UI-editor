import { ParentToIframeMessage, SiteSettingsChangedPayload } from "../../[sessId]/types/iframe-communication";
import { PageDefinition } from "@/OSDL/OSDL.types";
import { AgentChange } from "@/store/editor";
import { undoAgentChange, redoAgentChange } from "./rejectAgentChange";
import { undoSiteSettings, redoSiteSettings, undo, redo, UNREObjectInterface } from "./undo-redo";

export interface HandleMessageDependencies {
  setCurrentLocale: (locale: string) => void;
  setIsRTL: (isRTL: boolean) => void;
  setIsInspectMode: (enabled: boolean) => void;
  setPageDefinition: (pageDefinition: PageDefinition | ((prev: PageDefinition | null) => PageDefinition | null)) => void;
  setEditingSections: (sections: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setUserInfoOverride?: (user: any | undefined) => void;
  applyDiff: (payload: {
    diffType: 'node' | 'page' | 'site';
    targetId: string;
    propertyPath: string;
    searchValue: string;
    replaceValue: string;
    sectionId?: string;
    sectionTitle?: string;
    actionId?: string;
    isAgentRequest?: boolean;
  }) => { success: boolean; error?: string; change?: AgentChange | null };
  loadPage: (pageRoute: string, subDomain: string) => Promise<void>;
  createOSDLNode: (node: any, parentId: string, isAgentRequest?: boolean) => { success: boolean; error?: string; nodeName?: string; nodeId?: string; childNodeIds?: string[]; childNodeNames?: string[]; change?: AgentChange | null };
  applyPreBuiltSection: (sectionId: string, parentId: string, name: string, order: number, isAgentRequest?: boolean) => Promise<{ success: boolean; error?: string; sectionId?: string; name?: string }>;
  deleteOSDLNode: (nodeId: string, isAgentRequest?: boolean) => { success: boolean; error?: string; change?: AgentChange | null };
  duplicateOSDLNode: (nodeId: string) => void;
  handleSiteSettingsChange: (payload: SiteSettingsChangedPayload) => { originalSettings: any; modifiedSettings: any } | null;
  saveMutation: {
    mutate: (params: { shopId: string }) => void;
  };
  processContextRequest: (scope: string, details: any) => any;
  setSelectedNodes: (nodes: any) => void;
  setHoveredNodeId: (nodeId: string | null) => void;
  currentPageId: string | null;
  addToUndoStack: (operation: any) => void;
}

export const handleParentMessages = async (
  event: MessageEvent<ParentToIframeMessage>,
  deps: HandleMessageDependencies
) => {
  // In production, you should validate the origin
  // if (event.origin !== 'http://localhost:3000') return;
  
  const { type, payload } = event.data;
  
  switch (type) {
    case 'CHANGE_LOCALE':
      console.log('[IframePage] Changing locale:', payload.locale);
      deps.setCurrentLocale(payload.locale);
      deps.setIsRTL(payload.locale.startsWith('ar-') || payload.locale.startsWith('he-'));
      break;
      
    case 'INSPECT_ELEMENT':
      deps.setIsInspectMode(payload.enabled);
      break;
      
    case 'UNDO':
      // Handle undo operation
      console.log('[IframePage] Undo requested');
      break;
      
    case 'REDO':
      // Handle redo operation
      console.log('[IframePage] Redo requested');
      break;
      
    case 'UPDATE_PAGE_DEFINITION':
      deps.setPageDefinition(payload.pageDefinition);
      break;
      
    case 'SCREEN_SIZE_CHANGE':
      console.log('[IframePage] Screen size changed:', payload);
      // Handle screen size changes if needed
      break;
      
    case 'CHAT_CONTENT_UPDATE':
      console.log('[IframePage] Chat content update:', payload);
      // Handle chat content updates - this is where you'd apply AI-generated changes
      break;
      
    case 'SECTION_EDITING_START':
      console.log('[IframePage] Section editing started:', payload);
      deps.setEditingSections(prev => new Set(prev).add(payload.sectionId));
      break;
      
    case 'SECTION_EDITING_COMPLETE':
      console.log('[IframePage] Section editing completed:', payload);
      deps.setEditingSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(payload.sectionId);
        return newSet;
      });
      break;
      
    case 'APPLY_COMPLETE_DIFF':
      console.log('[IframePage] Applying complete diff:', payload);
      
      let diffResult;
      try {
        // Transform the payload to ensure required fields are present
        const transformedPayload = {
          diffType: payload.diffType || 'node', // Default to 'node' if not specified
          targetId: payload.targetId || payload.sectionId, // Use sectionId as targetId if targetId is missing
          propertyPath: payload.propertyPath,
          searchValue: payload.searchValue,
          replaceValue: payload.replaceValue,
          sectionId: payload.sectionId,
          sectionTitle: payload.sectionTitle,
          actionId: payload.actionId,
          isAgentRequest: payload.isAgentRequest
        };
        
        console.log('[IframePage] About to call applyDiff with transformed payload:', transformedPayload);
        diffResult = deps.applyDiff(transformedPayload);
        console.log('[IframePage] Diff result:', diffResult);
      } catch (error) {
        console.error('[IframePage] Error in applyDiff:', error);
        diffResult = { success: false, error: `applyDiff threw error: ${error}` };
      }
      
      // Ensure we have a valid result
      if (!diffResult) {
        console.error('[IframePage] applyDiff returned undefined!');
        diffResult = { success: false, error: 'applyDiff returned undefined' };
      }
      
      // Send the result back to the parent AFTER state commit tick to avoid race with live-context reads
      setTimeout(() => {
        window.parent.postMessage({
          type: 'DIFF_RESULT',
          payload: {
            success: diffResult.success,
            error: diffResult.error,
            diffPayload: payload,
            change: diffResult.change || null,
            actionId: payload.actionId // Pass through the actionId if available
          }
        }, '*');
      }, 0);
      break;
      
    case 'CLEAR_ALL_EDITING_STATES':
      console.log('[IframePage] Clearing all editing states');
      deps.setEditingSections(new Set());
      break;


    case 'REJECT_AGENT_CHANGES':
      console.log('[IframePage] Rejecting agent changes:', payload);
      
      if (payload?.all && payload?.agentChanges) {
        // If all is true, agentChanges is an array - loop over all changes and reject them
        (payload.agentChanges as AgentChange[]).forEach((change: AgentChange) => {
          undoAgentChange(change, { setPageDefinition: deps.setPageDefinition });
        });
      } else if (payload?.agentChanges) {
        // If not all, agentChanges is a map - check for the change ID and reject it
        const changeId = payload.changeId;
        if (changeId && (payload.agentChanges as Map<string, any>).get(changeId)) {
          const change = (payload.agentChanges as Map<string, any>).get(changeId) as AgentChange;
          undoAgentChange(change, { setPageDefinition: deps.setPageDefinition });
        }
      }
      
      // No local pending-change bookkeeping
      break;
      
    case 'CHANGE_PAGE':
      console.log('[IframePage] Page change requested:', payload.pageRoute);
      deps.loadPage(payload.pageRoute, payload.shopSubdomain);
      break;
      
    case 'CREATE_OSDL_NODE':
      console.log('[IframePage] Creating new OSDL node:', payload);
      
      let createResult;
      try {
        createResult = deps.createOSDLNode(payload.node, payload.parentId, payload.isAgentRequest);
        console.log('[IframePage] Create node result:', createResult);
      } catch (error) {
        console.error('[IframePage] Error in createOSDLNode:', error);
        createResult = { 
          success: false, 
          error: `Exception in createOSDLNode: ${error}`,
          nodeName: payload.node?.name || 'unknown',
          nodeId: null,
          change: createResult?.change || null,
          childNodeIds: [],
          childNodeNames: []
        };
      }
      
      // Validate the result object
      if (!createResult || typeof createResult !== 'object') {
        console.error('[IframePage] createOSDLNode returned invalid result:', createResult);
        createResult = {
          success: false,
          error: 'createOSDLNode returned invalid result',
          nodeName: payload.node?.name || 'unknown',
          nodeId: null,
          childNodeIds: [],
          childNodeNames: []
        };
      }
      
      // Send the result back to the parent after a tick to avoid race with state reads
      setTimeout(() => {
        // Build the success message including child node information
        let successMessage = `Node "${createResult.nodeName}" has been created with id "${createResult.nodeId}"`;
        if (createResult.success && createResult.childNodeIds && createResult.childNodeIds.length > 0) {
          // Create a formatted list of child nodes with both names and IDs
          const childNodeInfo = createResult.childNodeIds.map((id, index) => {
            const name = createResult.childNodeNames?.[index] || id;
            return `"${name}" (${id})`;
          }).join(', ');
          successMessage += `. Child nodes created: ${childNodeInfo}`;
        }
        
        const responsePayload = {
          success: createResult.success,
          error: createResult.error,
          nodeName: createResult.nodeName,
          nodeId: createResult.nodeId,
          childNodeIds: createResult.childNodeIds || [],
          childNodeNames: createResult.childNodeNames || [],
          change: createResult.change || null,
          message: createResult.success 
            ? successMessage 
            : (createResult.error || 'Node creation failed - this may be due to an order conflict or validation issue'),
          actionId: payload.actionId // Pass through the actionId if available
        };
        
        console.log('[IframePage] Sending CREATE_NODE_RESULT:', responsePayload);
        
        window.parent.postMessage({
          type: 'CREATE_NODE_RESULT',
          payload: responsePayload
        }, '*');
      }, 0);
      break;

    case 'ADD_PRE_BUILT_SECTION':
      console.log('[IframePage] Adding pre-built section:', payload);
      const preBuiltResult = await deps.applyPreBuiltSection(payload.sectionId, payload.parentId, payload.name, payload.order, payload.isAgentRequest);
      // Notify parent with a definitive result for unified feedback
      setTimeout(() => {
        window.parent.postMessage({
          type: 'ADD_PRE_BUILT_SECTION_RESULT',
          payload: {
            success: preBuiltResult.success,
            error: preBuiltResult.error,
            sectionId: preBuiltResult.sectionId || payload.sectionId,
            name: preBuiltResult.name || payload.name,
            createdSection: (preBuiltResult as any).createdSection,
            parentId: payload.parentId,
            order: payload.order,
            actionId: payload.actionId
          }
        }, '*');
      }, 0);
      break;

    case 'SAVE': {
      console.log('[IframePage] Save requested');
      const { shopId } = payload || {};
      if (!shopId) {
        console.warn('[IframePage] No shopId provided in SAVE payload.');
        window.parent.postMessage({ type: 'SAVE_FINISHED', payload: { success: false, error: 'No shopId' } }, '*');
        break;
      }
      
      // Parent owns pending changes; no local change management
      
      deps.saveMutation.mutate({ shopId });
      break;
    }
      
    case 'DELETE_OSDL_NODE':
      console.log('[IframePage] Deleting OSDL node:', payload.nodeId);
      const deleteResult = deps.deleteOSDLNode(payload.nodeId, payload.isAgentRequest);
      setTimeout(() => {
        window.parent.postMessage({
          type: 'DELETE_NODE_RESULT',
          payload: {
            success: true,
            nodeId: payload.nodeId,
            change: deleteResult?.change || null,
            actionId: payload.actionId
          }
        }, '*');
      }, 0);
      break;

    case 'UPDATE_NODE':
      // High-level scaffolding for node updates with deep merge and unset handling.
      // Expect payload shape: { nodeId: string, changes: Record<string, any> }
      const { nodeId, changes } = payload || {};
      if (!nodeId || !changes || typeof changes !== 'object') {
        console.warn('[IframePage] UPDATE_NODE payload invalid:', payload);
        break;
      }

      // For undo functionality, we need to capture the original node state
      let originalNode: any = null;
      let modifiedNode: any = null;

      try {
        deps.setPageDefinition((prev) => {
          if (!prev) return prev;

          // TODO: choose your preferred cloning strategy (structural sharing vs deep clone)
          const next = { ...prev, nodes: [...prev.nodes] } as PageDefinition;

          // 1) Find the node reference in the cloned structure and capture original state
          const targetNode = findNodeRef(next.nodes as any[], nodeId);
          if (!targetNode) {
            console.warn('[IframePage] UPDATE_NODE target not found:', nodeId);
            return prev;
          }

          // Capture original node state for undo functionality
          originalNode = JSON.parse(JSON.stringify(targetNode));

          // 2) Apply explicit unsets first (if present)
          if (Array.isArray(changes.__unset)) {
            for (const item of changes.__unset) {
              // item: { scope: 'responsive' | 'locale' | 'interaction', key: string, path: string }
              handleUnsetOverride(targetNode as any, item);
            }
          }

          // 3) Remove __unset from change set and deep-merge the rest
          const { __unset, ...toMerge } = changes as Record<string, any>;
          if (Object.keys(toMerge).length > 0) {
            deepMergeInto(targetNode as any, toMerge);
          }

          // Capture modified node state for undo functionality
          modifiedNode = JSON.parse(JSON.stringify(targetNode));

          // 4) Optional: notify parent a definition change happened (lightweight ack)
          // setTimeout(() => {
          //   window.parent.postMessage({ type: 'IFRAME_DATA_CHANGED', payload: { changeType: 'definition' } }, '*');
          // }, 0);

          return next;
        });
      } catch (err) {
        console.error('[IframePage] UPDATE_NODE failed:', err);
      }

      // Create undo operation if we successfully captured both original and modified states
      if (originalNode && modifiedNode) {
        // Use the node ID as the path - this represents a node-level operation
        const propertyPath = nodeId; // Use nodeId as path, similar to how applyDiff uses targetId

        const nodeUpdateUndoOperation: UNREObjectInterface = {
          type: 'modify_node',
          executionContext: 'iframe',
          metadata: {
            operation: 'modify',
            nodeId: nodeId,
            nodeName: originalNode.name || originalNode.id,
            originalNode: originalNode,
            modifiedNode: modifiedNode,
            propertyPath: propertyPath, // Use nodeId as path (this is what applyDiff actually does)
            searchValue: originalNode, // Full original node
            replaceValue: modifiedNode, // Full modified node
            timestamp: Date.now(),
          },
          undo: async (metadata: any, context: any) => {
            return undo(metadata, context);
          },
          redo: async (metadata: any, context: any) => {
            return redo(metadata, context);
          }
        };

        deps.addToUndoStack(nodeUpdateUndoOperation);
      }

      break;

    case 'DUPLICATE_OSDL_NODE':
      console.log('[IframePage] Duplicating OSDL node:', payload.nodeId);
      deps.duplicateOSDLNode(payload.nodeId);
      break;

    case 'SITE_SETTINGS_CHANGED':
      console.log('[IframePage] Site settings changed:', payload);

      // Handle the site settings change and capture original/modified states for undo
      const siteSettingsResult = deps.handleSiteSettingsChange(payload);

      if (siteSettingsResult) {
        // Create undo operation with captured original and modified settings
        const siteSettingsUndoOperation: UNREObjectInterface = {
          type: 'modify_site_settings',
          executionContext: 'iframe',
          metadata: {
            operation: 'site_settings_change',
            payload: payload,
            timestamp: Date.now(),
            originalSettings: siteSettingsResult.originalSettings,
            modifiedSettings: siteSettingsResult.modifiedSettings
          },
          undo: async (metadata: any, context: any) => {
            return undoSiteSettings(metadata, context);
          },
          redo: async (metadata: any, context: any) => {
            return redoSiteSettings(metadata, context);
          }
        };

        deps.addToUndoStack(siteSettingsUndoOperation);
      } else {
        // Fallback: just handle the change without undo
        deps.handleSiteSettingsChange(payload);
      }
      break;

    case 'REQUEST_LIVE_CONTEXT':
      // The iframe is being asked for a slice of its state
      console.log("[IframePage] Requesting live context:", payload);
      const contextSlice = deps.processContextRequest(payload.scope, payload.details);
      
      // Send the prepared data back to the parent (IframeCommunicationManager)
      window.parent.postMessage({
        type: 'LIVE_CONTEXT_RESPONSE',
        payload: {
          requestId: payload.requestId,
          context: contextSlice,
        },
      }, '*');
      break;

    case 'LAYOUT_NODE_INTERACTION':
      console.log("[IframePage] Layout node interaction:", payload);
      const { interactionType, node } = payload;
      
      if (interactionType === 'hover') {
        // Set the hovered node ID (we extract the ID from the full node)
        deps.setHoveredNodeId(node.id);
      } else if (interactionType === 'select') {
        // Set the selected node (single select, overriding any existing selection)
        const selectedNode = {
          pageId: deps.currentPageId || 'unknown', // We'll need to add this to deps
          nodeId: node.id,
          nodeName: node.name || (node.type === 'atom' ? node.atomType : node.type)
        };
        deps.setSelectedNodes([selectedNode]);
      } else if (interactionType === 'deselect') {
        // Clear the selected nodes
        deps.setSelectedNodes([]);
      }
      break;

    case 'AGENT_CHANGE_ACTION':
      console.log('[IframePage] Agent change action:', payload);
      const { action, actionId, change, all } = payload;
      
      if (action === 'undo') {
        if (all && payload?.agentChanges) {
          // If all is true, agentChanges is an array - loop over all changes and undo them
          (payload.agentChanges as AgentChange[]).forEach((singleChange: AgentChange) => {
            undoAgentChange(singleChange, { setPageDefinition: deps.setPageDefinition });
          });
        } else if (change) {
          // Handle single change case - undo the change
          undoAgentChange(change, { setPageDefinition: deps.setPageDefinition });
        }
        
      } else if (action === 'redo') {
        if (all && payload?.agentChanges) {
          // If all is true, agentChanges is an array - loop over all changes and redo them
          (payload.agentChanges as AgentChange[]).forEach((singleChange: AgentChange) => {
            redoAgentChange(singleChange, { setPageDefinition: deps.setPageDefinition });
          });
        } else if (change) {
          // Handle single change case - redo the change
          redoAgentChange(change, { setPageDefinition: deps.setPageDefinition });
        }
      }
      break;

    case 'DIFF_RESULT':
      // The iframe is reporting the result of a diff application
      console.log("[IframePage] Diff result:", payload);
      window.parent.postMessage({
        type: 'DIFF_RESULT',
        payload: payload
      }, '*');
      break;

    case 'USER_MODE_TOGGLE':
      console.log('[IframePage] User mode toggle received:', payload);
      // Provide dummy user data to DataContext when toggled on
      console.log("user from payload (preferred)", payload?.user);
      if (typeof deps.setUserInfoOverride === 'function') {
        if (payload?.isUserMode) {
          // Prefer user from payload; do not access iframe session
          const u = payload?.user;
          if (u) {
            deps.setUserInfoOverride({
              isAuthenticated: true,
              profile: {
                id: u.id || u.userId || 'user-id-missing',
                name: u.displayName || u.fullName || u.username || u.email || 'User',
                email: u.email || '',
                avatarUrl: u.profilePic || u.avatarUrl || undefined,
                profilePic: u.profilePic || u.avatarUrl || undefined,
                roles: Array.isArray(u.roles)
                  ? u.roles
                  : (u.shopMember && (u.shopMember.role || u.shopMember.permissions))
                    ? [u.shopMember.role || u.shopMember.permissions]
                    : undefined,
                phoneNumber: u.phoneNumber || u.phone || undefined,
              },
            });
          } else {
            // Enhanced mock user when none provided
            deps.setUserInfoOverride({
              isAuthenticated: true,
              profile: {
                id: 'mock-user-001',
                name: 'Jane Doe',
                email: 'jane.doe@example.com',
                avatarUrl: 'https://i.pravatar.cc/128?img=5',
                profilePic: 'https://i.pravatar.cc/128?img=5',
                roles: ['customer', 'beta_tester'],
                phoneNumber: '+1-555-0101',
                address: {
                  line1: '123 Market St',
                  city: 'San Francisco',
                  state: 'CA',
                  postalCode: '94103',
                  country: 'US',
                },
                preferences: {
                  currency: 'USD',
                  locale: 'en-US',
                  marketingOptIn: true,
                },
              },
            });
          }
        } else {
          deps.setUserInfoOverride({
            isAuthenticated: false,
            profile: null,
          });
        }
      }
      break;

    default:
      console.warn('Unknown message type:', type);
  }
}; 

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Minimal helper stubs (intended to be implemented fully later)
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
 * Depth-first search for a node in the page definition by id.
 * Returns a direct reference into the cloned tree or null if not found.
 */
function findNodeRef(nodes: any[], nodeId: string): any | null {
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

/**
 * Handles removal of an override path for responsive, locale, or interaction scopes.
 * item: { scope: 'responsive' | 'locale' | 'interaction', key: string, path: string }
 */
function handleUnsetOverride(targetNode: any, item: { scope: 'responsive' | 'locale' | 'interaction'; key: string; path: string }): void {
  if (!item || !item.scope || !item.key || !item.path) return;

  if (item.scope === 'responsive') {
    const ro = (targetNode as any).responsiveOverrides;
    if (!ro || !ro[item.key]) return;
    const removed = deleteNestedValue(ro[item.key], item.path);
    if (removed) {
      if (isPlainEmptyObject(ro[item.key])) delete ro[item.key];
      if (isPlainEmptyObject(ro)) delete (targetNode as any).responsiveOverrides;
    }
    return;
  }

  if (item.scope === 'locale') {
    const lo = (targetNode as any).localeOverrides;
    if (!lo || !lo[item.key]) return;
    const removed = deleteNestedValue(lo[item.key], item.path);
    if (removed) {
      if (isPlainEmptyObject(lo[item.key])) delete lo[item.key];
      if (isPlainEmptyObject(lo)) delete (targetNode as any).localeOverrides;
    }
    return;
  }

  if (item.scope === 'interaction') {
    const interactionStates = (targetNode as any).interactionStates;
    if (!interactionStates || !interactionStates[item.key]) return;
    
    const interactionState = interactionStates[item.key];
    
    // Parse the path to understand what we're removing
    // Expected format: "interactionStates.hover.inlineStyles.backgroundColor"
    const pathParts = item.path.split('.');
    if (pathParts.length >= 3 && pathParts[0] === 'interactionStates' && pathParts[2] === 'inlineStyles') {
      const cssProperty = pathParts[3];
      
      // Remove the inline style property
      if (interactionState.inlineStyles && cssProperty in interactionState.inlineStyles) {
        delete interactionState.inlineStyles[cssProperty];
        
        // If inlineStyles becomes empty, remove it
        if (isPlainEmptyObject(interactionState.inlineStyles)) {
          delete interactionState.inlineStyles;
        }
      }
      
      // Also remove the corresponding transition
      if (interactionState.transitions && Array.isArray(interactionState.transitions)) {
        const kebabProperty = cssProperty.replace(/([A-Z])/g, '-$1').toLowerCase();
        interactionState.transitions = interactionState.transitions.filter(
          (transition: any) => transition.prop !== kebabProperty
        );
        
        // If transitions becomes empty, remove it
        if (interactionState.transitions.length === 0) {
          delete interactionState.transitions;
        }
      }
      
      // If the entire interaction state becomes empty, remove it
      if (isPlainEmptyObject(interactionState)) {
        delete interactionStates[item.key];
      }
      
      // If all interaction states are removed, remove the entire interactionStates object
      if (isPlainEmptyObject(interactionStates)) {
        delete (targetNode as any).interactionStates;
      }
    }
    return;
  }
}

function deepMergeInto(target: any, source: any): void {
  if (target === source) return;
  if (source == null) return; // nothing to merge

  // Arrays: replace target with a shallow copy of source
  if (Array.isArray(source)) {
    const replacement = source.slice();
    // For caller: assign directly (when merging under a key). Here, if target itself is an array/container,
    // we cannot rebind the outer reference, so rely on caller setting the property.
    // As we only call deepMergeInto on objects' properties, we handle at parent level below.
  }

  // Objects
  if (typeof source === 'object') {
    if (typeof target !== 'object' || target == null || Array.isArray(target)) {
      // Caller will set the property to a clone of source; for root-level call we mutate target's own keys
    }

    Object.keys(source).forEach((key) => {
      const sVal = (source as any)[key];
      const tVal = (target as any)[key];

      if (Array.isArray(sVal)) {
        (target as any)[key] = sVal.slice();
      } else if (sVal && typeof sVal === 'object') {
        if (!tVal || typeof tVal !== 'object' || Array.isArray(tVal)) {
          (target as any)[key] = {};
        }
        deepMergeInto((target as any)[key], sVal);
      } else {
        (target as any)[key] = sVal;
      }
    });
    return;
  }

  // Primitives: nothing to do at root; assignment handled by parent call
}

function deleteNestedValue(obj: any, path: string): boolean {
  if (!obj || typeof obj !== 'object' || !path) return false;
  const segments = path.split('.');
  const lastKey = segments.pop();
  if (!lastKey) return false;

  const stack: Array<{ parent: any; key: string }> = [];
  let current: any = obj;
  for (const seg of segments) {
    if (!current || typeof current !== 'object' || !(seg in current)) {
      return false;
    }
    stack.push({ parent: current, key: seg });
    current = current[seg];
  }
  if (!current || typeof current !== 'object' || !(lastKey in current)) return false;
  delete current[lastKey];

  // Cleanup empty ancestors
  for (let i = stack.length - 1; i >= 0; i--) {
    const { parent, key } = stack[i];
    if (isPlainEmptyObject(parent[key])) {
      delete parent[key];
    } else {
      break;
    }
  }
  return true;
}

function isPlainEmptyObject(value: any): boolean {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0;
} 
