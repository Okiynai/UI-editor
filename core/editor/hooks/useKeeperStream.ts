'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { isEqual } from 'lodash';
import { useAtom } from 'jotai';
import {
  selectedNodesAtom,
  currentPageIdAtom,
  AgentChange,
  isKeeperBusyAtom,
  keeperConversationIdAtom,
  pendingActionsAtom,
  PendingAction,
  ActionStatus,
} from '@/store/editor';
import { startAgentStream } from '@/services/api/ai';
import { useSession } from '@/context/Session';
import { ClarineJSONStreamParser } from '@/app/shop-manager/website/edit/[sessId]/components/Sidebar/ChatPanel/streamParsers/graveyard/ClarineJSONStreamParser';
import { JSONStreamParser } from '@/app/shop-manager/website/edit/[sessId]/components/Sidebar/ChatPanel/streamParsers/graveyard/JSONStreamParser';
import { Lexer } from '@/app/shop-manager/website/edit/[sessId]/components/Sidebar/ChatPanel/streamParsers/LexicalParser';
import { recordUserDecision as recordUserDecisionAPI } from '@/services/api/ai';
import { pushWebSearchSources } from '@/app/shop-manager/keeper/components/WebSearchSources';

const PARSEABLE_AGENT_RESPONSE_SECTIONS = [
  'response',
  'action_json',
  // Removed 'tool_name' and 'params' as they should be nested properties within action_json
  'section_id', // i think this for the pre-built sections
  'name',
  'node_payload',
  'node_id',
  // Removed nested property names that should be parsed as regular object properties:
  // 'customizations', 'options', 'affects', 'variants', 'combination', 'sku', 'price_adjustment', 'quantity'
] as const;

// Only these tools should create pending actions that need user approval
const LIVE_ACTION_TOOLS = [
  'inventory_management',
  'product_management',
] as const;

export const useKeeperStream = () => {
  const session = useSession();

  const [isKeeperBusy, setIsKeeperBusy] = useAtom(isKeeperBusyAtom);
  const [conversationId, setConversationId] = useAtom(keeperConversationIdAtom);

  // Note: Removed localStorage restoration - state preservation is only for tab switching

  const [selectedNodes] = useAtom(selectedNodesAtom);
  const [currentPageId] = useAtom(currentPageIdAtom);

  // State for managing pending actions that need user approval
  const [pendingActions, setPendingActions] = useAtom(pendingActionsAtom);
  
  // Ref to store pending actions for immediate access (avoiding stale closures)
  const pendingActionsRef = useRef<PendingAction[]>([]);
  
  // Debug logging for pending actions
  useEffect(() => {
    console.log('[useKeeperStream] pendingActions changed:', pendingActions.map(p => ({
      tempId: p.tempId,
      toolName: p.toolName,
      status: p.status,
      actionId: p.actionId
    })));
    // Keep ref in sync with state
    pendingActionsRef.current = pendingActions;
    console.log('[useKeeperStream] Ref updated with current pendingActions');
  }, [pendingActions]);

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
  // Available parsers:
  // const streamParserRef = useRef<ClarineJSONStreamParser>(new ClarineJSONStreamParser(PARSEABLE_AGENT_RESPONSE_SECTIONS, true));
  const streamParserRef = useRef<Lexer>(new Lexer(PARSEABLE_AGENT_RESPONSE_SECTIONS, true));

  // const streamParserRef = useRef<JSONStreamParser>(new JSONStreamParser(PARSEABLE_AGENT_RESPONSE_SECTIONS, true));

  // State for parsed sections - tracks what we've processed to avoid duplicates
  const parsedSectionsRef = useRef<Array<{
    sectionName: string;
    sectionContent: any;
    creationTimestamp?: number;
  }>>([]);

  // Track the latest web_search query to show a small UI indicator
  const lastWebSearchQueryRef = useRef<string | null>(null);

  // TODO USE ACTION CODE EVERYWHERE, ALSO PRETTY SURE THIS IS USElESS
  // Track active tool executions for RQL and asset analysis
  const activeToolExecutionsRef = useRef<Map<string, {
    toolName: string;
    startTime: number;
    params?: any;
  }>>(new Map());

  // Quick refs to most recent cards for precise completion matching
  const lastRqlExecIdRef = useRef<string | null>(null);
  const lastAssetsIdRef = useRef<string | null>(null);
  const lastRqlDiscoverIdRef = useRef<string | null>(null);

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
  }>>(new Map());

  // Helper function to update pendingChanges
  const updatePendingChanges = useCallback((updater: (prev: Map<string, any>) => Map<string, any>) => {
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      const result = updater(newMap);
      return result;
    });
  }, []);

  // Helper function to validate action payloads
  const validateActionPayload = useCallback((toolName: string, params: any): { isValid: boolean; message: string } => {
    // Only validate whitelisted live action tools
    if (!LIVE_ACTION_TOOLS.includes(toolName as any)) {
      return { isValid: false, message: `Tool '${toolName}' is not a live action tool and cannot be validated.` };
    }
    
    if (toolName === 'inventory_management') {
      if (!params.action || typeof params.action !== 'string') {
        return { isValid: false, message: "Missing or invalid 'action' parameter." };
      }
      
      // For delete actions, we need an inventory_item_id
      if (params.action === 'delete') {
        if (!params.inventory_item_id && !params.inventory_id && !params.data?.inventory?.id) {
          return { isValid: false, message: "Missing inventory_item_id for delete action." };
        }
        return { isValid: true, message: "Inventory delete parameters are valid." };
      }
      
      if (!params.data || typeof params.data !== 'object') {
        return { isValid: false, message: "Missing or invalid 'data' parameter." };
      }
      return { isValid: true, message: "Inventory management parameters are valid." };
    }
    
    if (toolName === 'product_management') {
      if (!params.action || typeof params.action !== 'string') {
        return { isValid: false, message: "Missing or invalid 'action' parameter." };
      }
      
      // For delete actions, we need a product_id
      if (params.action === 'delete') {
        if (!params.product_id && !params.data?.product?.id) {
          return { isValid: false, message: "Missing product_id for delete action." };
        }
        return { isValid: true, message: "Product delete parameters are valid." };
      }
      
      if (!params.data || typeof params.data !== 'object') {
        return { isValid: false, message: "Missing or invalid 'data' parameter." };
      }

      // For create actions, validate required fields
      if (params.action === 'create') {
        const data = params.data;
        const missingFields: string[] = [];

        // Product validations
        if (!data.product?.title?.trim()) {
          missingFields.push('product.title');
        }
        if (!data.product?.description?.trim()) {
          missingFields.push('product.description');
        }
        if (!data.product?.price || data.product.price <= 0) {
          missingFields.push('product.price (must be > 0)');
        }
        if (!data.product?.currency || !['EGP', 'USD'].includes(data.product.currency)) {
          missingFields.push('product.currency (must be EGP or USD)');
        }
        if (!data.product?.images || !Array.isArray(data.product.images) || data.product.images.length === 0) {
          missingFields.push('product.images (at least 1 required)');
        }

        // Inventory validations (if not using existing inventory item)
        if (!data.inventoryItemId) {
          if (!data.inventory?.name?.trim()) {
            missingFields.push('inventory.name');
          }
          if (!data.inventory?.sku?.trim()) {
            missingFields.push('inventory.sku');
          }
          if (!data.inventory?.type || !['normal', 'customizable', 'requestable'].includes(data.inventory.type)) {
            missingFields.push('inventory.type (must be normal, customizable, or requestable)');
          }
          if (data.inventory?.stockCount === undefined || data.inventory.stockCount < 0) {
            missingFields.push('inventory.stockCount (must be >= 0)');
          }
          if (data.inventory?.reorderPoint === undefined || data.inventory.reorderPoint < 0) {
            missingFields.push('inventory.reorderPoint (must be >= 0)');
          }
          if (data.inventory?.costPrice === undefined || data.inventory.costPrice < 0) {
            missingFields.push('inventory.costPrice (must be >= 0)');
          }
          if (data.inventory?.weight === undefined || data.inventory.weight < 0) {
            missingFields.push('inventory.weight (must be >= 0)');
          }
          if (!data.inventory?.length || data.inventory.length <= 0) {
            missingFields.push('inventory.length (must be > 0)');
          }
          if (!data.inventory?.width || data.inventory.width <= 0) {
            missingFields.push('inventory.width (must be > 0)');
          }
          if (!data.inventory?.height || data.inventory.height <= 0) {
            missingFields.push('inventory.height (must be > 0)');
          }
          if (!data.inventory?.status || !['listed', 'unlisted', 'archived'].includes(data.inventory.status)) {
            missingFields.push('inventory.status (must be listed, unlisted, or archived)');
          }
        }

        if (missingFields.length > 0) {
          return { 
            isValid: false, 
            message: `Missing or invalid required fields: ${missingFields.join(', ')}. Please provide all required fields for product creation.` 
          };
        }
      }

      return { isValid: true, message: "Product management parameters are valid." };
    }
    
    return { isValid: false, message: `Validation for tool '${toolName}' is not implemented.` };
  }, []);

  // Helper function to generate detailed action descriptions
  const getActionDescription = useCallback((payload: any): string => {
    const params = payload?.params || {};
    const data = params?.data || {};
    
    if (payload.toolName === 'product_management') {
      const action = params.action || 'unknown action';
      const productTitle = data.product?.title || data.product?.name || 'unnamed product';
      const price = data.product?.price ? ` at ${data.product.price} ${data.product.currency || 'EGP'}` : '';
      const sku = data.inventory?.sku || data.product?.sku || '';
      
      if (action === 'create') {
        return `creating product "${productTitle}"${price}${sku ? ` with SKU ${sku}` : ''}`;
      } else if (action === 'update') {
        return `updating product "${productTitle}"${sku ? ` (SKU: ${sku})` : ''}`;
      } else if (action === 'delete') {
        return `deleting product "${productTitle}"${sku ? ` (SKU: ${sku})` : ''}`;
      }
      return `${action} product "${productTitle}"`;
    }
    
    if (payload.toolName === 'inventory_management') {
      const action = params.action || 'unknown action';
      const itemName = data.inventory?.name || data.name || 'unnamed item';
      const sku = data.inventory?.sku || data.sku || '';
      
      if (action === 'create') {
        return `creating inventory item "${itemName}"${sku ? ` with SKU ${sku}` : ''}`;
      } else if (action === 'update') {
        return `updating inventory item "${itemName}"${sku ? ` (SKU: ${sku})` : ''}`;
      } else if (action === 'delete') {
        return `deleting inventory item "${itemName}"${sku ? ` (SKU: ${sku})` : ''}`;
      }
      return `${action} inventory item "${itemName}"`;
    }
    
    // Fallback for other tools
    return `action with parameters: ${JSON.stringify(params).substring(0, 100)}`;
  }, []);

  // Function to record user decisions about actions
  const recordUserDecision = useCallback(async (
    toolName: string, 
    actionParams: any, 
    userDecision: 'approved' | 'rejected', 
    observation: string
  ) => {
    console.log('[useKeeperStream] recordUserDecision called with:', { toolName, userDecision, observation, conversationId });
    
    if (!conversationId) {
      console.warn('[useKeeperStream] No conversationId available, cannot record user decision');
      return false;
    }

    try {
      console.log('[useKeeperStream] Recording user decision:', {
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
        console.warn('[useKeeperStream] Failed to record user decision:', response.error);
        return false;
      } else {
        console.log('[useKeeperStream] Successfully recorded user decision:', response.message);
        return true;
      }
    } catch (error) {
      console.error('[useKeeperStream] Error recording user decision:', error);
      return false;
    }
  }, [conversationId]);

  // Function to confirm and execute an action
  const confirmAndExecuteAction = useCallback(async (tempId: string) => {
    const action = pendingActionsRef.current.find(p => p.tempId === tempId);
    if (!action || action.status !== 'validated') return; // Safety check

    // Only execute whitelisted live action tools
    if (!LIVE_ACTION_TOOLS.includes(action.toolName as any)) {
      console.warn(`[useKeeperStream] Attempted to execute non-whitelisted tool: ${action.toolName}`);
      setPendingActions(prev => prev.map(p => p.tempId === tempId ? {
        ...p,
        status: 'failed',
        executionResult: { success: false, message: `Tool '${action.toolName}' is not a live action tool.` }
      } : p));
      return;
    }

    setPendingActions(prev => prev.map(p => p.tempId === tempId ? { ...p, status: 'executing' } : p));
    // Also update the ref
    pendingActionsRef.current = pendingActionsRef.current.map(p => p.tempId === tempId ? { ...p, status: 'executing' } : p);

    try {
      // Note: User decision recording is now handled by the ProductCreationCard component
      // when the action is actually executed, so we don't need to record it here

      // api calls are implemented in the cards 
      console.log(`[useKeeperStream] Executing action: ${action.toolName}`, action.payload);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate a more specific success message based on the tool and action
      let successMessage = '';
      if (action.toolName === 'inventory_management') {
        const actionType = action.payload.params?.action || 'unknown';
        successMessage = `Inventory ${actionType} operation completed successfully.`;
      } else if (action.toolName === 'product_management') {
        const actionType = action.payload.params?.action || 'unknown';
        successMessage = `Product ${actionType} operation completed successfully.`;
      } else {
        successMessage = `Action '${action.toolName}' completed successfully.`;
      }
      
      setPendingActions(prev => prev.map(p => p.tempId === tempId ? {
        ...p,
        status: 'completed',
        executionResult: { success: true, message: successMessage }
      } : p));
      // Also update the ref
      pendingActionsRef.current = pendingActionsRef.current.map(p => p.tempId === tempId ? {
        ...p,
        status: 'completed',
        executionResult: { success: true, message: successMessage }
      } : p);
      
      // Send final ACTION_RESULT to inform AI of successful execution
      if (action.actionId && eventSourceRef.current?.readyState === WebSocket.OPEN) {
        eventSourceRef.current.send(JSON.stringify({
          type: 'ACTION_RESULT',
          actionId: action.actionId,
          payload: {
            success: true,
            changes: successMessage,
            error: null,
          }
        }));
        console.log('[useKeeperStream] Sent final ACTION_RESULT: Action executed successfully');
      }
    } catch (error: any) {
      setPendingActions(prev => prev.map(p => p.tempId === tempId ? {
        ...p,
        status: 'failed',
        executionResult: { success: false, message: error.message }
      } : p));
      // Also update the ref
      pendingActionsRef.current = pendingActionsRef.current.map(p => p.tempId === tempId ? {
        ...p,
        status: 'failed',
        executionResult: { success: false, message: error.message }
      } : p);
      
      // Send final ACTION_RESULT to inform AI of failed execution
      if (action.actionId && eventSourceRef.current?.readyState === WebSocket.OPEN) {
        eventSourceRef.current.send(JSON.stringify({
          type: 'ACTION_RESULT',
          actionId: action.actionId,
          payload: {
            success: false,
            changes: null,
            error: error.message,
          }
        }));
        console.log('[useKeeperStream] Sent final ACTION_RESULT: Action execution failed');
      }
    }
  }, [pendingActions, setPendingActions, eventSourceRef, conversationId]);

  // Function to reject an action
  const rejectAction = useCallback(async (tempId: string) => {
    const action = pendingActionsRef.current.find(p => p.tempId === tempId);
    if (!action) return;

    // Record the user decision in the database
    await recordUserDecision(
      action.toolName,
      action.payload,
      'rejected',
      `User rejected the ${action.toolName} action for ${getActionDescription(action.payload)}`
    );

    setPendingActions(prev => prev.map(p => p.tempId === tempId ? { ...p, status: 'rejected' as const } : p));
    // Also update the ref
    pendingActionsRef.current = pendingActionsRef.current.map(p => p.tempId === tempId ? { ...p, status: 'rejected' as const } : p);
  }, [setPendingActions, recordUserDecision]);

  // Timeline state and management
  const [timeline, setTimeline] = useState<Array<{
    type: 'userMessage' | 'rawToken' | 'parsedSection' | 'streamEnd' | 'generatedImage' | 'searching' | 'rqlExecution' | 'assetAnalysis';
    id?: string;
    content?: string;
    imageUrls?: string[]; // For user messages with attached images
    sectionName?: string;
    parsedContent?: any;
    parseStartTimestamp: number;
    actionId?: string;
    actionTempId?: string; // Link to pending action for action_json sections
    status?: 'loading' | 'done' | 'executing' | 'completed' | 'failed';
    // Fields for generatedImage type
    imageUrl?: string; 
    prompt?: string;
    loading?: boolean;
    resultsCount?: number;
    // Fields for RQL execution
    query?: string;
    result?: any;
    error?: string;
    // Fields for asset analysis
    assetTypes?: string[];
    assetsFound?: number;
    order: number;
  }>>([]);

  // Chat error state
  const [chatError, setChatError] = useState<{ type: string; message: string } | null>(null);

  // Simple Keeper state storage for swap
  const [storedKeeperState, setStoredKeeperState] = useState<{
    timeline: typeof timeline;
    conversationId: string | null;
    pendingActions: typeof pendingActions;
  } | null>(null);


  // Note: Removed localStorage persistence - state preservation is only for tab switching

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
    //   console.log('[useKeeperStream] [MessageXX]', message);

      switch (message.type) {
        case 'EXECUTE_ACTION':
          console.log(`[useKeeperStream] Received EXECUTE_ACTION from backend.`, message);
          console.log(`[useKeeperStream] Current pendingActions before handling:`, pendingActions.map(p => ({
            tempId: p.tempId,
            toolName: p.toolName,
            status: p.status,
            actionId: p.actionId
          })));

          // Backend is commanding us to perform an action

          const { actionId, action } = message.payload;
          handleExecuteAction(actionId, action);
          break;

        // Unified feedback: results are awaited directly by the manager; no out-of-band forwarding here
        default:

          console.log(`[useKeeperStream] Received EVENTOO from backend.`, message);

          handleStreamEvent(message);
      }
    } catch (error) {
      console.error('[useKeeperStream] Error processing WebSocket message:', error);
    }
  }, [pendingActions, validateActionPayload, setPendingActions]); // Add dependencies

  const handleExecuteAction = async (actionId: string, action: any) => {
    console.log('[useKeeperStream] handleExecuteAction called:', { actionId, action });
    
    // Use the ref to get the most current pending actions (avoiding stale closures)
    const currentPendingActions = pendingActionsRef.current;
    console.log('[useKeeperStream] Current pendingActions (from ref):', currentPendingActions);
    
    // Find the corresponding action that matches the tool name and parameters
    console.log('[useKeeperStream] Looking for action with tool_name:', action.tool_name);
    console.log('[useKeeperStream] Looking for action with params:', action.params);
    console.log('[useKeeperStream] Looking for action with action_code:', action.action_code);
    console.log('[useKeeperStream] Available pending actions:', currentPendingActions.map(p => ({ 
      tempId: p.tempId, 
      toolName: p.toolName, 
      status: p.status,
      actionCode: p.payload.action_code,
      params: p.payload.params
    })));
    
    const targetAction = currentPendingActions.find(p => {
      const toolMatch = p.toolName === action.tool_name;
      const statusMatch = (p.status === 'suggested' || p.status === 'validated');
      
      // NEW STRATEGY: Try action_code matching first (most reliable)
      let actionCodeMatch = false;
      if (action.action_code && p.payload.action_code) {
        actionCodeMatch = action.action_code === p.payload.action_code;
        console.log('[useKeeperStream] Action code match check:', {
          tempId: p.tempId,
          actionCodeMatch,
          backendActionCode: action.action_code,
          frontendActionCode: p.payload.action_code
        });
      }
      
      // FALLBACK STRATEGY: Enhanced parameter matching if no action_code match
      let paramMatch = false;
      if (!actionCodeMatch && p.payload.params && action.params) {
        // For create operations, use more comprehensive matching
        if (action.params.action === 'create' && p.payload.params.action === 'create') {
          // Try to match by multiple fields, not just title
          const existingData = p.payload.params.data;
          const newData = action.params.data;
          
          // Check multiple identifying fields
          const titleMatch = (existingData?.product?.title || existingData?.inventory?.name) === 
                           (newData?.product?.title || newData?.inventory?.name);
          const skuMatch = (existingData?.inventory?.sku || existingData?.product?.sku) === 
                          (newData?.inventory?.sku || newData?.product?.sku);
          const priceMatch = existingData?.product?.price === newData?.product?.price;
          
          // Match if at least 2 out of 3 key fields match (more robust than just title)
          const matchCount = [titleMatch, skuMatch, priceMatch].filter(Boolean).length;
          paramMatch = matchCount >= 2;
          
          console.log('[useKeeperStream] Enhanced create action matching:', {
            tempId: p.tempId,
            titleMatch,
            skuMatch,
            priceMatch,
            matchCount,
            paramMatch,
            existingTitle: existingData?.product?.title || existingData?.inventory?.name,
            newTitle: newData?.product?.title || newData?.inventory?.name,
            existingSku: existingData?.inventory?.sku || existingData?.product?.sku,
            newSku: newData?.inventory?.sku || newData?.product?.sku
          });
        } else {
          // For other operations, use strict JSON comparison
          paramMatch = JSON.stringify(p.payload.params) === JSON.stringify(action.params);
        }
      }
      
      console.log('[useKeeperStream] Final action match check:', {
        tempId: p.tempId,
        toolMatch,
        actionCodeMatch,
        paramMatch,
        statusMatch,
        finalMatch: toolMatch && (actionCodeMatch || paramMatch) && statusMatch
      });
      
      return toolMatch && (actionCodeMatch || paramMatch) && statusMatch;
    });

    if (!targetAction) {
      console.warn(`[useKeeperStream] Received EXECUTE_ACTION for an unknown action.`, { actionId, action });
      console.warn(`[useKeeperStream] No pending action found with tool_name: ${action.tool_name}`);
      return;
    }
    
    console.log('[useKeeperStream] Found target action:', targetAction);

    // Store the backend's actionId for this action
    setPendingActions(prev => prev.map(p =>
      p.tempId === targetAction.tempId
        ? { ...p, actionId: actionId }
        : p
    ));

    // If the action is already validated, we're done - just waiting for user approval
    if (targetAction.status === 'validated') {
      console.log('[useKeeperStream] Action already validated, stored actionId and waiting for user approval');
      
      // Still need to send ACTION_RESULT to unblock the AI
      if (eventSourceRef.current?.readyState === WebSocket.OPEN) {
        const responseMessage = `Action '${action.tool_name}' is already validated and awaiting user approval.`;
        
        eventSourceRef.current.send(JSON.stringify({
          type: 'ACTION_RESULT',
          actionId,
          payload: {
            success: true,
            changes: responseMessage,
            error: null,
          }
        }));
        
        console.log('[useKeeperStream] Sent ACTION_RESULT: Action already validated');
      }
      return;
    }

    // If the action is still suggested, validate it now and update status
    const validation = validateActionPayload(action.tool_name, action.params);
    
    if (validation.isValid) {
      // Update the action's state to 'validated'
      setPendingActions(prev => prev.map(p =>
        p.tempId === targetAction.tempId
          ? { ...p, status: 'validated' }
          : p
      ));
      console.log('[useKeeperStream] Action validated and ready for user approval');
    } else {
      console.log('[useKeeperStream] Action validation failed:', validation.message);
    }
    
    // Inform the AI that the action was successfully added to pending actions
    if (eventSourceRef.current?.readyState === WebSocket.OPEN) {
      const responseMessage = `Action '${action.tool_name}' has been added to pending actions and is awaiting user approval.`;
      
      eventSourceRef.current.send(JSON.stringify({
        type: 'ACTION_RESULT',
        actionId,
        payload: {
          success: true,
          changes: responseMessage,
          error: null,
        }
      }));
      
      console.log('[useKeeperStream] Sent ACTION_RESULT: Action added to pending actions');
    }
  };


  const handleStreamEvent = useCallback((data: any) => {
    try {
      // const data = JSON.parse(event.data);
    //   console.log('[useKeeperStream] Received event:', data);

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
        console.log('[useKeeperStream] Processing completed sections:', currentCompletedSections.length);
        
        // Convert parser sections to legacy format
        const legacySectionsParserFormat: Array<{
          sectionName: string;
          parsedContent: any;
          actionTempId?: string; // Ensure this is part of the type
        }> = [];

        currentCompletedSections.forEach((section: any, index: number) => {
          const sectionName = Object.keys(section)[0];
          const parsedContent = section[sectionName];
          
          console.log(`[useKeeperStream] Processing section ${index}:`, sectionName);

          if (sectionName === 'response') {
            legacySectionsParserFormat.push({
              sectionName: 'response',
              parsedContent,
            });
          }

          // Handle action_json sections for keeper - create pending actions AND add to timeline
          if (sectionName === 'action_json') {
            const actionPayload = parsedContent;
            console.log('[useKeeperStream] Processing action_json:', actionPayload);
            console.log('[useKeeperStream] Current pendingActions count:', pendingActionsRef.current.length);
            
            // A temporary ref to hold the new action we might create,
            // so we can link it to the timeline section.
            let newActionForTimeline: any = null;
            let existingActionForTimeline: any = null;
            
            // Handle both single actions and arrays of actions
            const actionsToProcess = Array.isArray(actionPayload) ? actionPayload : [actionPayload];
            console.log('[useKeeperStream] Processing', actionsToProcess.length, 'action(s)');
            
            // Process each action
            // Normalizer: Ensure params.data.inventory and params.data.product are correctly nested
            const normalizeActionPayload = (inputAction: any) => {
              if (!inputAction || typeof inputAction !== 'object') return inputAction;
              const actionCopy = JSON.parse(JSON.stringify(inputAction));

              const productFieldNames = new Set([
                'title', 'description', 'price', 'priceBeforeDiscount', 'currency', 'images', 'categories',
                'keywords', 'tags', 'shopSection', 'isFeatured', 'metaTitle', 'metaDescription', 'shippingProfileId',
                'returnPolicy', 'shippingOverides', 'taxClass', 'status'
              ]);
              const inventoryFieldNames = new Set([
                'name', 'sku', 'type', 'stockCount', 'reorderPoint', 'costPrice', 'currency', 'categories', 'storageLocation',
                'supplier', 'status', 'weight', 'length', 'width', 'height', 'unit', 'continueSellingOutOfStock', 'imageUrl',
                'customizations'
              ]);

              const params = actionCopy.params ?? (actionCopy.params = {});
              const dataObj = params.data ?? (params.data = {});

              // If params.product exists, merge it into params.data.product
              if (params.product && typeof params.product === 'object') {
                dataObj.product = { ...(dataObj.product || {}), ...params.product };
                delete params.product;
              }

              // Gather product fields mistakenly placed at params level
              const productFromParams: Record<string, any> = {};
              Object.keys(params).forEach((k) => {
                if (productFieldNames.has(k)) {
                  productFromParams[k] = params[k];
                  delete (params as any)[k];
                }
              });
              if (Object.keys(productFromParams).length > 0) {
                dataObj.product = { ...(dataObj.product || {}), ...productFromParams };
              }

              // Gather product fields mistakenly placed at params.data root
              const productFromDataRoot: Record<string, any> = {};
              Object.keys(dataObj).forEach((k) => {
                if (productFieldNames.has(k)) {
                  productFromDataRoot[k] = (dataObj as any)[k];
                  delete (dataObj as any)[k];
                }
              });
              if (Object.keys(productFromDataRoot).length > 0) {
                dataObj.product = { ...(dataObj.product || {}), ...productFromDataRoot };
              }

              // Ensure inventory object exists and absorb stray inventory fields from data root
              const inventoryFromDataRoot: Record<string, any> = {};
              Object.keys(dataObj).forEach((k) => {
                if (inventoryFieldNames.has(k)) {
                  inventoryFromDataRoot[k] = (dataObj as any)[k];
                  delete (dataObj as any)[k];
                }
              });
              if (Object.keys(inventoryFromDataRoot).length > 0) {
                dataObj.inventory = { ...(dataObj.inventory || {}), ...inventoryFromDataRoot };
              }

              // If customizations found at wrong level, move into inventory.customizations
              if ((dataObj as any).customizations && !dataObj.inventory?.customizations) {
                dataObj.inventory = { ...(dataObj.inventory || {}), customizations: (dataObj as any).customizations };
                delete (dataObj as any).customizations;
              }

              return actionCopy;
            };

            actionsToProcess.forEach((singleAction, index) => {
              const normalized = normalizeActionPayload(singleAction);
              console.log(`[useKeeperStream] Processing action ${index + 1}:`, singleAction);
              // console.log(`[useKeeperStream] Action structure:`, {
              //   tool_name: normalized.tool_name,
              //   params: normalized.params,
              //   hasParams: !!normalized.params,
              //   paramsType: typeof normalized.params
              // });
              // Capture web_search query for UI indicator
              if (normalized.tool_name === 'web_search' && normalized.params?.query) {
                lastWebSearchQueryRef.current = String(normalized.params.query);
              }
              
              // Only create pending actions for whitelisted live action tools
              if (!normalized.tool_name || !LIVE_ACTION_TOOLS.includes(normalized.tool_name as any)) {
                console.log(`[useKeeperStream] Skipping non-live action tool: ${normalized.tool_name} (not in whitelist: ${LIVE_ACTION_TOOLS.join(', ')})`);
                return;
              }
              
              // Skip actions without params to prevent validation errors
              if (!normalized.params) {
                console.log(`[useKeeperStream] Skipping action without params:`, normalized);
                return;
              }
              
              // --- START NEW, INTEGRATED LOGIC ---
              setPendingActions(prev => {
                // Helper to find a matching action in the previous state.
                const findExistingAction = (action: any) => {
                  const toolMatch = action.toolName === normalized.tool_name;
                  if (!toolMatch) return false;

                  // NEW STRATEGY: Try action_code matching first (most reliable)
                  if (normalized.action_code && action.payload.action_code) {
                    const actionCodeMatch = normalized.action_code === action.payload.action_code;
                    console.log(`[useKeeperStream] Action code match in findExistingAction:`, {
                      tempId: action.tempId,
                      actionCodeMatch,
                      newActionCode: normalized.action_code,
                      existingActionCode: action.payload.action_code
                    });
                    if (actionCodeMatch) return true;
                  }

                  // FALLBACK STRATEGY: Enhanced parameter matching
                  // Match 'create' actions by multiple fields, not just title
                  if (normalized.params.action === 'create' && action.payload.params.action === 'create') {
                    const existingData = action.payload.params.data;
                    const newData = normalized.params.data;
                    
                    // Check multiple identifying fields
                    const titleMatch = (existingData?.product?.title || existingData?.inventory?.name || existingData?.name || existingData?.title) === 
                                     (newData?.product?.title || newData?.inventory?.name || newData?.name || newData?.title);
                    const skuMatch = (existingData?.inventory?.sku || existingData?.product?.sku) === 
                                    (newData?.inventory?.sku || newData?.product?.sku);
                    const priceMatch = existingData?.product?.price === newData?.product?.price;
                    
                    // Match if at least 2 out of 3 key fields match (more robust than just title)
                    const matchCount = [titleMatch, skuMatch, priceMatch].filter(Boolean).length;
                    const paramMatch = matchCount >= 2;
                    
                    console.log(`[useKeeperStream] Enhanced create matching in findExistingAction:`, {
                      tempId: action.tempId,
                      titleMatch,
                      skuMatch,
                      priceMatch,
                      matchCount,
                      paramMatch
                    });
                    
                    return paramMatch;
                  }

                  // Match 'update'/'delete' actions by a stable ID if available
                  if (['update', 'delete'].includes(normalized.params.action)) {
                    const existingId = action.payload.params.data?.product?.id || action.payload.params.data?.inventory?.id;
                    const newId = normalized.params.data?.product?.id || normalized.params.data?.inventory?.id;
                    return !!existingId && existingId === newId;
                  }

                  // For other operations, use strict JSON comparison as fallback
                  return JSON.stringify(action.payload.params) === JSON.stringify(normalized.params);
                };

                const existingAction = prev.find(findExistingAction);
                
                // console.log(`[useKeeperStream] Looking for existing action with title/name:`, {
                //   newTitle: singleAction.params.data?.product?.title || singleAction.params.data?.inventory?.name || singleAction.params.data?.name || singleAction.params.data?.title,
                //   existingActions: prev.map(p => ({
                //     tempId: p.tempId,
                //     title: p.payload.params.data?.product?.title || p.payload.params.data?.inventory?.name || p.payload.params.data?.name || p.payload.params.data?.title
                //   }))
                // });
                
                if (existingAction) {
                  // FOUND A MATCH: This is an update.
                  console.log(`[useKeeperStream] Updating existing action: ${existingAction.tempId}`);
                  existingActionForTimeline = existingAction; // Set for timeline linking
                  
                  // Update the ref immediately
                  pendingActionsRef.current = prev.map(p =>
                    p.tempId === existingAction.tempId
                      ? { ...p, payload: normalized }
                      : p
                  );
                  
                  return pendingActionsRef.current;
                } else {
                  // NO MATCH: This is a new, distinct action.
                  // Use action_code as prefix for tempId if available, otherwise fallback to timestamp
                  const actionCodePrefix = normalized.action_code ? `${normalized.action_code}-` : '';
                  const newAction = {
                    tempId: `${actionCodePrefix}temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    toolName: normalized.tool_name,
                    payload: normalized,
                    status: 'suggested' as const, // Start as suggested, will become validated when workflow completes
                    createdAt: Date.now(),
                  };
                  
                  console.log(`[useKeeperStream] Creating new distinct action: ${newAction.tempId} as suggested (action_code: ${normalized.action_code})`);
                  newActionForTimeline = newAction; // Set for timeline linking

                  // Store the action in a ref for immediate access
                  pendingActionsRef.current = [...prev, newAction];
                  
                  return pendingActionsRef.current;
                }
              });
              // --- END NEW, INTEGRATED LOGIC ---
              
              // Now, push to the legacy format array using the result from above.
              // This is the bridge between the two pieces of logic.
              const tempIdToLink = newActionForTimeline?.tempId || existingActionForTimeline?.tempId;
              if (tempIdToLink) {
                legacySectionsParserFormat.push({
                  sectionName: 'action_json',
                  parsedContent: normalized,
                  actionTempId: tempIdToLink, // The critical link!
                });
              }

              // Reset for the next potential action in the same stream.
              newActionForTimeline = null; 
              existingActionForTimeline = null;
            });
            
            return;
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
          console.log('wtf potentiallyNewSection', potentiallyNewSection, 'wtf merging with', existingLastSection);

          if (
            potentiallyNewSection &&
            !isEqual(existingLastSection.sectionContent, potentiallyNewSection.parsedContent) &&
            existingLastSection.sectionName == potentiallyNewSection.sectionName
          ) {
            console.log('wtf we are merging!!')
            // Content updated - update the existing section in timeline
            setTimeline(prev => {
              const timeline = [...prev];

              // let last = timeline.filter(item => item.type === 'parsedSection' && item.sectionName === existingLastSection.sectionName).at(-1)
              const lastIndex = timeline.findLastIndex(item => item.type === 'parsedSection' && item.sectionName === existingLastSection.sectionName);
              if (lastIndex >= 0) {
                timeline[lastIndex] = {
                  ...timeline[lastIndex],
                  parsedContent: potentiallyNewSection.parsedContent,
                  actionTempId: potentiallyNewSection.actionTempId || timeline[lastIndex].actionTempId, // Preserve the ID
                };
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
              actionTempId: section.actionTempId, // Include the actionTempId link
              parseStartTimestamp: Date.now(),
              order: timeline.length + 1
            });
            return timeline;
          });
        });
      }

      return; // Stop further processing for this chunk
    }

      // --- IMAGE GENERATED EVENT HANDLER ---
      if (data.type === 'image_generated') {
        console.log('[useKeeperStream] Received image_generated event:', data);
        setTimeline(prev => {
          const next = [...prev];
          // Try to find the most recent pending generatedImage and fill it
          const idx = [...next].reverse().findIndex(item => item.type === 'generatedImage' && item.loading);
          if (idx !== -1) {
            const realIdx = next.length - 1 - idx;
            next[realIdx] = {
              ...next[realIdx],
              loading: false,
              imageUrl: data.data.image_url,
              prompt: undefined,
            };
            return next;
          }
          // Fallback: if no pending placeholder exists, push a new one
          next.push({
            type: 'generatedImage',
            id: `image-${Date.now()}`,
            imageUrl: data.data.image_url,
            parseStartTimestamp: Date.now(),
            loading: false,
            order: next.length + 1,
          });
          return next;
        });
        return;
      }
      // --- END IMAGE GENERATED EVENT HANDLER ---

      // --- WEB SEARCH STARTED INDICATOR ---
      if (
        data.type === 'step_progress' &&
        /Executing local tool:\s*web_search/.test(data.message || '')
      ) {
        const query = lastWebSearchQueryRef.current;
        setTimeline(prev => {
          // Avoid duplicates only if there is an active loading chip
          const hasActiveSearching = prev.some(item => item.type === 'searching' && item.status !== 'done');
          if (hasActiveSearching) return prev;
          return [
            ...prev,
            {
              type: 'searching',
              id: `search-${Date.now()}`,
              content: query || 'Searching the web...',
              parseStartTimestamp: Date.now(),
              order: prev.length + 1,
              status: 'loading'
            }
          ];
        });
        return;
      }
      // --- END WEB SEARCH STARTED INDICATOR ---

      // --- WEB SEARCH COMPLETED: REMOVE INDICATOR + CAPTURE SOURCES ---
      if (
        (data.type === 'tool_result' || data.type === 'step_progress') && (
          data.tool === 'web_search' || data.tool_used === 'web_search' || data.toolName === 'web_search' ||
          /Completed tool:\s*web_search/.test(data.message || '') || /Completed local tool:\s*web_search/.test(data.message || '') ||
          /web search completed/.test((data.message || '').toLowerCase())
        )
      ) {
        // If the backend sent a sources payload, stash it for the Sources UI
        if (data.data?.web_search) {
          const rawSources = Array.isArray(data.data.web_search.sources) ? data.data.web_search.sources : [];
          const normalized = rawSources.map((s: any) => {
            try {
              const u = new URL(s.url || s.source_url || '');
              const hostname = u.hostname.replace(/^www\./, '');
              return {
                url: s.url || s.source_url || '',
                title: s.title || hostname,
                snippet: (s.snippet || s.content || '').slice(0, 220)
              };
            } catch {
              return {
                url: s.url || s.source_url || '',
                title: s.title || (s.url || s.source_url || ''),
                snippet: (s.snippet || s.content || '').slice(0, 220)
              };
            }
          });
          pushWebSearchSources({
            query: data.data.web_search.query,
            sources: normalized
          });
        }
        setTimeline(prev => {
          // Mark the most recent searching chip as done; also add a footer marker for this turn
          const idxReverse = [...prev].reverse().findIndex(item => item.type === 'searching' && item.status !== 'done');
          if (idxReverse === -1) return prev;
          const realIdx = prev.length - 1 - idxReverse;
          const next = [...prev];
          // Count sources if available
          const rawSources2 = Array.isArray(data.data?.web_search?.sources) ? data.data.web_search.sources : [];
          const normalized2 = rawSources2.map((s: any) => {
            try {
              const u = new URL(s.url || s.source_url || '');
              const hostname = u.hostname.replace(/^www\./, '');
              return {
                url: s.url || s.source_url || '',
                title: s.title || hostname,
                snippet: (s.snippet || s.content || '').slice(0, 220)
              };
            } catch {
              return {
                url: s.url || s.source_url || '',
                title: s.title || (s.url || s.source_url || ''),
                snippet: (s.snippet || s.content || '').slice(0, 220)
              };
            }
          });
          next[realIdx] = { ...next[realIdx], status: 'done', resultsCount: normalized2.length };
          // Ensure a footer marker exists before the next streamEnd
          const footerPayload = {
            hasWebSearch: true,
            query: data.data?.web_search?.query,
            sources: normalized2
          };
          // Always append a new footer marker for this turn so each turn has its own Sources pill
          next.push({
            type: 'parsedSection' as any,
            sectionName: 'response_footer',
            parsedContent: footerPayload,
            parseStartTimestamp: Date.now(),
            order: (next.at(-1)?.order || 0) + 1
          } as any);
          return next;
        });
        return;
      }
      // --- END WEB SEARCH COMPLETED ---

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

      // --- RQL EXECUTION START HANDLER ---
      if (
        data.type === 'step_progress' &&
        data.tool === 'rql_executor' &&
        !/Completed local tool:\s*rql_executor/i.test(data.message || '')
      ) {
        console.log('[useKeeperStream] RQL execution started:', data);
        const executionId = `rql-${Date.now()}`;
        const query = data.data?.query || 'Unknown query';
        
        // Track the execution
        activeToolExecutionsRef.current.set(executionId, {
          toolName: 'rql_executor',
          startTime: Date.now(),
          params: data.data
        });

        setTimeline(prev => {
          // Avoid duplicating an executing card for the same tool
          if (prev.slice().reverse().find(i => i.type === 'rqlExecution' && i.status === 'executing')) return prev;
          return ([
            ...prev,
            {
              type: 'rqlExecution',
              id: executionId,
              parseStartTimestamp: Date.now(),
              status: 'executing',
              query: query,
              order: prev.length + 1,
            }
          ]);
        });
        lastRqlExecIdRef.current = executionId;
        return;
      }
      // --- END RQL EXECUTION START HANDLER ---

      // --- ASSET ANALYSIS START HANDLER ---
      if (
        data.type === 'step_progress' &&
        data.tool === 'analyze_assets' &&
        !/Completed local tool:\s*analyze_assets/i.test(data.message || '')
      ) {
        console.log('[useKeeperStream] Asset analysis started:', data);
        const executionId = `assets-${Date.now()}`;
        const assetTypes = data.data?.asset_types || ['image', 'video', 'document'];
        
        // Track the execution
        activeToolExecutionsRef.current.set(executionId, {
          toolName: 'analyze_assets',
          startTime: Date.now(),
          params: data.data
        });

        setTimeline(prev => {
          // Avoid duplicating an executing card for the same tool
          if (prev.slice().reverse().find(i => i.type === 'assetAnalysis' && i.status === 'executing')) return prev;
          return ([
            ...prev,
            {
              type: 'assetAnalysis',
              id: executionId,
              parseStartTimestamp: Date.now(),
              status: 'executing',
              assetTypes: assetTypes,
              order: prev.length + 1,
            }
          ]);
        });
        lastAssetsIdRef.current = executionId;
        return;
      }
      // --- END ASSET ANALYSIS START HANDLER ---

      // --- RQL DISCOVERY START HANDLER ---
      if (
        data.type === 'step_progress' &&
        data.tool === 'discover_rql_data' &&
        !/Completed local tool:\s*discover_rql_data/i.test(data.message || '')
      ) {
        const executionId = `rql-discover-${Date.now()}`;
        setTimeline(prev => {
          // Avoid duplicating an executing card for discovery
          if (prev.slice().reverse().find(i => i.type === 'rqlExecution' && i.status === 'executing' && i.query === 'discover_rql_data')) return prev;
          return ([
            ...prev,
            {
              type: 'rqlExecution',
              id: executionId,
              parseStartTimestamp: Date.now(),
              status: 'executing',
              query: 'discover_rql_data',
              order: prev.length + 1,
            }
          ]);
        });
        lastRqlDiscoverIdRef.current = executionId;
        return;
      }
      // --- END RQL DISCOVERY START HANDLER ---

      // --- TOOL COMPLETION HANDLERS ---
        // Handle RQL execution completion
        if (data.type === 'step_progress' && (data.tool === 'rql_executor' || /Completed local tool:\s*rql_executor/.test(data.message || ''))) {
         console.log('[useKeeperStream] RQL execution completed:', data);
        setTimeline(prev => {
          const next = [...prev];
          // Prefer targeting by last known id
          let targetIdx = -1;
          if (lastRqlExecIdRef.current) {
            targetIdx = next.findIndex(item => item.type === 'rqlExecution' && item.id === lastRqlExecIdRef.current);
          }
          // Fallback: find most recent executing RQL (excluding discovery)
          if (targetIdx === -1) {
            const revIdx = [...next].reverse().findIndex(item => item.type === 'rqlExecution' && item.status === 'executing' && item.query !== 'discover_rql_data');
            if (revIdx !== -1) targetIdx = next.length - 1 - revIdx;
          }
          
          if (targetIdx !== -1) {
            next[targetIdx] = {
              ...next[targetIdx],
              status: 'completed',
              result: data.data || 'Query executed successfully'
            };
          }
          
          return next;
        });
        return;
      }

        // Handle asset analysis completion
      if (data.type === 'step_progress' && (data.tool === 'analyze_assets' || /Completed local tool:\s*analyze_assets/.test(data.message || ''))) {
          console.log('[useKeeperStream] Asset analysis completed:', data);
        setTimeline(prev => {
          const next = [...prev];
          // Prefer targeting by last known id
          let targetIdx = -1;
          if (lastAssetsIdRef.current) {
            targetIdx = next.findIndex(item => item.type === 'assetAnalysis' && item.id === lastAssetsIdRef.current);
          }
          // Fallback: find most recent executing asset analysis
          if (targetIdx === -1) {
            const revIdx = [...next].reverse().findIndex(item => item.type === 'assetAnalysis' && item.status === 'executing');
            if (revIdx !== -1) targetIdx = next.length - 1 - revIdx;
          }
          
          if (targetIdx !== -1) {
            const result = data.data || {};
            // Accept multiple possible shapes from backend
            const assets = (result.assets?.images || result.assets?.assets || result.assets || result.available_for_osdl || []).filter?.(() => true) || [];
            
            next[targetIdx] = {
              ...next[targetIdx],
              status: 'completed',
              result: result,
              assetsFound: assets.length
            };
          }
          
          return next;
        });
        return;
      }

        // Handle RQL discovery completion
        if (data.type === 'step_progress' && (data.tool === 'discover_rql_data' || /Completed local tool:\s*discover_rql_data/.test(data.message || ''))) {
        setTimeline(prev => {
          const next = [...prev];
          // Prefer targeting by last known id
          let targetIdx = -1;
          if (lastRqlDiscoverIdRef.current) {
            targetIdx = next.findIndex(item => item.type === 'rqlExecution' && item.id === lastRqlDiscoverIdRef.current);
          }
          // Fallback: find most recent executing discovery
          if (targetIdx === -1) {
            const revIdx = [...next].reverse().findIndex(item => item.type === 'rqlExecution' && item.status === 'executing' && item.query === 'discover_rql_data');
            if (revIdx !== -1) targetIdx = next.length - 1 - revIdx;
          }

          if (targetIdx !== -1) {
            next[targetIdx] = {
              ...next[targetIdx],
              status: 'completed',
              result: data.data || 'Discovery completed'
            };
          }
          return next;
        });
        return;
      }

      // Handle tool failures
      if (data.type === 'step_failed') {
        const toolName = data.tool_used || data.tool;
        if (toolName === 'rql_executor') {
          setTimeline(prev => {
            const next = [...prev];
            const rqlIndex = [...next].reverse().findIndex(item => 
              item.type === 'rqlExecution' && item.status === 'executing' && item.query !== 'discover_rql_data'
            );
            
            if (rqlIndex !== -1) {
              const realIndex = next.length - 1 - rqlIndex;
              next[realIndex] = {
                ...next[realIndex],
                status: 'failed',
                error: data.message || 'RQL query failed'
              };
            }
            
            return next;
          });
          return;
        }
        
        if (toolName === 'analyze_assets') {
          setTimeline(prev => {
            const next = [...prev];
            const assetIndex = [...next].reverse().findIndex(item => 
              item.type === 'assetAnalysis' && item.status === 'executing'
            );
            
            if (assetIndex !== -1) {
              const realIndex = next.length - 1 - assetIndex;
              next[realIndex] = {
                ...next[realIndex],
                status: 'failed',
                error: data.message || 'Asset analysis failed'
              };
            }
            
            return next;
          });
          return;
        }

        if (toolName === 'discover_rql_data') {
          setTimeline(prev => {
            const next = [...prev];
            const idx = [...next].reverse().findIndex(item => 
              item.type === 'rqlExecution' && item.status === 'executing' && item.query === 'discover_rql_data'
            );
            if (idx !== -1) {
              const realIdx = next.length - 1 - idx;
              next[realIdx] = {
                ...next[realIdx],
                status: 'failed',
                error: data.message || 'RQL discovery failed'
              };
            }
            return next;
          });
          return;
        }
      }
      // --- END TOOL COMPLETION HANDLERS ---

      // Reset parser state at the start of a new turn to avoid carry-over
      if (data.type === 'workflow_started' || data.type === 'step_started' && data.step_number === 0) {
        streamParserRef.current.resetAll();
        parsedSectionsRef.current = [];
      }

      if (data.type === 'workflow_completed' || data.type === 'workflow_interruption') {
        console.log(`[useKeeperStream] Workflow for this turn has finished with status: ${data.type}`);

        // Mark all suggested actions as validated when workflow completes
        setPendingActions(prev => {
          return prev.map(action => {
            if (action.status === 'suggested') {
              console.log(`[useKeeperStream] Marking action ${action.tempId} as validated`);
              return { ...action, status: 'validated' as const };
            }
            return action;
          });
        });

        setIsKeeperBusy(false);

        streamParserRef.current.resetAll();
        parsedSectionsRef.current = [];

        // Add stream end to timeline
        setTimeline(prev => {
          // check if the last item is already a streamEnd (extra safety)
          if (prev.length > 0 && prev[prev.length - 1].type === 'streamEnd') {
            console.warn('[useKeeperStream] Last item is already streamEnd, skipping duplicate');
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

      if (data.type === 'error') {
        console.log('[useKeeperStream] Workflow error:', data.message, data.data);
        // Forward a structured chat error to the UI (ChatPanel)
        const errorType = data?.data?.errorType || 'generic';
        const retryAfterSeconds = data?.data?.retryAfterSeconds;
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
      console.error('[useKeeperStream] Error parsing stream event:', error);
    }
  }, [currentPageId]);

  const startStream = useCallback(async (
    prompt: string,
    imageUrls: Array<string> = [],
    modelTier: 'low' | 'mid' | 'high' = 'mid'
  ) => {

    console.log('[useKeeperStream] startStream called', { prompt, isKeeperBusy, conversationId });
    if (isKeeperBusy) {
      console.warn('[useKeeperStream] Agent is already busy.');
      return;
    }

    // Reset the parser and section state for the new turn.
    // This is the critical fix to prevent state corruption from the previous turn.
    console.log('[useKeeperStream] Resetting parser state for new turn.');
    streamParserRef.current.resetAll();
    parsedSectionsRef.current = [];
    setChatError(null); // Clear any previous errors

    setIsKeeperBusy(true);


    try {
      if (!session.user?.id || !session.shop?.id) {
        throw new Error('Cannot start agent stream: User not logged in or shop not found');
      }

      // Enhance the prompt with referenced sections if any
      let enhancedPrompt = prompt;


      const response = await startAgentStream({
        prompt: enhancedPrompt,
        sessionId: conversationId,
        context: {
          userId: session.user?.id,
          shopId: session.shop?.id,
          imageUrls: imageUrls || []
        },
        source: 'keeper',
        modelTier: modelTier,
      });

      if (response.success && response.sessionId && response.websocketUrl) {
        setConversationId(response.sessionId);

        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = response.websocketUrl.replace(/^http/, 'ws');
        console.log('ws url', wsUrl);

        eventSourceRef.current = new WebSocket(wsUrl);

        eventSourceRef.current.onopen = () => console.log(`[useKeeperStream] WebSocket connected to ${wsUrl}`);
        eventSourceRef.current.onmessage = (event: MessageEvent) => {
        //   console.log('[useKeeperStream]  ONMESSAGE HANDLER FIRED. Data received:', event.data);
          handleWebSocketMessage(event);
        };
        eventSourceRef.current.onclose = () => {
          console.log('[useKeeperStream] WebSocket connection closed by server.');
          closeStream();
        };

        eventSourceRef.current.onerror = (err) => {
          if (!(eventSourceRef.current) || (eventSourceRef.current as any)?.readyState === 2 || (eventSourceRef.current as any)?.readyState === 0) {
            // Closed naturally
            return;
          }
          console.error('[useKeeperStream] EventSource error:', err);
          // Remove the user message since the connection failed

          closeStream();
        };

      } else {
        throw new Error(response.message || 'Failed to start agent stream');
      }
    } catch (error) {
      console.error('[useKeeperStream] Error starting stream:', error);
      // Remove the user message that was just added since the request failed

      closeStream();
      // Re-throw the error so the Promise rejects properly
      throw error;
    }
  }, [isKeeperBusy, setIsKeeperBusy,
    selectedNodes, currentPageId, conversationId,
    handleStreamEvent, handleWebSocketMessage, setPendingActions]);

  const startNewConversation = useCallback(() => {
    closeStream(); // Ensure any active turn is stopped

    setConversationId(null); // Clear the persistent ID
    
    // Reset the parser state
    streamParserRef.current.resetAll();
    parsedSectionsRef.current = [];

    // Clear pending actions
    setPendingActions([]);
    
    // Clear timeline
    setTimeline([]);
    
    // Clear any ongoing diff capture
    currentDiffRef.current = null;
    
    // Note: No localStorage clearing needed - state preservation is only for tab switching
    
    console.log('[useKeeperStream] New conversation started. State has been reset.');
  }, [setConversationId, setPendingActions, setTimeline]);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current && eventSourceRef.current.readyState === WebSocket.OPEN) {
      // Send stop message to backend
      eventSourceRef.current.send(JSON.stringify({
        type: 'STOP_STREAM'
      }));

      setIsKeeperBusy(false);

      console.log('[useKeeperStream] Sent STOP_STREAM message to backend.');
    }
  }, []);

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      console.log('[useKeeperStream] WebSocket closed.');
    }

    setIsKeeperBusy(false);

    // Clear any ongoing diff capture
    currentDiffRef.current = null;


  }, [setIsKeeperBusy, stopStream]);

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

  // Simple swap functions
  const storeKeeperState = useCallback(() => {
    const stateToStore = {
      timeline: [...timeline],
      conversationId,
      pendingActions: [...pendingActions]
    };
    console.log('🔄 STORING Keeper state:', { 
      timelineLength: timeline.length, 
      conversationId,
      pendingActionsCount: pendingActions.length,
      stateToStore
    });
    setStoredKeeperState(stateToStore);
  }, [timeline, conversationId, pendingActions]);

  const restoreKeeperState = useCallback((onConversationIdChange?: (id: string | null) => void) => {
    console.log('🔄 RESTORE called with storedKeeperState:', storedKeeperState);
    if (storedKeeperState) {
      console.log('🔄 RESTORING Keeper state:', { 
        timelineLength: storedKeeperState.timeline.length, 
        conversationId: storedKeeperState.conversationId,
        pendingActionsCount: storedKeeperState.pendingActions.length,
        fullStoredState: storedKeeperState
      });
      setTimeline(storedKeeperState.timeline);
      setConversationId(storedKeeperState.conversationId);
      setPendingActions(storedKeeperState.pendingActions);
      // Also call the callback to update the atom
      if (onConversationIdChange) {
        onConversationIdChange(storedKeeperState.conversationId);
      }
    } else {
      console.log('🔄 No stored state to restore - will go back to empty');
      // If no stored state, clear everything to go back to empty
      setTimeline([]);
      setConversationId(null);
      setPendingActions([]);
      // Also call the callback to update the atom
      if (onConversationIdChange) {
        onConversationIdChange(null);
      }
    }
  }, [storedKeeperState, setConversationId, setPendingActions]);

  const clearStoredKeeperState = useCallback(() => {
    console.log('🔄 CLEARING stored Keeper state');
    setStoredKeeperState(null);
  }, []);


  // Function to add historical actions to pending actions
  const addHistoricalActions = useCallback((historicalActions: Array<{
    tempId: string;
    toolName: string;
    payload: any;
    status: 'suggested' | 'validated' | 'executing' | 'completed' | 'failed' | 'rejected';
    actionId?: string;
    executionResult?: { success: boolean; message: string };
  }>) => {
    console.log('[useKeeperStream] Adding historical actions to pending actions:', historicalActions);
    setPendingActions(prev => {
      // Filter out any actions that already exist to prevent duplicates
      const existingTempIds = new Set(prev.map(p => p.tempId));
      const newActions = historicalActions.filter(action => !existingTempIds.has(action.tempId));
      
      if (newActions.length !== historicalActions.length) {
        console.log('[useKeeperStream] Filtered out duplicate historical actions:', 
          historicalActions.length - newActions.length, 'duplicates');
      }
      
      return [...prev, ...newActions];
    });
  }, [setPendingActions]);

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
    isKeeperBusy,
    conversationId,
    startNewConversation,
    pendingChanges: pendingChanges,
    setPendingChanges: updatePendingChanges,
    streamParser: streamParserRef.current,
    timeline,
    setTimeline,
    chatError,
    setChatError,
    addUserMessage,
    // Action lifecycle management
    pendingActions,
    confirmAndExecuteAction,
    rejectAction,
    addHistoricalActions,
    // User decision recording
    recordUserDecision,
    // Simple swap functions
    storeKeeperState,
    restoreKeeperState,
    clearStoredKeeperState,
    storedKeeperState,
  };
}; 
