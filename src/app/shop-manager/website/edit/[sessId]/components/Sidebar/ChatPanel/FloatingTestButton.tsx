import React from 'react';
import { Plus, Pause, Play, CheckCircle } from 'lucide-react';
import type { AgentTimelineItem } from '@/OSDL/editor/hooks/useBuilderStream';

// NOTE: Thinking tests commented out for this round of testing
const testSections = [
    {
        type: 'parsedSection',
        sectionName: 'reasoning',
        parsedContent: {
            rawContent: 'I need to analyze the current page structure to understand what changes would be most beneficial.',
            startTimestamp: Date.now() - 5000,
            endTimestamp: Date.now() - 3000
        },
        parseStartTimestamp: Date.now() - 5000,
        order: 0
    },
    {
        type: 'parsedSection',
        sectionName: 'reasoning',
        parsedContent: {
            rawContent: 'Looking at the layout, I can see several areas that could be improved for better user experience.',
            startTimestamp: Date.now() - 3000,
            endTimestamp: Date.now() - 1000
        },
        parseStartTimestamp: Date.now() - 3000,
        order: 1
    },
    {
        type: 'parsedSection',
        sectionName: 'reasoning',
        parsedContent: {
            rawContent: 'I should focus on the hero section first as it\'s the most visible part of the page.',
            startTimestamp: Date.now() - 1000,
            endTimestamp: Date.now()
        },
        parseStartTimestamp: Date.now() - 1000,
        order: 2
    }
];

interface FloatingTestButtonProps {
    onAddToTimeline: (item: AgentTimelineItem) => void;
    timeline: AgentTimelineItem[];
    setTimeline: (timeline: AgentTimelineItem[] | ((prev: AgentTimelineItem[]) => AgentTimelineItem[])) => void;
    pendingChanges: Map<string, any>;
    setPendingChanges: React.Dispatch<React.SetStateAction<Map<string, any>>>;
}

export const FloatingTestButton: React.FC<FloatingTestButtonProps> = ({ onAddToTimeline: _onAddToTimeline, timeline, setTimeline, pendingChanges, setPendingChanges }) => {
    const stepRef = React.useRef<number>(0);
    const chunkIndexRef = React.useRef<number>(0);
    const TEST_PARENT_ID = 'agent_node_9426912868.356106';
    const TEST_NODE_ID = 'agent_node_3385583226.84121';

    // Chunk the rawSections string into multiple parts
    const rawSectionsChunks = [
        `{
  "response": "I will change the background color of the section to a dark background.`,
        `",  "action_json": "{\\"tool_name\\": \\"modify_osdl_node\\", \\"params\\": {\\"node_id\\": \\"agent_node_9194982024.136293\\", \\"property_path\\": \\"params.backgroundColor\\", \\"search_value\\": \\"#f8f6f0\\", \\"replace_value\\": \\"var(--backgroundDark)\\"}}"
}`,
        `  "reasoning": "This change will provide better contrast and align with the overall design theme."`,
        `  "next_steps": "After this change, I'll review the visual impact and make any additional adjustments if needed."`
    ];


    const handleClick = () => {
        const step = stepRef.current;
        const now = Date.now();

        // Step 0: Add all three action sections to the timeline (create, modify, delete)
        if (step === 0) {
            setTimeline(prev => {
                const baseOrder = prev.length;
                const newItems: AgentTimelineItem[] = [
                    {
                        type: 'parsedSection',
                        sectionName: 'response',
                        parsedContent: 'Testing association: create action section injected.',
                        parseStartTimestamp: now,
                        order: baseOrder
                    },
                    {
                        type: 'parsedSection',
                        sectionName: 'action_json',
                        parsedContent: `{
  "tool_name": "create_osdl_node",
  "params": {
    "parent_id": "${TEST_PARENT_ID}",
    "node_payload": {
      "id": "${TEST_NODE_ID}",
      "type": "section",
      "name": "Text Block Section"
    }
  }
}`,
                        parseStartTimestamp: now,
                        order: baseOrder + 1
                    },
                    {
                        type: 'parsedSection',
                        sectionName: 'action_json',
                        parsedContent: `{
  "tool_name": "modify_osdl_node",
  "params": {
    "node_id": "${TEST_NODE_ID}",
    "property_path": "inlineStyles",
    "search_value": "\\"backgroundColor\\": \\"var(--backgroundLight)\\"",
    "replace_value": "\\"backgroundColor\\": \\"black\\""
  }
}`,
                        parseStartTimestamp: now + 1,
                        order: baseOrder + 2
                    },
                    {
                        type: 'parsedSection',
                        sectionName: 'action_json',
                        parsedContent: `{
  "tool_name": "delete_osdl_node",
  "params": {
    "node_id": "${TEST_NODE_ID}"
  }
}`,
                        parseStartTimestamp: now + 2,
                        order: baseOrder + 3
                    },
                    {
                        type: 'streamEnd',
                        parseStartTimestamp: now + 3,
                        order: baseOrder + 4
                    }
                ];
                return [...prev, ...newItems];
            });
            stepRef.current = 1;
            return;
        }

        // Step 1: Inject a pending change entry for create_osdl_node
        if (step === 1) {
            const actionId = `test_create_${now}`;
            pendingChanges.set(actionId, {
                id: actionId,
                toolUsed: 'create_osdl_node',
                success: true,
                error: null,
                change: { id: TEST_NODE_ID },
                timestamp: now,
                isAssociated: false,
            });
            // Nudge timeline to trigger association effect
            setTimeline(prev => [...prev]);
            stepRef.current = 2;
            return;
        }

        // Step 2: Inject a pending change entry for modify_osdl_node
        if (step === 2) {
            const actionId = `test_modify_${now}`;
            pendingChanges.set(actionId, {
                id: actionId,
                toolUsed: 'modify_osdl_node',
                success: true,
                error: null,
                change: { id: TEST_NODE_ID },
                timestamp: now,
                isAssociated: false,
            });
            setTimeline(prev => [...prev]);
            stepRef.current = 3;
            return;
        }

        // Step 3: Inject a pending change entry for delete_osdl_node
        if (step === 3) {
            const actionId = `test_delete_${now}`;
            pendingChanges.set(actionId, {
                id: actionId,
                toolUsed: 'delete_osdl_node',
                success: true,
                error: null,
                change: { id: TEST_NODE_ID },
                timestamp: now,
                isAssociated: false,
            });
            setTimeline(prev => [...prev]);
            // Stay at step 3 for further clicks or loop back if desired
            return;
        }
    };

    const injectActionTest = () => {
        setTimeline(prev => {
            const baseOrder = prev.length;
            const now = Date.now();

            const newItems: AgentTimelineItem[] = [
                {
                    type: 'parsedSection',
                    sectionName: 'response',
                    parsedContent: 'Testing action cards below. This is an intro message.',
                    parseStartTimestamp: now,
                    order: baseOrder
                },
                {
                    type: 'parsedSection',
                    sectionName: 'reasoning',
                    parsedContent: {
                        rawContent: 'Preparing a set of create, modify, and delete actions for UI tweaks.',
                        startTimestamp: now - 1000,
                        endTimestamp: now
                    },
                    parseStartTimestamp: now,
                    order: baseOrder + 1
                },
                {
                    type: 'parsedSection',
                    sectionName: 'action_json',
                    parsedContent: `{
  "tool_name": "create_osdl_node",
  "params": {
    "parent_id": "agent_node_9426912868.356106",
    "node_payload": {
      "id": "agent_node_9030806035.82208",
      "type": "section",
      "name": "Text Block Section"
    }
  }
}`,
                    parseStartTimestamp: now,
                    order: baseOrder + 2
                },
                {
                    type: 'parsedSection',
                    sectionName: 'action_json',
                    parsedContent: `{
  "tool_name": "modify_osdl_node",
  "params": {
    "node_id": "agent_node_9030806035.82208",
    "property_path": "inlineStyles",
    "search_value": "\\"backgroundColor\\": \\"var(--backgroundLight)\\"",
    "replace_value": "\\"backgroundColor\\": \\"black\\""
  }
}`,
                    parseStartTimestamp: now,
                    order: baseOrder + 3
                },
                {
                    type: 'parsedSection',
                    sectionName: 'action_json',
                    parsedContent: `{
  "tool_name": "delete_osdl_node",
      "params": {
        "node_id": "agent_node_9030806035.82208"
      }
    }`,
                    parseStartTimestamp: now,
                    order: baseOrder + 4
                },
                {
                    type: 'streamEnd',
                    parseStartTimestamp: now,
                    order: baseOrder + 5
                }
            ];

            return [...prev, ...newItems];
        });
    };

    const injectThinkingTest = () => {
        setTimeline(prev => {
            const now = Date.now();
            
            // Find existing reasoning section or create new one
            const existingReasoningIndex = prev.findIndex(item => 
                item.type === 'parsedSection' && item.sectionName === 'reasoning'
            );
            
            if (existingReasoningIndex !== -1) {
                // Update existing reasoning section by appending content
                const existingItem = prev[existingReasoningIndex];
                if (existingItem.type === 'parsedSection' && existingItem.sectionName === 'reasoning') {
                    const existingContent = existingItem.parsedContent.rawContent;
                    const clickCount = (existingContent.match(/thinking step (\d+)/) || [null, '0'])[1];
                    const nextStep = parseInt(clickCount) + 1;
                    
                    const updatedItem = {
                        ...existingItem,
                        parsedContent: {
                            ...existingItem.parsedContent,
                            rawContent: `${existingContent}\n\nThis is thinking step ${nextStep}. I'm continuing to analyze and refine my approach. The thinking process is building upon previous insights.`,
                            endTimestamp: now
                        }
                    };
                    
                    const newTimeline = [...prev];
                    newTimeline[existingReasoningIndex] = updatedItem;
                    return newTimeline;
                }
            }
            
            // Create new reasoning section if none exists
            const newReasoningSection: AgentTimelineItem = {
                type: 'parsedSection',
                sectionName: 'reasoning',
                parsedContent: {
                    rawContent: 'This is thinking step 1. I\'m analyzing the current state and planning the next action.',
                    startTimestamp: now - 2000,
                    endTimestamp: now
                },
                parseStartTimestamp: now,
                order: prev.length
            };
            
            return [...prev, newReasoningSection];
        });
    };

    const injectDuplicateStreamEndTest = () => {
        setTimeline(prev => {
            const now = Date.now();
            const baseOrder = prev.length;
            
            // Create two identical streamEnd objects with the same order and properties
            const duplicateStreamEnds: AgentTimelineItem[] = [
                {
                    type: 'parsedSection',
                    sectionName: 'action_json',
                    parsedContent: `{
                        "tool_name": "create_osdl_node",
                        "params": {
                            "parent_id": "agent_node_9426912868.356106",
                            "node_payload": {
                                "id": "agent_node_9030806035.82208",
                                "type": "section",
                                "name": "Text Block Section"
                            }
                        }
                    }`,
                    parseStartTimestamp: now,
                    order: baseOrder
                },
                {
                    type: 'streamEnd',
                    parseStartTimestamp: now,
                    order: baseOrder
                },
                {
                    type: 'streamEnd',
                    parseStartTimestamp: now,
                    order: baseOrder
                }
            ];
            
            return [...prev, ...duplicateStreamEnds];
        });
    };

    const injectModifyOsdlNodeTest = () => {
        setTimeline(prev => {
            const now = Date.now();
            const baseOrder = prev.length;
            
            const modifyOsdlNodeTest: AgentTimelineItem = {
                type: 'parsedSection',
                sectionName: 'action_json',
                parsedContent: `{"tool_name":"modify_osdl_node","params":{"node_id":"agent_node_7523676058.549928","property_path":"localeOverrides.de-DE.params","search_value":"\\"backgroundColor\\": \\"var(--primary)\\",","replace_value":""}}`,
                parseStartTimestamp: now,
                order: baseOrder
            };
            
            return [...prev, modifyOsdlNodeTest];
        });
    };

    const injectParsedSectionTest = () => {
        // Check if we've processed all chunks
        if (chunkIndexRef.current >= rawSectionsChunks.length) {
            // Reset for another round
            chunkIndexRef.current = 0;
            return;
        }

        // Get the current chunk
        const currentChunk = rawSectionsChunks[chunkIndexRef.current];

        // Simulate the exact message flow from useAgentStream
        // This simulates what happens when useAgentStream sends a TOKEN_CHUNK_PARSED message
        const testMessage = {
            type: 'TOKEN_CHUNK_PARSED',
            payload: {
                rawSections: currentChunk,
                rawTokens: null,
                reasoningTokens: null
            }
        };

        // Simulate the message being sent to the iframe message handler
        // This is what useAgentStream does when it calls sendDiffUpdate
        window.postMessage(testMessage, '*');

        // Move to next chunk
        chunkIndexRef.current++;
    };

    const injectPendingChangesTest = () => {
        const now = Date.now();
        const testActions = [
            {
                toolUsed: 'create_osdl_node',
                nodeId: 'agent_node_test_create_' + now,
                description: 'Create test section'
            },
            {
                toolUsed: 'modify_osdl_node',
                nodeId: 'agent_node_test_modify_' + now,
                description: 'Modify background color'
            },
            {
                toolUsed: 'delete_osdl_node',
                nodeId: 'agent_node_test_delete_' + now,
                description: 'Delete test node'
            }
        ];

        setPendingChanges(prev => {
            const newMap = new Map(prev);
            testActions.forEach((action, index) => {
                const actionId = `pending_test_${action.toolUsed}_${now}_${index}`;
                newMap.set(actionId, {
                    id: actionId,
                    toolUsed: action.toolUsed,
                    success: true,
                    error: null,
                    timestamp: now + index,
                    isAssociated: false,
                });
            });
            return newMap;
        });

        // Also add corresponding timeline items to show the actions
        setTimeline(prev => {
            const baseOrder = prev.length;
            const newItems: AgentTimelineItem[] = [
                {
                    type: 'parsedSection',
                    sectionName: 'response',
                    parsedContent: 'Testing pending changes with multiple action types.',
                    parseStartTimestamp: now,
                    order: baseOrder
                },
                ...testActions.map((action, index) => ({
                    type: 'parsedSection' as const,
                    sectionName: 'action_json' as const,
                    parsedContent: JSON.stringify({
                        tool_name: action.toolUsed,
                        params: {
                            node_id: action.nodeId,
                            ...(action.toolUsed === 'create_osdl_node' && {
                                parent_id: TEST_PARENT_ID,
                                node_payload: {
                                    id: action.nodeId,
                                    type: "section",
                                    name: action.description
                                }
                            }),
                            ...(action.toolUsed === 'modify_osdl_node' && {
                                property_path: "inlineStyles",
                                search_value: '"backgroundColor": "var(--backgroundLight)"',
                                replace_value: '"backgroundColor": "black"'
                            }),
                            ...(action.toolUsed === 'delete_osdl_node' && {
                                node_id: action.nodeId
                            })
                        }
                    }),
                    parseStartTimestamp: now + index + 1,
                    order: baseOrder + index + 1
                })),
                {
                    type: 'streamEnd',
                    parseStartTimestamp: now + testActions.length + 1,
                    order: baseOrder + testActions.length + 1
                }
            ];
            return [...prev, ...newItems];
        });
    };

    return (
        <div className="fixed left-6 bottom-6 flex flex-col gap-3 z-50">
            <button
                onClick={handleClick}
                className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
                title="Inject test response, reasoning, action cards, and stream end"
            >
                <Plus className="w-6 h-6" />
            </button>
            
            <button
                onClick={injectThinkingTest}
                className="w-12 h-12 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
                title="Add thinking step (appends reasoning section on each click)"
            >
                <Play className="w-5 h-5" />
            </button>

            <button
                onClick={injectDuplicateStreamEndTest}
                className="w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
                title="Add duplicate streamEnd objects with same order and properties"
            >
                <Pause className="w-5 h-5" />
            </button>

            <button
                onClick={injectModifyOsdlNodeTest}
                className="w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
                title="Test modify_osdl_node tool with locale override parameters"
            >
                <Plus className="w-4 h-4" />
            </button>

            <button
                onClick={injectParsedSectionTest}
                className="w-12 h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
                title="Inject next chunk of parsedSection (click multiple times to see all chunks)"
            >
                <Plus className="w-4 h-4" />
            </button>

            <button
                onClick={injectPendingChangesTest}
                className="w-12 h-12 bg-yellow-600 hover:bg-yellow-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
                title="Test pending changes - adds create, modify, delete actions to pending changes"
            >
                <CheckCircle className="w-5 h-5" />
            </button>
        </div>
    );
};
