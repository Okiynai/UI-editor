'use client'; 

import React from 'react';
import { PageDefinition } from '@/OSDL.types';
import NodeRenderer from './NodeRenderer';

interface OkiynaiPageRendererProps {
  pageDefinition: PageDefinition;
  showDevInfo?: boolean;
}

const OkiynaiPageRenderer: React.FC<OkiynaiPageRendererProps> = ({ pageDefinition, showDevInfo }) => {
  if (!pageDefinition || !pageDefinition.nodes) {
    // Or some other error/empty state representation
    return <div>Error: Page definition or nodes not provided.</div>;
  }

  // Handle case where nodes might be nested array [[nodes...]] instead of [nodes...]
  let nodes = pageDefinition.nodes;
  if (Array.isArray(nodes) && nodes.length === 1 && Array.isArray(nodes[0])) {
    console.warn('[OkiynaiPageRenderer] Detected nested nodes array, flattening...');
    nodes = nodes[0];
  }

  // Validate that nodes is a proper array of node objects
  if (!Array.isArray(nodes)) {
    console.error('[OkiynaiPageRenderer] Nodes is not an array:', nodes);
    return <div>Error: Invalid nodes structure.</div>;
  }

  if (showDevInfo) {
    console.log('[OkiynaiPageRenderer] Processing nodes:', nodes.length, 'nodes');
    console.log('[OkiynaiPageRenderer] Node IDs:', nodes.map(n => n?.id || 'NO_ID'));
  }

  // Validate each node has required properties
  const validNodes = nodes.filter(node => {
    if (!node || typeof node !== 'object') {
      console.error('[OkiynaiPageRenderer] Invalid node (not object):', node);
      return false;
    }
    if (!node.id) {
      console.error('[OkiynaiPageRenderer] Node missing ID:', node);
      return false;
    }
    if (!node.type) {
      console.error('[OkiynaiPageRenderer] Node missing type:', node);
      return false;
    }
    if (node.order == null || node.order === undefined) {
      console.error('[OkiynaiPageRenderer] Node missing order:', node);
      return false;
    }
    return true;
  });

  if (validNodes.length !== nodes.length) {
    console.warn(`[OkiynaiPageRenderer] Filtered out ${nodes.length - validNodes.length} invalid nodes`);
  }

  // Assuming pageDefinition.nodes contains the root nodes to be rendered.
  // Sections will handle their own children recursively via NodeRenderer.
  const sortedRootNodes = [...validNodes].sort((a, b) => (a.order) - (b.order));

  return (
    <div className="okiynai-page-renderer" style={{width: '100%'}}>
      {showDevInfo && <h2>Page: {pageDefinition.name} (ID: {pageDefinition.id})</h2>}
      {sortedRootNodes.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          No valid nodes to render. Check console for errors.
        </div>
      ) : (
        sortedRootNodes.map(node => (
          <NodeRenderer 
            key={node.id} 
            nodeSchema={node} 
            showDevInfo={showDevInfo} 
            allNodesOnPage={validNodes} // Pass the validated nodes array
          />
        ))
      )}
    </div>
  );
};

export default OkiynaiPageRenderer;
