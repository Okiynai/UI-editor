'use client';

import React from 'react';
import { useAtom } from 'jotai';
import {
  selectedNodesAtom,
  hoveredNodeIdAtom,
  interactionModeAtom,
  currentPageIdAtom,
  textEditStateAtom,
  isAgentBusyAtom,
  conversationIdAtom,
  changesAtom,
} from '@/store/editor';

export const EditorDebugPanel: React.FC = () => {
  const [selectedNodes] = useAtom(selectedNodesAtom);
  const [hoveredNodeId] = useAtom(hoveredNodeIdAtom);
  const [interactionMode] = useAtom(interactionModeAtom);
  const [currentPageId] = useAtom(currentPageIdAtom);
  const [textEditState] = useAtom(textEditStateAtom);
  const [isAgentBusy] = useAtom(isAgentBusyAtom);
  const [agentConversationId] = useAtom(conversationIdAtom);
  const [changes] = useAtom(changesAtom);

  const state = {
    "Current Page ID": currentPageId,
    "Interaction Mode": interactionMode,
    "Hovered Node ID": hoveredNodeId || 'none',
    "Is Agent Busy": isAgentBusy.toString(),
    "Agent Session ID": agentConversationId || 'none',
    "Text Edit State": textEditState ? JSON.stringify(textEditState, null, 2) : 'inactive',
    "Selected Nodes": selectedNodes.length > 0 ? selectedNodes.map(n => `[${n.pageId}] ${n.nodeName} (${n.nodeId})`).join(', ') : 'none',
    "Pending Changes": changes.length,
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-2xl w-96 z-[1000] text-xs">
      <h3 className="text-sm font-bold border-b border-gray-600 pb-2 mb-3">Editor State</h3>
      <div className="space-y-2">
        {Object.entries(state).map(([key, value]) => (
          <div key={key}>
            <span className="text-gray-400">{key}: </span>
            <span className="text-green-400 break-words">{value.toString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}; 
