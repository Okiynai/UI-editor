import type { Message } from '@/hooks/useChats';
import { AgentTimelineItem } from '@/OSDL/editor/hooks/useBuilderStream';
import { findNodeRef } from './nodeUtils';

// Type for historical actions (similar to Keeper)
type HistoricalAction = {
    tempId: string;
    toolName: string;
    payload: any;
    status: 'suggested' | 'validated' | 'executing' | 'completed' | 'failed' | 'rejected';
    actionId?: string;
    executionResult?: { success: boolean; message: string };
};

export const loadDBMessagesToTimeline = (messages: Message[], pageDefinition: any): { timeline: AgentTimelineItem[], historicalActions: HistoricalAction[] } => {
    let order = 0;
    const timelineItems: AgentTimelineItem[] = [];
    const historicalActions: HistoricalAction[] = [];
    const seenActionIds = new Set<string>(); // Track seen action IDs to prevent duplicates
    const seenResponseIds = new Set<string>(); // Track seen response IDs to prevent duplicates
    const seenWorkflowIds = new Set<string>(); // Track seen workflow completion IDs to prevent duplicates
    const seenImageIds = new Set<string>(); // Track seen image IDs to prevent duplicates
    
    // First pass: collect all user decisions by action_code
    const userDecisionsByActionCode = new Map<string, {
        decision: 'approved' | 'rejected';
        timestamp: number;
        observation: string;
    }>();
    
    messages.forEach((message) => {
        if (message.role === 'assistant') {
            message.events?.forEach((event) => {
                if (event.event_type === 'user_decision' && event.data?.actionParams?.action_code) {
                    const actionCode = event.data.actionParams.action_code;
                    userDecisionsByActionCode.set(actionCode, {
                        decision: event.data.userDecision,
                        timestamp: event.timestamp,
                        observation: event.data.observation || ''
                    });
                    console.log('[loadChatFromDB] Found user decision for action_code:', actionCode, event.data.userDecision);
                }
            });
        }
    });

    messages.forEach((message) => {
        if (message.role === 'user') {
            // Extract images from user message metadata
            const userImages: string[] = [];
            message.events?.forEach((event) => {
                if (event.event_type === 'user_message' && event.metadata?.images) {
                    userImages.push(...event.metadata.images);
                }
            });

            timelineItems.push({
                id: message.id,
                type: 'userMessage' as const,
                parseStartTimestamp: message.createdAt,
                content: message.content || '',
                imageUrls: userImages,
                order: order++
            });
            return;
        } 

        if (message.role === 'assistant') {
            // Process each event in the message
            message.events?.forEach((event) => {
                if (event.event_type === 'assistant_message') {
                    // Create a unique ID for this response based on message content and timestamp
                    const responseId = `${message.id}-${event.timestamp}-${event.message?.substring(0, 50) || 'empty'}`;
                    
                    // Check if we've already seen this response to prevent duplicates
                    if (seenResponseIds.has(responseId)) {
                        console.log('[loadChatFromDB] Skipping duplicate response:', responseId);
                        return;
                    }
                    seenResponseIds.add(responseId);
                    
                    // just normal response section
                    timelineItems.push({
                        type: 'parsedSection' as const,
                        sectionName: 'response',
                        parsedContent: event.message,
                        parseStartTimestamp: event.timestamp,
                        order: order++
                    });
                    return;
                }

                if(event.event_type === 'workflow_completed') {
                    // Create a unique ID for this workflow completion
                    const workflowId = `${message.id}-workflow-${event.timestamp}`;
                    
                    // Check if we've already seen this workflow completion
                    if (seenWorkflowIds.has(workflowId)) {
                        console.log('[loadChatFromDB] Skipping duplicate workflow completion:', workflowId);
                        return;
                    }
                    seenWorkflowIds.add(workflowId);
                    
                    // stream end indicator
                    timelineItems.push({
                        type: 'streamEnd' as const,
                        parseStartTimestamp: event.timestamp,
                        order: order++
                    });
                    return;
                }

                // Handle reasoning chunks
                if (event.event_type === 'reasoning_chunk') {
                    // Create a unique ID for this reasoning chunk
                    const reasoningId = `reasoning-${event.timestamp}-${event.data?.reasoning_content?.substring(0, 50) || 'empty'}`;
                    
                    // Check if we've already seen this reasoning chunk
                    if (seenResponseIds.has(reasoningId)) {
                        console.log('[loadChatFromDB] Skipping duplicate reasoning chunk:', reasoningId);
                        return;
                    }
                    seenResponseIds.add(reasoningId);
                    
                    timelineItems.push({
                        type: 'parsedSection' as const,
                        sectionName: 'reasoning',
                        parsedContent: {
                            rawContent: event.data?.reasoning_content || '',
                            startTimestamp: event.timestamp,
                            endTimestamp: event.timestamp
                        },
                        parseStartTimestamp: event.timestamp,
                        order: order++
                    });
                    return;
                }

                // Handle image generation events
                if (event.event_type === 'image_generated') {
                    // Create a unique ID for this image
                    const imageId = `image-${event.timestamp}-${event.data?.image_url || 'no-url'}`;

                    // Check if we've already seen this image
                    if (seenImageIds.has(imageId)) {
                        console.log('[loadChatFromDb] Skipping duplicate image:', imageId);
                        return;
                    }
                    seenImageIds.add(imageId);

                    // Create a new image item
                    timelineItems.push({
                        type: 'generatedImage' as const,
                        id: imageId,
                        imageUrl: event.data?.image_url,
                        prompt: event.data?.prompt,
                        parseStartTimestamp: event.timestamp,
                        loading: false,
                        order: order++
                    });
                    return;
                }

                if(event.event_type === 'tool_call') {
                    // Generate a temporary ID for the action using action_code if available
                    const actionCode = event.data.action?.action_code;
                    const tempId = actionCode 
                        ? `history-${actionCode}-${event.timestamp}`
                        : `history-${event.timestamp}-${Math.random().toString(36).substr(2, 9)}`;
                    
                    // Check if we've already seen this action to prevent duplicates
                    if (seenActionIds.has(tempId)) {
                        console.log('[loadChatFromDB] Skipping duplicate historical action:', tempId);
                        return;
                    }
                    seenActionIds.add(tempId);
                    
                    // Check if there's a user decision for this action
                    const userDecision = actionCode ? userDecisionsByActionCode.get(actionCode) : null;
                    
                    // Determine status based on user decision - Builder specific logic:
                    // Actions that were neither rejected nor accepted are set as rejected
                    let status: 'suggested' | 'validated' | 'executing' | 'completed' | 'failed' | 'rejected';
                    let executionResult: { success: boolean; message: string } | undefined;
                    
                    if (userDecision) {
                        if (userDecision.decision === 'approved') {
                            status = 'completed';
                            executionResult = {
                                success: true,
                                message: userDecision.observation || 'Action completed successfully'
                            };
                        } else {
                            status = 'rejected';
                            executionResult = {
                                success: false,
                                message: userDecision.observation || 'Action was rejected by user'
                            };
                        }
                    } else {
                        // Builder-specific: Actions without user decision are set as rejected
                        status = 'rejected';
                        executionResult = {
                            success: false,
                            message: 'Action was automatically rejected (no user decision)'
                        };
                    }
                    
                    // Create historical action
                    const historicalAction: HistoricalAction = {
                        tempId,
                        toolName: event.tool_used,
                        payload: {
                            tool_name: event.tool_used,
                            params: event.data.action?.params || {},
                            action_code: actionCode
                        },
                        status,
                        executionResult
                    };
                    
                    historicalActions.push(historicalAction);
                    
                    // Get node information for display
                    const nodeId = tool_parser(event.data.action, event.tool_used);
                    const nodeRef = nodeId ? findNodeRef(pageDefinition.nodes, nodeId) : null;
                    const nodeName = nodeRef ? nodeRef.name || nodeRef.type || 'Unknown Node' : 'Deleted Node';
                    
                    // Add to timeline for display purposes
                    timelineItems.push({
                        type: 'parsedSection' as const,
                        sectionName: 'action_json',
                        parsedContent: {
                            tool_name: event.tool_used,
                            params: event.data.action?.params || {},
                            action_code: event.data.action?.action_code,
                            node_name: nodeName,
                            isLoaded: true
                        },
                        actionId: actionCode, // Link using action_code
                        parseStartTimestamp: event.timestamp,
                        order: order++
                    });
                }
            });
        }
    });

    console.log('[loadChatFromDB] Processed timeline items:', {
        totalMessages: messages.length,
        timelineItems: timelineItems.length,
        historicalActions: historicalActions.length,
        responseCount: seenResponseIds.size,
        workflowCount: seenWorkflowIds.size,
        actionCount: seenActionIds.size,
        userDecisionsFound: userDecisionsByActionCode.size,
        reasoningChunks: timelineItems.filter(item => item.type === 'parsedSection' && item.sectionName === 'reasoning').length,
        userDecisions: Array.from(userDecisionsByActionCode.entries()).map(([code, decision]) => ({
            actionCode: code,
            decision: decision.decision,
            observation: decision.observation
        }))
    });
    
    return { timeline: timelineItems, historicalActions };
};

const tool_parser = (action: any, tool_used: string) => {
    switch (tool_used) {
        case 'create_osdl_node':
            return action.params.node_payload.id;
            break;

        case 'modify_osdl_node':
            return action.params.node_id;
            break;

        case 'delete_osdl_node':
            return action.params.node_id;
            break;

        case 'add_pre_built_section':
            return action.params.section_id;
            break;

        case 'analyze_assets':
            return null;
            break;

        default:
            break;
    }
};