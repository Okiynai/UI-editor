'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { isEqual } from 'lodash';
import {
  selectedNodesAtom,
  currentPageIdAtom,
  isAgentBusyAtom,
  conversationIdAtom,
  AgentChange,
} from '@/store/editor';
import { startAgentStream } from '@/services/api/ai';
import { useSession } from '@/context/Session';
import { recordUserDecision as recordUserDecisionAPI } from '@/services/api/ai';
import { IframeCommunicationManager } from '@/app/shop-manager/website/edit/[sessId]/types/iframe-communication';
import { ClarineJSONStreamParser } from '@/app/shop-manager/website/edit/[sessId]/components/Sidebar/ChatPanel/streamParsers/graveyard/ClarineJSONStreamParser';
import { JSONStreamParser } from '@/app/shop-manager/website/edit/[sessId]/components/Sidebar/ChatPanel/streamParsers/graveyard/JSONStreamParser';

import { useUndoRedo, undo, redo, UNREObjectInterface } from '@/app/shop-manager/website/edit/iframe/utils/undo-redo';
import { Lexer } from '@/app/shop-manager/website/edit/[sessId]/components/Sidebar/ChatPanel/streamParsers/LexicalParser';


const PARSEABLE_AGENT_RESPONSE_SECTIONS = [
  'response',
  'action_json',
  'tool_name',
  'section_id', // i think this for the pre-built sections
  'params',
  'name',
  'node_payload',
  'node_id',
  // Only top-level sections should be listed here, not nested object properties
] as const;

// Timeline types for agent stream functionality (matching ChatPanel types)
export type AgentTimelineItem =
  | {
      type: 'userMessage';
      id: string;
      content: string;
      imageUrls?: string[];
      parseStartTimestamp: number;
      order: number;
    }
  | {
      type: 'rawToken';
      content: string;
      parseStartTimestamp: number;
      order: number;
    }
  | {
      type: 'parsedSection';
      sectionName: string;
      parsedContent: any;
      parseStartTimestamp: number;
      actionId?: string;
      order: number;
    }
  | {
      type: 'streamEnd';
      parseStartTimestamp: number;
      order: number;
    }
  | {
      type: 'generatedImage';
      id?: string;
      imageUrl?: string;
      prompt?: string;
      loading?: boolean;
      parseStartTimestamp: number;
      order: number;
    };

export type AgentTimeline = AgentTimelineItem[];

export const useBuilderStream = (iframeCommunicationManager?: IframeCommunicationManager) => {
  const session = useSession();

  const [isAgentBusy, setIsAgentBusy] = useAtom(isAgentBusyAtom);
  const [conversationId, setConversationId] = useAtom(conversationIdAtom);

  const [selectedNodes] = useAtom(selectedNodesAtom);
  const [currentPageId] = useAtom(currentPageIdAtom);

	const eventSourceRef = useRef<WebSocket | null>(null); 

  // State for capturing diff blocks
  const currentDiffRef = useRef<{
    diffType: 'node' | 'page' | 'site'; // Track the type of diff
    targetId: string; // For node and page IDs
    sectionTitle: string;
    propertyPath: string | null | undefined;
    lines: string[];
    isCapturing: boolean;
  } | null>(null);

  // Parser instance for strict mode syntax
  // const streamParserRef = useRef<ClarineJSONStreamParser>(new ClarineJSONStreamParser(PARSEABLE_AGENT_RESPONSE_SECTIONS, true));
  // const streamParserRef = useRef<JSONStreamParser>(new JSONStreamParser(PARSEABLE_AGENT_RESPONSE_SECTIONS, true));
  const streamParserRef = useRef<Lexer>(new Lexer(PARSEABLE_AGENT_RESPONSE_SECTIONS, true));




  // State for parsed sections
  const parsedSectionsRef = useRef<Array<{
    sectionName: string;
    sectionContent: any;
    creationTimestamp?: number;
  }>>([]);

  // Timeline state and management
  const [timeline, setTimeline] = useState<AgentTimelineItem[]>([]);

  // Chat error state
  const [chatError, setChatError] = useState<{ type: string; message: string } | null>(null);

  // Convert pendingChanges from ref to state
  const [pendingChanges, setPendingChanges] = useState<Map<string, {
    id: string;
    success: any;
    error: any;
    toolUsed: string;
    change?: AgentChange | null;
    timestamp?: number;
    choice?: 'kept' | 'rejected';
    isAssociated?: boolean;
    actionCode?: string; // Add actionCode property
  }>>(new Map());

  // Helper function to update pendingChanges
  const updatePendingChanges = useCallback((updater: (prev: Map<string, any>) => Map<string, any>) => {
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      const result = updater(newMap);
      return result;
    });
  }, []);

  // Function to record user decisions about actions (similar to Keeper)
  const recordUserDecision = useCallback(async (
    toolName: string, 
    actionParams: any, 
    userDecision: 'approved' | 'rejected', 
    observation: string
  ) => {
    console.log('[useBuilderStream] recordUserDecision called with:', { toolName, userDecision, observation, conversationId });
    
    if (!conversationId) {
      console.warn('[useBuilderStream] No conversationId available, cannot record user decision');
      return false;
    }

    try {
      console.log('[useBuilderStream] Recording user decision:', {
        toolName,
        userDecision,
        observation,
        conversationId
      });

      const response = await recordUserDecisionAPI({
        sessionId: conversationId,
        toolName,
        actionParams,
        userDecision,
        observation
      });

      if (!response.success) {
        console.warn('[useBuilderStream] Failed to record user decision:', response.error);
        return false;
      } else {
        console.log('[useBuilderStream] Successfully recorded user decision:', response.message);
        return true;
      }
    } catch (error) {
      console.error('[useBuilderStream] Error recording user decision:', error);
      return false;
    }
  }, [conversationId]);

  // Undo/Redo hook for handling agent changes
  const { addToUndoStack } = useUndoRedo({
    setPendingChanges: (actionId: string, choice: string) => {
      // Set flag to indicate we're in an undo/redo operation
      isInUndoRedoOperationRef.current = true;

      updatePendingChanges((prev: Map<string, any>) => {
        const newMap = new Map(prev);
        const existingChange = newMap.get(actionId);
        if (existingChange) {
          newMap.set(actionId, { ...existingChange, choice });
        }
        return newMap;
      });

      // Clear the flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isInUndoRedoOperationRef.current = false;
      }, 0);
    }
  });



  // Track previous pendingChanges to detect changes (useUndoRedo related)
  const useUndoRedoPreviousPendingChangesRef = useRef<Map<string, any>>(new Map());

  // Flag to prevent useEffect from firing during undo/redo operations
  const isInUndoRedoOperationRef = useRef<boolean>(false);

  // useEffect to listen to pendingChanges changes and detect agent change types (useUndoRedo related)
  useEffect(() => {
    // Skip if we're currently in an undo/redo operation to prevent infinite loops
    if (isInUndoRedoOperationRef.current) {
      console.log('[useBuilderStream] Skipping useEffect during undo/redo operation');
      return;
    }

    const currentPendingChanges = pendingChanges;
    const previousPendingChanges = useUndoRedoPreviousPendingChangesRef.current;

    console.log('[useBuilderStream] Current pending changes:', currentPendingChanges);
    console.log('[useBuilderStream] Previous pending changes:', previousPendingChanges);

    // Find changes that have been modified
    for (const [actionId, change] of currentPendingChanges) {
      const previousChange = previousPendingChanges.get(actionId);

      // Check if this is a newly added change
      if (!previousChange) {
        console.log('[useBuilderStream] Detected new agentChange Added:', actionId);

        // Create UNRE object for agentChange Added
        const agentChangeAddedOperation: UNREObjectInterface = {
          type: 'agent_change_added',
          executionContext: 'parent',
          metadata: {
              actionId,
              change: change.change,
              operation: change.change?.operation,
              nodeId: change.change?.nodeId,
              originalNode: change.change?.originalNode,
              parentId: change.change?.parentId,
              targetScope: change.change?.targetScope,
              propertyPath: change.change?.propertyPath
            },
                      undo: async (metadata: any, context: any) => {
            console.log('[useUndoRedo] Executing undo for agentChange 11111:', metadata.actionId);
            console.log('[useUndoRedo] context:', context);
            // Set flag to indicate we're in an undo/redo operation
            isInUndoRedoOperationRef.current = true;
            // Set choice to 'rejected'
            if (context?.setPendingChanges) {
              context.setPendingChanges(metadata.actionId, 'rejected');
            }
            // Send message to iframe to handle the undo
            if (metadata.change && iframeCommunicationManager) {
              iframeCommunicationManager.sendAgentChangeAction('undo', metadata.actionId, metadata.change);
            }
            // Clear the flag after a short delay
            setTimeout(() => {
              isInUndoRedoOperationRef.current = false;
            }, 0);
          },
          redo: async (metadata: any, context: any) => {
            console.log('[useUndoRedo] Executing redo for agentChange 22222:', metadata.actionId);
            // Set flag to indicate we're in an undo/redo operation
            isInUndoRedoOperationRef.current = true;
            // Set choice back to null
            if (context?.setPendingChanges) {
              context.setPendingChanges(metadata.actionId, null);
            }
            // Send message to iframe to handle the redo
            if (metadata.change && iframeCommunicationManager) {
              iframeCommunicationManager.sendAgentChangeAction('redo', metadata.actionId, metadata.change);
            }
            // Clear the flag after a short delay
            setTimeout(() => {
              isInUndoRedoOperationRef.current = false;
            }, 0);
          }
        };

        addToUndoStack(agentChangeAddedOperation);
        continue;
      }

      // Check if this change has been modified
      if (change.choice !== previousChange.choice) {
        console.log('[useBuilderStream] Detected pendingChanges choice change:', actionId, 'from:', previousChange.choice, 'to:', change.choice);

        // Determine the type of change based on the choice transition
        if (change.choice === 'rejected' && previousChange.choice === null) {
          // Create UNRE object for agentChange Added undo
          const agentChangeAddedUndoOperation: UNREObjectInterface = {
            type: 'agent_change_rejected',
            executionContext: 'parent',
            metadata: {
              actionId,
              change: previousChange.change,
              operation: previousChange.change?.operation,
              nodeId: previousChange.change?.nodeId,
              originalNode: previousChange.change?.originalNode,
              parentId: previousChange.change?.parentId,
              targetScope: previousChange.change?.targetScope,
              propertyPath: previousChange.change?.propertyPath
            },
            undo: async (metadata: any, context: any) => {
              console.log('[useUndoRedo] Executing undo for rejected->null:', metadata.actionId);
              // Set flag to indicate we're in an undo/redo operation
              isInUndoRedoOperationRef.current = true;
              // Set choice to 'rejected'
              if (context?.setPendingChanges) {
                context.setPendingChanges(metadata.actionId, 'rejected');
              }
              // Send message to iframe to handle the undo
              if (metadata.change && iframeCommunicationManager) {
                iframeCommunicationManager.sendAgentChangeAction('undo', metadata.actionId, metadata.change);
              }
              // Clear the flag after a short delay
              setTimeout(() => {
                isInUndoRedoOperationRef.current = false;
              }, 0);
            },
            redo: async (metadata: any, context: any) => {
              console.log('[useUndoRedo] Executing redo for rejected->null:', metadata.actionId);
              // Set flag to indicate we're in an undo/redo operation
              isInUndoRedoOperationRef.current = true;
              // Set choice back to null
              if (context?.setPendingChanges) {
                context.setPendingChanges(metadata.actionId, null);
              }
              // Send message to iframe to handle the redo
              if (metadata.change && iframeCommunicationManager) {
                iframeCommunicationManager.sendAgentChangeAction('redo', metadata.actionId, metadata.change);
              }
              // Clear the flag after a short delay
              setTimeout(() => {
                isInUndoRedoOperationRef.current = false;
              }, 0);
            }
          };

          console.log('[useBuilderStream] Adding agentChangerejectedndoOperation to undo stack:', agentChangeAddedUndoOperation);
          addToUndoStack(agentChangeAddedUndoOperation);
          continue;
        }

        if (change.choice === 'kept' && previousChange.choice === null) {
          // Create UNRE object for agentChange Added redo
          const agentChangeAddedRedoOperation: UNREObjectInterface = {
            type: 'agent_change_kept',
            executionContext: 'parent',
            metadata: {
              actionId,
              change: previousChange.change,
              operation: previousChange.change?.operation,
              nodeId: previousChange.change?.nodeId,
              originalNode: previousChange.change?.originalNode,
              parentId: previousChange.change?.parentId,
              targetScope: previousChange.change?.targetScope,
              propertyPath: previousChange.change?.propertyPath
            },
            undo: async (metadata: any, context: any) => {
              console.log('[useUndoRedo] Executing undo for kept->null:', metadata.actionId);
              // Set flag to indicate we're in an undo/redo operation
              isInUndoRedoOperationRef.current = true;
              // Set choice to 'rejected'
              if (context?.setPendingChanges) {
                context.setPendingChanges(metadata.actionId, 'rejected');
              }
              // Send message to iframe to handle the undo
              if (metadata.change && iframeCommunicationManager) {
                iframeCommunicationManager.sendAgentChangeAction('undo', metadata.actionId, metadata.change);
              }
              // Clear the flag after a short delay
              setTimeout(() => {
                isInUndoRedoOperationRef.current = false;
              }, 0);
            },
            redo: async (metadata: any, context: any) => {
              console.log('[useUndoRedo] Executing redo for kept->null:', metadata.actionId);
              // Set flag to indicate we're in an undo/redo operation
              isInUndoRedoOperationRef.current = true;
              // Set choice back to null
              if (context?.setPendingChanges) {
                context.setPendingChanges(metadata.actionId, null);
              }
              // Send message to iframe to handle the redo
              if (metadata.change && iframeCommunicationManager) {
                iframeCommunicationManager.sendAgentChangeAction('redo', metadata.actionId, metadata.change);
              }
              // Clear the flag after a short delay
              setTimeout(() => {
                isInUndoRedoOperationRef.current = false;
              }, 0);
            }
          };

          console.log('[useBuilderStream] Adding agentChangekeptUndoOperation to undo stack:', agentChangeAddedRedoOperation);
          addToUndoStack(agentChangeAddedRedoOperation);
          continue;
        }
      }
    }

    // Update the ref with current state
    useUndoRedoPreviousPendingChangesRef.current = new Map(currentPendingChanges);
  }, [pendingChanges]);



  // Process complete diff block
  const processCompleteDiff = () => {
    if (!currentDiffRef.current) return;

    const { diffType, targetId, sectionTitle, propertyPath, lines } = currentDiffRef.current;
    
    // Parse the diff content according to signatures.py format:
    // search
    //   current_value (can be multi-line)
    // ======
    //   new_value (can be multi-line)
    // >>>>>
    
    let searchLines: string[] = [];
    let replaceLines: string[] = [];
    let currentSection: 'none' | 'search' | 'replace' = 'none';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine === 'search') {
        currentSection = 'search';
        continue;
      }
      if (trimmedLine === '======') {
        currentSection = 'replace';
        continue;
      }
      if (trimmedLine === '>>>>>') {
        currentSection = 'none';
        break;
      }
      
      // Collect content lines, preserving original indentation by removing only the diff indentation
      if (currentSection === 'search') {
        // Remove the diff indentation (typically 2 spaces) but preserve content indentation
        const contentLine = line.startsWith('  ') ? line.substring(2) : line;
        searchLines.push(contentLine);
      } else if (currentSection === 'replace') {
        // Remove the diff indentation (typically 2 spaces) but preserve content indentation  
        const contentLine = line.startsWith('  ') ? line.substring(2) : line;
        replaceLines.push(contentLine);
      }
    }
    
    // Join lines back together, preserving original structure
    const searchValue = searchLines.join('\n').trim();
    const replaceValue = replaceLines.join('\n').trim();

    if (searchValue && replaceValue) {
      console.log('[useBuilderStream] Applying complete diff:', { 
        diffType, 
        targetId, 
        propertyPath, 
        searchValue: searchValue.substring(0, 100) + (searchValue.length > 100 ? '...' : ''),
        replaceValue: replaceValue.substring(0, 100) + (replaceValue.length > 100 ? '...' : '')
      });
      
      // Send apply diff message to iframe
      console.log('[useBuilderStream] iframeCommunicationManager:', iframeCommunicationManager);
      if (iframeCommunicationManager) {
        console.log(`[useBuilderStream] Applying diff of type '${diffType}' to target '${targetId}'`);

        iframeCommunicationManager.applyCompleteDiff({
          diffType,
          targetId,
          sectionId: targetId,
          sectionTitle,
          propertyPath: propertyPath || '',
          searchValue,
          replaceValue
        });
      }
    } else {
      console.warn('[useBuilderStream] Invalid diff - missing search or replace value');
    }

    // Clear current diff and send editing complete message
    currentDiffRef.current = null;
    if (iframeCommunicationManager) {
      iframeCommunicationManager.completeSectionEditing(targetId, sectionTitle);
    }

    // Note: No longer sending postMessage for diff completion since we're using timeline internally
  };

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      console.log('[useBuilderStream] [MessageXX]', message);

      switch (message.type) {
        case 'EXECUTE_ACTION':
          console.log(`[useBuilderStream] Received EXECUTE_ACTION from backend.`, message);

          // Backend is commanding us to perform an action

          const { actionId, action } = message.payload;
          handleExecuteAction(actionId, action);
          break;

        case 'GET_LIVE_CONTEXT':
          console.log("[useBuilderStream] GET_LIVE_CONTEXT", message);
          // Backend is requesting the current state
          handleGetLiveState(message);
          break;
        // Unified feedback: results are awaited directly by the manager; no out-of-band forwarding here
        default:

          console.log(`[useBuilderStream] Received EVENTOO from backend.`, message);

          handleStreamEvent(message);
      }
    } catch (error) {
      console.error('[useBuilderStream] Error processing WebSocket message:', error);
    }
  }, [iframeCommunicationManager]); // Add dependencies

  const handleExecuteAction = async (actionId: string, action: any) => {
    if (!iframeCommunicationManager) return;

    try {
      console.log(`[useBuilderStream] handle execute action.`, {
        actionId,
        tool_name: action.tool_name,
        action_code: action.action_code,
        params: action.params
      });

      let result: any;

      // Route to the correct iframe manager method based on the tool name
      switch (action.tool_name) {
        case 'create_osdl_node':
          result = await iframeCommunicationManager.createOSDLNodeAwaitable(
            action.params.node_payload,
            action.params.parent_id,
            actionId,
            true // isAgentRequest: true for agent-initiated node creation
          );

          // add to pending actions
          updatePendingChanges(prev => {
            const newMap = new Map(prev);
            // Use action_code as key if available, otherwise fall back to actionId
            const changeKey = action.action_code || actionId;
            newMap.set(changeKey, {
              id: changeKey,
              toolUsed: 'create_osdl_node',
              success: result?.success,
              error: result?.error,
              change: result?.change,
              timestamp: Date.now(),
              actionCode: action.action_code // Store action_code for association
            });
            return newMap;
          });

          if (eventSourceRef.current?.readyState === WebSocket.OPEN) {
            const changes = result?.message || (result?.success
              ? `Node "${result?.nodeName ?? 'unknown'}" was created with id "${result?.nodeId ?? 'unknown'}"`
              : 'Node creation failed');
            eventSourceRef.current.send(JSON.stringify({
              type: 'ACTION_RESULT',
              actionId,
              payload: {
                success: result?.success,
                changes,
                error: result?.error
              }
            }));
          }
          break;
        case 'add_pre_built_section':
          result = await iframeCommunicationManager.addPreBuiltSectionAwaitable(
            action.params.section_id,
            action.params.parent_id,
            action.params.name,
            action.params.order,
            actionId,
            true // isAgentRequest: true for agent-initiated pre-built section addition
          );

          // add to pending actions
          updatePendingChanges(prev => {
            const newMap = new Map(prev);
            // Use action_code as key if available, otherwise fall back to actionId
            const changeKey = action.action_code || actionId;
            newMap.set(changeKey, {
              id: changeKey,
              toolUsed: 'add_pre_built_section',
              success: result?.success,
              error: result?.error,
              timestamp: Date.now(),
              actionCode: action.action_code // Store action_code for association
            });
            return newMap;
          });

          if (eventSourceRef.current?.readyState === WebSocket.OPEN) {
            let changes;
            if (result?.success) {
              // Include the full created section data in the response
              const createdSection = result?.createdSection || {};
              changes = {
                message: `Pre-built section "${result?.name ?? action.params.name}" was created successfully`,
                sectionId: result?.sectionId,
                name: result?.name,
                createdSection: createdSection,
                childNodeIds: createdSection?.children?.map((child: any) => child.id) || [],
                childNodeNames: createdSection?.children?.map((child: any) => child.name || child.atomType || 'Unknown') || []
              };
            } else {
              changes = result?.message || 'Failed to add pre-built section';
            }

            eventSourceRef.current.send(JSON.stringify({
              type: 'ACTION_RESULT',
              actionId,
              payload: {
                success: result?.success,
                changes,
                error: result?.error
              }
            }));
          }
          break;
        case 'delete_osdl_node':
          result = await iframeCommunicationManager.deleteOSDLNodeAwaitable(action.params.node_id, actionId, true); // isAgentRequest: true for agent-initiated node deletion

          // add to pending actions
          updatePendingChanges(prev => {
            const newMap = new Map(prev);
            // Use action_code as key if available, otherwise fall back to actionId
            const changeKey = action.action_code || actionId;
            newMap.set(changeKey, {
              id: changeKey,
              toolUsed: 'delete_osdl_node',
              success: result?.success,
              error: result?.error,
              change: result?.change,
              timestamp: Date.now(),
              actionCode: action.action_code // Store action_code for association
            });
            return newMap;
          });

          if (eventSourceRef.current?.readyState === WebSocket.OPEN) {
            eventSourceRef.current.send(JSON.stringify({
              type: 'ACTION_RESULT',
              actionId,
              payload: {
                success: result?.success,
                changes: result?.success ? `Node ${action.params.node_id} deleted` : `Node deletion failed`,
                error: result?.error
              }
            }));
          }
          break;
        case 'modify_osdl_node':
        case 'modify_page_setting':
        case 'modify_site_setting':
          // Determine the diffType based on the tool name
          const diffType: 'node' | 'page' | 'site' = action.tool_name === 'modify_osdl_node' ? 'node' :
            action.tool_name === 'modify_page_setting' ? 'page' : 'site';

          // Determine the targetId based on the tool name
          const targetId: string = diffType === 'node' ? action.params.node_id :
            diffType === 'page' ? action.params.page_id : 'site_settings';

          // Construct the payload for the iframe
          const diffPayload = {
            diffType: diffType,
            targetId: targetId,
            sectionId: targetId,
            sectionTitle: targetId, // A sensible default
            propertyPath: action.params.property_path,
            searchValue: action.params.search_value,
            replaceValue: action.params.replace_value,
            actionId: actionId,
            isAgentRequest: true // isAgentRequest: true for agent-initiated modifications
          };

          console.log("[IframePage] Applying complete diff:", diffPayload);

          result = await iframeCommunicationManager.applyCompleteDiffAwaitable(diffPayload);

          // add to pending actions only for modify_osdl_node
          if (action.tool_name === 'modify_osdl_node') {
            updatePendingChanges(prev => {
              const newMap = new Map(prev);
              // Use action_code as key if available, otherwise fall back to actionId
              const changeKey = action.action_code || actionId;
              newMap.set(changeKey, {
                id: changeKey,
                toolUsed: 'modify_osdl_node',
                success: result?.success,
                error: result?.error,
                change: result?.change,
                timestamp: Date.now(),
                actionCode: action.action_code // Store action_code for association
              });
              return newMap;
            });
          }

          if (eventSourceRef.current?.readyState === WebSocket.OPEN) {
            eventSourceRef.current.send(JSON.stringify({
              type: 'ACTION_RESULT',
              actionId,
              payload: {
                success: result?.success,
                changes: result?.success ? 'Diff applied successfully' : `Diff failed: ${result?.error}`,
                error: result?.error
              }
            }));
          }
          break;

        case 'get_site_settings':
          // Get live site settings from iframe
          const siteSettingsScope = 'site_settings';
          const siteSettingsDetails = { shop_id: action.params.shop_id };
          const siteSettings = await iframeCommunicationManager.getCurrentState({
            requestId: `site_settings_${actionId}`,
            scope: siteSettingsScope,
            details: siteSettingsDetails
          });

          // Return the site settings as the action result
          if (eventSourceRef.current?.readyState === WebSocket.OPEN) {
            eventSourceRef.current.send(JSON.stringify({
              type: 'ACTION_RESULT',
              actionId: actionId,
              payload: {
                success: true,
                changes: `Retrieved live site settings for shop ${action.params.shop_id}`,
                new_state: siteSettings
              }
            }));
          }
          break;

        case 'get_page_settings':
          // Get live page settings from iframe
          const pageSettingsScope = 'page_settings';
          const pageSettingsDetails = { page_id: action.params.page_id };
          const pageSettings = await iframeCommunicationManager.getCurrentState({
            requestId: `page_settings_${actionId}`,
            scope: pageSettingsScope,
            details: pageSettingsDetails
          });

          // Return the page settings as the action result
          if (eventSourceRef.current?.readyState === WebSocket.OPEN) {
            eventSourceRef.current.send(JSON.stringify({
              type: 'ACTION_RESULT',
              actionId: actionId,
              payload: {
                success: true,
                changes: `Retrieved live page settings for page ${action.params.page_id}`,
                new_state: pageSettings
              }
            }));
          }
          break;

        default:
          console.warn(`[useBuilderStream] Unhandled live action tool: ${action.tool_name}`);
      }

      // This part needs to be improved. The iframe should return the new state.
      // For now, we'll just report success.
      // const newLiveState = await iframeCommunicationManager.getCurrentState();

      // No optimistic ACTION_RESULT; unified feedback already sent above per tool

    } catch (error: any) {
      eventSourceRef.current?.send(JSON.stringify({
        type: 'ACTION_RESULT',
        actionId,
        payload: { success: false, error: error.message }
      }));
    }
  };

  const handleGetLiveState = async (message: any) => {
    if (!iframeCommunicationManager) return;
    try {
      const { type, payload } = message;
      const liveState = await iframeCommunicationManager.getCurrentState(payload);
      eventSourceRef.current?.send(JSON.stringify({
        type: 'LIVE_CONTEXT_RESPONSE',
        requestId: payload.requestId,
        payload: liveState
      }));
      console.log(`[useBuilderStream] Sent LIVE_CONTEXT_RESPONSE for requestId: ${payload.requestId}`);

    } catch (error: any) {
      console.error("Could not get live state from iframe:", error);
      if (eventSourceRef.current?.readyState === WebSocket.OPEN) {
        eventSourceRef.current.send(JSON.stringify({
          type: 'LIVE_CONTEXT_RESPONSE',
          requestId: message.payload.requestId,
          payload: { error: `Failed to get live state: ${error.message}` }
        }));
      }
    }
  };

  const handleStreamEvent = useCallback((data: any) => {
    try {
      console.log('[useBuilderStream] Received event:', data);

    if (data.type === 'token_chunk' || data.type === 'reasoning_chunk') {
      // e.g., field: "thought" or "message_to_user", token: " a"
      const { field, token } = data.data;

      // Process the token through the strict mode parser
      if(field == 'reasoning') {
        // Handle reasoning tokens with smart merging logic
        setTimeline(prev => {
          const newTimeline = [...prev];

          let targetIndex = -1;
          let foundUserMessage = false;

          // Search backwards from the end of timeline
          for (let i = newTimeline.length - 1; i >= 0; i--) {
            const item = newTimeline[i];

            if (item.type === 'userMessage' || 
              (item.type === 'parsedSection' && item.sectionName !== 'reasoning')) {
              foundUserMessage = true;
              break;
            } else if (item.type === 'parsedSection' && item.sectionName === 'reasoning') {
              targetIndex = i;
              break;
            }
          }

          if (targetIndex >= 0 && !foundUserMessage) {
            // Merge with existing reasoning section (this is correct for reasoning since it's a stream)
            const existingTarget = newTimeline[targetIndex];
            if (existingTarget.type === 'parsedSection' && existingTarget.sectionName === 'reasoning') {
              newTimeline[targetIndex] = {
                ...existingTarget,
                parsedContent: {
                  rawContent: existingTarget.parsedContent.rawContent + token,
                  startTimestamp: existingTarget.parsedContent.startTimestamp,
                  endTimestamp: data.timestamp
                }
              };
            }
          } else {
            // Create new reasoning section
            const newReasoningSection = {
              type: 'parsedSection' as const,
              sectionName: 'reasoning',
              parsedContent: {
                rawContent: token,
                startTimestamp: data.timestamp,
                endTimestamp: data.timestamp
              },
              parseStartTimestamp: data.timestamp,
              order: newTimeline.length + 1
            };
            newTimeline.push(newReasoningSection);
          }

          return newTimeline;
        });
        // Also record raw tokens for reasoning to support debug/raw views
        setTimeline(prev => {
          const timeline = [...prev];

          let targetIndex = -1;
          let foundUserMessage = false;

          // Search backwards from the end of timeline
          for (let i = timeline.length - 1; i >= 0; i--) {
            const item = timeline[i];

            if (item.type === 'userMessage') {
              foundUserMessage = true;
              break;
            } else if (item.type === 'rawToken') {
              targetIndex = i;
              break;
            }
          }

          if (targetIndex >= 0 && !foundUserMessage) {
            // Merge with the nearest rawToken we found
            const existingToken = timeline[targetIndex];
            if (existingToken.type === 'rawToken') {
              timeline[targetIndex] = {
                ...existingToken,
                content: existingToken.content + token,
                parseStartTimestamp: Date.now()
              };
            }
          } else {
            // Create new rawToken entry
            const rawTokenItem = {
              type: 'rawToken' as const,
              content: token,
              parseStartTimestamp: Date.now(),
              order: timeline.length + 1
            };
            timeline.push(rawTokenItem);
          }

          return timeline;
        });

        return;
      } 

      // Process tokens through the parser for structured sections
      streamParserRef.current.processToken(token);
      const currentCompletedSections = streamParserRef.current.getCompletedSections();

      // Handle raw tokens with smart merging logic
      setTimeline(prev => {
        const timeline = [...prev];

        let targetIndex = -1;
        let foundUserMessage = false;

        // Search backwards from the end of timeline
        for (let i = timeline.length - 1; i >= 0; i--) {
          const item = timeline[i];

          if (item.type === 'userMessage') {
            foundUserMessage = true;
            break;
          } else if (item.type === 'rawToken') {
            targetIndex = i;
            break;
          }
        }

        if (targetIndex >= 0 && !foundUserMessage) {
          // Merge with the nearest rawToken we found
          const existingToken = timeline[targetIndex];
          if (existingToken.type === 'rawToken') {
            timeline[targetIndex] = {
              ...existingToken,
              content: existingToken.content + token,
              parseStartTimestamp: Date.now()
            };
          }
        } else {
          // Create new rawToken entry
          const rawTokenItem = {
            type: 'rawToken' as const,
            content: token,
            parseStartTimestamp: Date.now(),
            order: timeline.length + 1
          };
          timeline.push(rawTokenItem);
        }

        return timeline;
      });

      if (currentCompletedSections.length > 0) {
        console.log('[useBuilderStream] Processing completed sections:', currentCompletedSections.length);
        
        // Convert parser sections to legacy format
        const legacySectionsParserFormat: Array<{
          sectionName: string;
          parsedContent: any;
        }> = [];

        currentCompletedSections.forEach((section: any, index: number) => {
          const sectionName = Object.keys(section)[0];
          const parsedContent = section[sectionName];
          
          console.log(`[useBuilderStream] Processing section ${index}:`, sectionName);

          if (sectionName === 'response') {
            legacySectionsParserFormat.push({
              sectionName: 'response',
              parsedContent,
            });
          }

          if (sectionName === 'action_json') {
            if (Array.isArray(parsedContent) && parsedContent.length == 0) {
              // just do nothing.
            }

            if (typeof parsedContent === 'object' && !Array.isArray(parsedContent)) {
              legacySectionsParserFormat.push({
                sectionName: 'action_json',
                parsedContent,
              });
            }

            // array handling
            if (Array.isArray(parsedContent) && parsedContent.length > 0) {
              parsedContent.forEach(entry => {
                legacySectionsParserFormat.push({
                  sectionName: 'action_json',
                  parsedContent: entry,
                });
              });
            }
          }
        });

        // First process: Compare only the last element in our ref
        // with the one at same index from parser to prevent duplicates
        const lastIndex = parsedSectionsRef.current.length - 1;

        if (parsedSectionsRef.current.length > 0) {
          // our last index
          const existingLastSection = parsedSectionsRef.current[lastIndex];

          // potentially new last index
          const potentiallyNewSection = legacySectionsParserFormat[lastIndex];

          if (
            potentiallyNewSection &&
            !isEqual(existingLastSection.sectionContent, potentiallyNewSection.parsedContent) &&
            existingLastSection.sectionName == potentiallyNewSection.sectionName
          ) {
            // Content updated - update the existing section in timeline
            setTimeline(prev => {
              const timeline = [...prev];

              const lastIndex = timeline.findLastIndex(item => item.type === 'parsedSection' && item.sectionName === existingLastSection.sectionName);
              if (lastIndex >= 0) {
                const existingItem = timeline[lastIndex];
                if (existingItem.type === 'parsedSection') {
                  timeline[lastIndex] = {
                    ...existingItem,
                    parsedContent: potentiallyNewSection.parsedContent,
                  };
                }
              }

              return timeline;
            });

            // sync the parsedSectionsRef simultaneously
            parsedSectionsRef.current[lastIndex] = {
              ...existingLastSection,
              sectionContent: potentiallyNewSection.parsedContent,
            };
          }
        }

        // Second process: Take everything from that index to the end and add new sections
        legacySectionsParserFormat.slice(lastIndex + 1).forEach(section => {
          // Add to parsedSectionsRef
          parsedSectionsRef.current.push({
            sectionName: section.sectionName,
            sectionContent: section.parsedContent,
            creationTimestamp: Date.now(),
          });

          // Add new section to timeline
          setTimeline(prev => {
            const timeline = [...prev];
            timeline.push({
              type: 'parsedSection',
              sectionName: section.sectionName,
              parsedContent: section.parsedContent,
              parseStartTimestamp: Date.now(),
              order: timeline.length + 1,
              // Include action_code if this is an action_json section
              actionId: section.sectionName === 'action_json' ? section.parsedContent?.action_code : undefined
            });
            return timeline;
          });
        });
      }

      return; // Stop further processing for this chunk
    }

      // Reset parser state at the start of a new turn to avoid carry-over
      if (data.type === 'workflow_started' || data.type === 'step_started' && data.step_number === 0) {
        streamParserRef.current.resetAll();
        parsedSectionsRef.current = [];
      }

      if (data.type === 'workflow_completed' || data.type === 'workflow_interruption') {
        console.log(`[useBuilderStream] Workflow for this turn has finished with status: ${data.type}`);
        
        setIsAgentBusy(false);

        streamParserRef.current.resetAll();
        parsedSectionsRef.current = [];

        // Add stream end to timeline
        setTimeline(prev => {
          // check if the last item is already a streamEnd (extra safety)
          if (prev.length > 0 && prev[prev.length - 1].type === 'streamEnd') {
            console.warn('[useBuilderStream] Last item is already streamEnd, skipping duplicate');
            return prev;
          }

          return [...prev, {
            type: 'streamEnd',
            parseStartTimestamp: Date.now(),
            order: prev.length + 1
          }];
        });

        // Don't reset raw tokens - they should persist across the conversation
        return; // Prevent further processing
      }

      // --- IMAGE GENERATED EVENT HANDLER ---
      if (data.type === 'image_generated') {
        console.log('[useBuilderStream] Received image_generated event:', data);
        setTimeline(prev => {
          const next = [...prev];
          // Try to find the most recent pending generatedImage and fill it
          const idx = [...next].reverse().findIndex(item => item.type === 'generatedImage' && item.loading);
          if (idx !== -1) {
            const realIdx = next.length - 1 - idx;
            const existingItem = next[realIdx];
            if (existingItem.type === 'generatedImage') {
              next[realIdx] = {
                ...existingItem,
                loading: false,
                imageUrl: data.data.image_url,
                prompt: data.data.prompt
              };
            }
            return next;
          }
          // Fallback: if no pending placeholder exists, push a new one
          next.push({
            type: 'generatedImage',
            id: `image-${Date.now()}`,
            imageUrl: data.data.image_url,
            prompt: data.data.prompt,
            parseStartTimestamp: Date.now(),
            loading: false,
            order: next.length + 1,
          });
          return next;
        });
        return;
      }
      // --- END IMAGE GENERATED EVENT HANDLER ---

      // --- TOOL STARTED (generate_image) PLACEHOLDER HANDLER ---
      if (data.type === 'step_progress' && (data.tool_used === 'generate_image' || /generate_image/.test(data.message || ''))) {
        setTimeline(prev => ([
          ...prev,
          {
            type: 'generatedImage',
            id: `image-pending-${Date.now()}`,
            parseStartTimestamp: Date.now(),
            loading: true,
            order: prev.length + 1,
          }
        ]));
        return;
      }
      // --- END TOOL STARTED PLACEHOLDER HANDLER ---

      if (data.type === 'error') {
        console.log('[useBuilderStream] Workflow error:', data.message, data.data);
        // Set structured chat error state
        const errorType = data?.data?.errorType || 'generic';
        setChatError({
          type: errorType,
          message: data.message || 'An unexpected error occurred.'
        });
        closeStream();
        streamParserRef.current.resetAll();
        parsedSectionsRef.current = [];

        return;
      }
    } catch (error) {
      console.error('[useBuilderStream] Error parsing stream event:', error);
    }
  }, [currentPageId, iframeCommunicationManager, processCompleteDiff]);

  const startStream = useCallback(async (
    prompt: string,
    referencedSections: Array<{ pageId: string; nodeId: string; pageName?: string }> = [],
    imageUrls: Array<string> = [],
    sessionId?: string | null,
    modelTier: 'low' | 'mid' | 'high' = 'mid'
  ) => {

    console.log('[useBuilderStream] startStream called', { prompt, referencedSections, isAgentBusy, conversationId });
    if (isAgentBusy) {
      console.warn('[useBuilderStream] Agent is already busy.');
      return;
    }

    // Reset the parser and section state for the new turn.
    // This is the critical fix to prevent state corruption from the previous turn.
    console.log('[useBuilderStream] Resetting parser state for new turn.');
    streamParserRef.current.resetAll();
    parsedSectionsRef.current = [];

    setIsAgentBusy(true);


    try {
      if (!session.user?.id || !session.shop?.id) {
        throw new Error('Cannot start agent stream: User not logged in or shop not found');
      }
      if (!currentPageId) {
        throw new Error('Cannot start agent stream: Current page ID not found');
      }


      // Enhance the prompt with referenced sections if any
      let enhancedPrompt = prompt;
      if (referencedSections.length > 0) {
        const sectionsText = referencedSections.map(section =>
          `${section.pageId}:${section.nodeId}`
        ).join(', ');
        enhancedPrompt = `${prompt}\n\nReferenced sections: ${sectionsText}`;
      }
      console.log('--- [useBuilderStream] currentPageId ---', currentPageId);


      const response = await startAgentStream({
        prompt: enhancedPrompt,
        sessionId: sessionId || conversationId,
        source: 'builder',
        context: {
          currentPageId: currentPageId || 'home',
          referencedSections,
          userId: session.user?.id,
          shopId: session.shop?.id,
          imageUrls: imageUrls || []
        },
        modelTier: modelTier,
        options: {
          enableStreaming: true,
          maxSteps: 30,
          allowRQLDiscovery: true,
          iterativeImprovement: true,
        },
      });

      if (response.success && response.sessionId && response.websocketUrl) {
        setConversationId(response.sessionId);

        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // const wsUrl = `${proto}//${window.location.host}${response.websocketUrl}`;       
        const wsUrl = response.websocketUrl.replace(/^http/, 'ws');
        console.log('ws url', wsUrl);

        eventSourceRef.current = new WebSocket(wsUrl);

        eventSourceRef.current.onopen = () => console.log(`[useBuilderStream] WebSocket connected to ${wsUrl}`);
        // eventSourceRef.current.onmessage = handleWebSocketMessage;
        eventSourceRef.current.onmessage = (event: MessageEvent) => {
          console.log('[useBuilderStream]  ONMESSAGE HANDLER FIRED. Data received:', event.data);
          handleWebSocketMessage(event);
        };
        eventSourceRef.current.onclose = () => {
          console.log('[useBuilderStream] WebSocket connection closed by server.');
          closeStream();
        };

        eventSourceRef.current.onerror = (err) => {
          if (!(eventSourceRef.current) || (eventSourceRef.current as any)?.readyState === 2 || (eventSourceRef.current as any)?.readyState === 0) {
            // Closed naturally
            return;
          }
          console.error('[useBuilderStream] EventSource error:', err);
          // Remove the user message since the connection failed

          closeStream();
        };

      } else {
        throw new Error(response.message || 'Failed to start agent stream');
      }
    } catch (error) {
      console.error('[useBuilderStream] Error starting stream:', error);
      // Remove the user message that was just added since the request failed

      closeStream();
      // Re-throw the error so the Promise rejects properly
      throw error;
    }
  }, [isAgentBusy, setIsAgentBusy,
    selectedNodes, currentPageId, conversationId,
    handleStreamEvent, iframeCommunicationManager, handleWebSocketMessage, session.user?.id, session.shop?.id]);

  // Function to add user message to timeline
  const addUserMessage = useCallback((content: string, imageUrls: string[] = []) => {
    const userMessage = {
      type: 'userMessage' as const,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      imageUrls,
      parseStartTimestamp: Date.now(),
      order: timeline.length + 1
    };

    setTimeline(prev => [...prev, userMessage]);
  }, [timeline.length]);

  const startNewConversation = useCallback(() => {
    closeStream(); // Ensure any active turn is stopped

    setConversationId(null); // Clear the persistent ID
    
    // Reset the parser state
    streamParserRef.current.resetAll();
    parsedSectionsRef.current = [];

    // Clear timeline
    setTimeline([]);
    
    // Clear chat error
    setChatError(null);
    
    // Clear any ongoing diff capture
    currentDiffRef.current = null;
    console.log('[useBuilderStream] New conversation started. State has been reset.');
  }, [setConversationId, setIsAgentBusy]);
  
  const stopStream = useCallback(() => {
    if (eventSourceRef.current && eventSourceRef.current.readyState === WebSocket.OPEN) {
      // Send stop message to backend
      eventSourceRef.current.send(JSON.stringify({
        type: 'STOP_STREAM'
      }));
      console.log('[useBuilderStream] Sent STOP_STREAM message to backend.');
    }

    setIsAgentBusy(false);
  }, []);

  const closeStream = useCallback(() => {
   if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      console.log('[useBuilderStream] WebSocket closed.');
    }

    setIsAgentBusy(false);

    // Clear any ongoing diff capture
    currentDiffRef.current = null;

    // Send message to clear all editing states in iframe
    if (iframeCommunicationManager) {
      iframeCommunicationManager.clearAllEditingStates();
    }

    // Note: No longer sending postMessage for clearing diffs since we're using timeline internally
  }, [setIsAgentBusy, iframeCommunicationManager, stopStream]);
  
  // Ensure stream is closed on unmount
  useEffect(() => {
    return () => {
      closeStream();
    };
  }, [closeStream]);
  
  
  return {
    startStream,
    stopStream,
    closeStream,
    isAgentBusy,
    conversationId,
    setConversationId,
    startNewConversation,
    pendingChanges: pendingChanges,
    setPendingChanges: updatePendingChanges,
    streamParser: streamParserRef.current,
    // New timeline functionality
    timeline,
    setTimeline,
    chatError,
    setChatError,
    addUserMessage,
    // User decision recording
    recordUserDecision
  };
}; 
