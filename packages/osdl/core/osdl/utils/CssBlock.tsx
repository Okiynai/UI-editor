'use client';

import React, { useEffect } from 'react';

interface CssBlockProps {
  code: string;
  nodeId: string;
  scopeId?: string;
  executionContext?: 'scoped_style_tag' | 'global_style_tag';
}

export function CssBlock({ code, nodeId, scopeId, executionContext = 'scoped_style_tag' }: CssBlockProps) {
  useEffect(() => {
    // Process the CSS for scoping if needed
    let processedCss = code;
    
    if (executionContext === 'scoped_style_tag' && scopeId) {
      // Use the parent's scope ID if available, otherwise fall back to the node's own ID
      const scopedSelector = `[data-oskiynai-scope="${scopeId}"]`;
      
      // Replace all selectors with scoped versions
      processedCss = code.replace(/(^|}|,)\s*([^{]+)/g, (match, prefix, selector) => {
        // Don't scope @-rules like @keyframes, @font-face, @import, etc.
        if (selector.trim().startsWith('@')) {
          return match;
        }
        
        // For multiple selectors like "h1, .class", scope each one
        const scoped = selector.split(',').map((s: string) => {
          const trimmed = s.trim();
          // Avoid scoping the pseudo-elements on the scoped attribute itself like :hover
          if (trimmed.startsWith(':')) {
            return `${scopedSelector}${trimmed}`;
          }
          return `${scopedSelector} ${trimmed}`;
        }).join(', ');

        return `${prefix} ${scoped}`;
      });
    }
    
    // Create a unique ID for this style element
    const styleId = `css-block-${nodeId}-${Date.now()}`;
    
    // Create the style element
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = processedCss;
    
    // Add the style element to the document head
    document.head.appendChild(styleElement);
    
    // Debug output to console
    console.log(`[CssBlock] Injected style with ID: ${styleId}`);
    console.log(`[CssBlock] nodeId: ${nodeId}, scopeId: ${scopeId || 'none'}`);
    console.log(`[CssBlock] CSS processed: ${processedCss.slice(0, 100)}...`);
    
    // Return a cleanup function to remove the style when the component unmounts
    return () => {
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
        console.log(`[CssBlock] Removed style with ID: ${styleId}`);
      }
    };
  }, [code, nodeId, scopeId, executionContext]);
  
  // Add a debug element to the DOM to visually verify the component is mounted
  return process.env.NODE_ENV !== 'production' ? (
    <div style={{ display: 'none' }} data-css-block-debug={nodeId}>
      CSS Block loaded: {nodeId} (parent: {scopeId || 'none'})
    </div>
  ) : null;
} 