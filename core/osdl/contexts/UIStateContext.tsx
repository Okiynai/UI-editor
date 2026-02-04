'use client';

import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { Node, ParsedDiff } from '@/OSDL.types';
import merge from 'lodash.merge';
import set from 'lodash/set';

type NodeOverrides = Partial<Omit<Node, 'id' | 'type' | 'children'>>;
type AllNodeOverrides = Record<string, NodeOverrides>;
type NodeInternalState = Record<string, any>;
type AllNodeInternalStates = Record<string, NodeInternalState>;

interface UIStateContextType {
    nodeOverrides: AllNodeOverrides;
    setNodeOverrides: (nodeId: string, overrides: NodeOverrides) => void;
    applyDiff: (diff: ParsedDiff) => void;
    clearNodeOverrides: (nodeId: string) => void;
    clearAllNodeOverrides: () => void;

    // --- Internal Client-Side State Management ---
    /**
     * Stores the dynamic, client-side state for all nodes.
     * Key is nodeId, value is the state object (e.g., { "activeTab": "details" }).
     */
    nodeInternalStates: AllNodeInternalStates;
    /**
     * Updates the internal state of a specific node.
     * @param nodeId The ID of the node to update.
     * @param updates An object containing the new state key-value pairs to merge.
     */
    updateNodeInternalState: (nodeId: string, updates: NodeInternalState) => void;
    /**
     * Sets the initial state for a node, only if it doesn't already exist.
     * This is used by the renderer to populate the state from the OSDL schema.
     * @param nodeId The ID of the node.
     * @param initialState The initial state object from the schema.
     */
    initializeNodeState: (nodeId: string, initialState: NodeInternalState) => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export const UIStateProvider = ({ children }: { children: ReactNode }) => {
    const [nodeOverrides, setNodeOverrides] = useState<AllNodeOverrides>({});

    // --- State for Internal Data ---
    const [nodeInternalStates, setNodeInternalStates] = useState<AllNodeInternalStates>({});

    const handleSetNodeOverrides = useCallback((nodeId: string, overrides: NodeOverrides) => {
        setNodeOverrides(prev => {
            const newOverrides = merge({}, prev[nodeId] || {}, overrides);
            return {
                ...prev,
                [nodeId]: newOverrides
            };
        });
    }, []);

    const handleApplyDiff = useCallback((diff: ParsedDiff) => {
        setNodeOverrides(prev => {
            const newOverridesForNode = { ...prev[diff.targetNodeId] };
            
            // Use lodash.set to safely update the nested property
            set(newOverridesForNode, diff.propertyPath, diff.replace);

            return {
                ...prev,
                [diff.targetNodeId]: newOverridesForNode
            };
        });
        console.log(`[UIStateContext] Applied diff for node ${diff.targetNodeId}, path ${diff.propertyPath}`);
    }, []);

    const handleClearNodeOverrides = useCallback((nodeId: string) => {
        setNodeOverrides(prev => {
            const newOverrides = { ...prev };
            delete newOverrides[nodeId];
            return newOverrides;
        });
    }, []);
    
    const handleClearAllNodeOverrides = useCallback(() => {
        setNodeOverrides({});
    }, []);

    const handleInitializeNodeState = (nodeId: string, initialState: NodeInternalState) => {
        setNodeInternalStates(prev => {
            // Only set initial state if no state for this node exists yet
            if (!prev[nodeId]) {
                return {
                    ...prev,
                    [nodeId]: initialState,
                };
            }
            return prev;
        });
    };

    // This function is NOT wrapped in `useCallback`.
    // This ensures that any component calling it always gets the latest version of the function,
    // which has access to the most recent `setNodeInternalStates` setter. This prevents stale state bugs.
    const handleUpdateNodeInternalState = (nodeId: string, updates: NodeInternalState) => {
        setNodeInternalStates(prev => {
            const currentState = prev[nodeId] || {};
            const newState = { ...currentState, ...updates };
            return {
                ...prev,
                [nodeId]: newState
            };
        });
    };
    

    const value = {
        nodeOverrides,
        setNodeOverrides: handleSetNodeOverrides,
        applyDiff: handleApplyDiff,
        clearNodeOverrides: handleClearNodeOverrides,
        clearAllNodeOverrides: handleClearAllNodeOverrides,

        nodeInternalStates,
        updateNodeInternalState: handleUpdateNodeInternalState,
        initializeNodeState: handleInitializeNodeState,
    };

    return (
        <UIStateContext.Provider value={value}>
            {children}
        </UIStateContext.Provider>
    );
};

export const useUIState = (): UIStateContextType => {
    const context = useContext(UIStateContext);
    if (!context) {
        throw new Error('useUIState must be used within a UIStateProvider');
    }
    return context;
}; 
