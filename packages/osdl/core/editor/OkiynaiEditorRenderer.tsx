'use client'; 

import React from 'react';
import { PageDefinition, Node } from '@/OSDL.types';
import { EditorNodeWrapper } from './EditorNodeWrapper';

interface OkiynaiEditorRendererProps {
  pageDefinition: PageDefinition;
  setPageDefinition: React.Dispatch<React.SetStateAction<PageDefinition | null>>;
  showDevInfo?: boolean;
  isInspectMode?: boolean;
  editingSections?: Set<string>;
  onDuplicateNode?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onMoveNode?: (nodeId: string, direction: 'up' | 'down') => void;
}

const OkiynaiEditorRenderer: React.FC<OkiynaiEditorRendererProps> = ({ pageDefinition, setPageDefinition, showDevInfo, isInspectMode = false, 
  editingSections, onDuplicateNode, onDeleteNode, onMoveNode }) => {
  if (!pageDefinition || !pageDefinition.nodes) {
    return <div>Error: Page definition or nodes not provided.</div>;
  }

  let nodes: Node[] = pageDefinition.nodes;
  if (Array.isArray(nodes) && nodes.length === 1 && Array.isArray(nodes[0])) {
    console.warn('[OkiynaiEditorRenderer] Detected nested nodes array, flattening...');
    nodes = nodes[0];
  }

  if (!Array.isArray(nodes)) {
    console.error('[OkiynaiEditorRenderer] Nodes is not an array:', nodes);
    return <div>Error: Invalid nodes structure.</div>;
  }

  const validNodes = nodes.filter(node => {
    if (!node || typeof node !== 'object' || !node.id || !node.type) {
      console.error('[OkiynaiEditorRenderer] Invalid node detected and filtered out:', node);
      return false;
    }
    return true;
  });

  const sortedRootNodes = [...validNodes].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="okiynai-editor-renderer" style={{width: '100%'}}>
    {showDevInfo && <h2>Editing Page: {pageDefinition.name}</h2>}
    {sortedRootNodes.map(node => (
        <EditorNodeWrapper 
            key={node.id} 
            nodeSchema={node} 
            showDevInfo={showDevInfo} 
            setPageDefinition={setPageDefinition}
            allNodesOnPage={validNodes}
            ChildRenderer={EditorNodeWrapper}
            isInspectMode={isInspectMode}
            editingSections={editingSections}
            onDuplicateNode={onDuplicateNode}
            onDeleteNode={onDeleteNode}
            onMoveNode={onMoveNode}
            pageDefinition={pageDefinition}
        />
    ))}
    </div>
  );
};

export default OkiynaiEditorRenderer; 