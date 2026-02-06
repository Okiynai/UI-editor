import { TbAirConditioningDisabled } from "react-icons/tb";
import { AgentTimelineItem } from "@/OSDL/editor/hooks/useBuilderStream";
import { AgentChange } from "@/store/editor";

// Enable/disable logging for this file
const ENABLE_LOGS = true;

const log = (message: string, data?: any) => {
    if (ENABLE_LOGS) {
        console.log(`🔗 [handleBindChanges] ${message}`, data);
    }
};

const logWarn = (message: string, data?: any) => {
    if (ENABLE_LOGS) {
        console.warn(`🔗 [handleBindChanges] ${message}`, data);
    }
};



export const ALLOWED_TOOLS = ['create_osdl_node', 'modify_osdl_node', 'delete_osdl_node', 'add_pre_built_section'];

interface ChangeType {
    id: string;
    success: any;
    error: any;
    toolUsed: string;
    change?: AgentChange | null;
    timestamp?: number;
    choice?: 'kept' | 'rejected';
    isAssociated?: boolean;
    actionCode?: string; // Add action_code support
};

interface HandleBindChangesDependencies {
    setTimeline: (timeline: AgentTimelineItem[] | ((prev: AgentTimelineItem[]) => AgentTimelineItem[])) => void;
    setPendingChanges: (updater: (prev: Map<string, ChangeType>) => Map<string, ChangeType>) => void;
}

export const handleBindChangesToActions = (
    pendingChanges: Map<string, ChangeType>, 
    timeline: Array<AgentTimelineItem>, 
    deps: HandleBindChangesDependencies
) => {
    log("Function started", { 
        pendingChangesSize: pendingChanges.size, 
        timelineLength: timeline.length 
    });

    const associates: Map<string, Array<AgentTimelineItem>> = new Map();
    let timelineUpdated = false;
    let pendingChangesUpdated = false;

    // 1. first we get all the actions that are not yet associated with a 
    // change.
    const actions = timeline
        .filter((ti) => ti.type == "parsedSection" && ti.sectionName == "action_json" && ti.actionId == null);

    log("Found unassociated actions", { 
        unassociatedActionsCount: actions.length 
    });

    // 2. Enhanced association strategy: First try action_code matching, then fall back to tool-based matching
    // This follows the same pattern as useKeeperStream for better reliability
    actions.forEach((a: any, index: number) => {
        log(`Processing action ${index + 1}/${actions.length}`, { 
            order: a.order, 
            parseStartTimestamp: a.parseStartTimestamp 
        });

        // parsedContent is already a clean object, so we can access properties directly
        if(!a.parsedContent) {
            log(`No parsed content found for action ${index + 1}`);
            return null; // return from this iteration, we found nothing
        }
        
        const toolName = a.parsedContent.tool_name;
        const actionCode = a.parsedContent.action_code || a.actionId; // Use action_code from parsedContent or actionId from timeline
        
        console.log('[handleBindChangesToActions] Action details:', {
            toolName,
            actionCodeFromParsedContent: a.parsedContent.action_code,
            actionIdFromTimeline: a.actionId,
            finalActionCode: actionCode
        });

        log(`Action details for ${index + 1}`, { 
            toolName: toolName,
            actionCode: actionCode
        });

        // check if we have a complete tool name
        if(!toolName) {
            log(`No complete tool name found for action ${index + 1}`);
            return null; // return from this iteration, we found nothing
        }

        // we found a tool
        // we see if it matches any of the tools that we have
        if(ALLOWED_TOOLS.includes(toolName)) {
            log(`Tool ${toolName} is allowed, adding to associates`);
            
        // Enhanced association key: use action_code if available, otherwise fall back to toolName
        const associationKey = actionCode ? actionCode : toolName;
            
            // Store both the action and its association metadata
            const actionWithMeta = {
                ...a,
                associationKey,
                actionCode
            };
            
            associates.set(associationKey, [...(associates.get(associationKey) || []), actionWithMeta]);
            
            log(`Added action to associates with key: ${associationKey}`);
        } else {
            log(`Tool ${toolName} is not in allowed tools list`);
        }
    });

    log("Associates map created", { 
        associatesSize: associates.size,
        associatesKeys: Array.from(associates.keys())
    });

    // 3. cooking the pending actions
    // we first, filter out the associated ones
    // then sort the remaining by timestamp, older first
    // then group them by toolUsed, so we have an easier time
    // associating a section with an action in the next step
    
    log("Raw pending changes before filtering", 
        Array.from(pendingChanges.entries()).map(([id, change]) => ({
            id,
            toolUsed: change.toolUsed,
            isAssociated: change.isAssociated,
            timestamp: change.timestamp
        }))
    );
    
    const filteredChanges = Array.from(pendingChanges.entries())
        .filter((a) => a[1].isAssociated != true); // not true cuz it can be any value, null, false, whatever
    
    log("Pending changes after filtering out associated ones", 
        filteredChanges.map(([id, change]) => ({
            id,
            toolUsed: change.toolUsed,
            isAssociated: change.isAssociated,
            timestamp: change.timestamp
        }))
    );
    
    const sortedGroupedPendingChanges: Map<string, Map<string, ChangeType>> = filteredChanges
        .sort((a, b) => (a[1]?.timestamp || 0) - (b[1]?.timestamp || 0))
        .reduce((acc, [actionId, change]: [string, ChangeType]) => {
            if (!acc.has(change.toolUsed)) {
                acc.set(change.toolUsed, new Map());
            }
            acc.get(change.toolUsed)!.set(actionId, change);
            return acc;
        }, new Map<string, Map<string, ChangeType>>());

    log("Sorted and grouped pending changes", { 
        totalGroups: sortedGroupedPendingChanges.size,
        groupsByTool: Object.fromEntries(
            Array.from(sortedGroupedPendingChanges.entries()).map(([tool, changes]) => [
                tool, 
                changes.size
            ])
        )
    });

    // 4. map over associates and see 
    // if they have eligable actions to bind to 
    // or not.
    const updatedPendingChanges = new Map(pendingChanges);
    const updatedTimeline = [...timeline];
    
    associates.forEach((actions, associationKey) => {
        log(`Processing associates for key: ${associationKey}`, { 
            actionsCount: actions.length 
        });

        // If associationKey is an action_code (not a tool name), we need to find the tool name from the action
        // If associationKey is a tool name, use it directly
        const firstAction = actions[0];
        const actionCodeFromAction = (firstAction as any)?.actionCode;
        const isActionCode = actionCodeFromAction && associationKey === actionCodeFromAction;
        const baseToolName = isActionCode ? (firstAction as any)?.parsedContent?.tool_name : associationKey;
        const targetActionCode = isActionCode ? associationKey : null;

        // we sort the actions by their parseStartTimestamp
        actions.sort((a, b) => a.parseStartTimestamp - b.parseStartTimestamp);

        log(`Actions sorted by timestamp for ${associationKey}`, { 
            timestamps: actions.map(a => a.parseStartTimestamp),
            baseToolName,
            targetActionCode,
            isActionCode
        });

        // Enhanced matching: First try to match by action_code, then fall back to tool name
        let group = null;
        
        if (targetActionCode) {
            // For action_code-based associations, look directly in pendingChanges by key
            const directChange = pendingChanges.get(targetActionCode);
            if (directChange) {
                group = new Map([[targetActionCode, directChange]]);
                log(`Found direct change with action_code key: ${targetActionCode}`);
            } else {
                console.log('[handleBindChangesToActions] No direct change found with action_code key:', {
                    targetActionCode,
                    availableKeys: Array.from(pendingChanges.keys())
                });
            }
        }
        
        // Fallback to tool-based matching if no action_code match found
        if (!group || group.size === 0) {
            group = sortedGroupedPendingChanges.get(baseToolName);
            log(`Falling back to tool-based matching for: ${baseToolName}`);
        }
        log(`Looking up group for association key: "${associationKey}"`, {
            groupExists: !!group,
            groupSize: group?.size || 0,
            availableToolNames: Array.from(sortedGroupedPendingChanges.keys()),
            baseToolName,
            targetActionCode
        });
        
        if(group && group.size > 0) {
            log(`Found ${group.size} pending changes for association key ${associationKey}`);
            
            // Process all actions for this association key until we exhaust all available changes
            for (const action of actions) {
                if (group.size === 0) {
                    log(`No more pending changes available for association key ${associationKey}`);
                    break; // No more changes available for this association key
                }
                
                // Find the oldest change for this association key
                const [actionId, changeObj] = Array.from(group.entries())[0];

                log(`Binding action order ${action.order} to change ${actionId} for association key ${associationKey}`);

                // update the timeline item to make it have that
                // actionId - create a new object instead of mutating
                if (action.type === 'parsedSection') {
                    const actionIndex = updatedTimeline.findIndex(item => 
                        item.type === 'parsedSection' && 
                        item.sectionName === action.sectionName && 
                        item.parseStartTimestamp === action.parseStartTimestamp &&
                        item.order === action.order
                    );
                    
                    if (actionIndex !== -1) {
                        updatedTimeline[actionIndex] = {
                            ...action,
                            actionId: actionId
                        };
                        timelineUpdated = true;
                        log(`Updated timeline item at index ${actionIndex} with actionId ${actionId}`);
                    } else {
                        logWarn(`Could not find timeline item to update for action order ${action.order}`);
                    }
                }

                // update the pendingChange item to mark it associated
                const updatedChange = { ...changeObj, isAssociated: true };
                updatedPendingChanges.set(actionId, updatedChange);
                pendingChangesUpdated = true;
                
                log(`Marked change ${actionId} as associated`);
                
                // remove the associated change from the group
                group.delete(actionId);
            }
        } else {
            log(`No pending changes found for association key ${associationKey}`);
        }
    });

    log("Processing complete", { 
        timelineUpdated, 
        pendingChangesUpdated,
        finalTimelineLength: updatedTimeline.length,
        finalPendingChangesSize: updatedPendingChanges.size
    });

    // Update the timeline if changes were made
    if (timelineUpdated) {
        log("Updating timeline state");
        deps.setTimeline(updatedTimeline);
    }

    // Update the pendingChanges if changes were made
    if (pendingChangesUpdated) {
        log("Updating pending changes state");
        deps.setPendingChanges(() => updatedPendingChanges);
    }

    log("Function completed successfully");
};