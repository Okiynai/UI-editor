'use client';

import React, { useEffect } from 'react';

interface JavaScriptBlockProps {
  code?: string; // Code can be optional
  nodeId: string;
  scopeId?: string;
  executionContext?: 'direct_script';
  props?: Record<string, any>;
}

export function JavaScriptBlock({ code, nodeId, scopeId, executionContext = 'direct_script', props = {} }: JavaScriptBlockProps) {
  useEffect(() => {
    // We only execute if the context is 'direct_script' and there is code to run.
    if (executionContext === 'direct_script' && code) {
      // The `new Function` constructor provides a way to execute code in a scope
      // separate from the current one, which is safer than `eval()`.
      // We wrap the user's code in an IIFE (Immediately Invoked Function Expression)
      // to prevent polluting the global scope and to pass in our `props`, `nodeId`, and `scopeId`.
      try {
        const scriptBody = `
          (function(props, nodeId, scopeId, document, window) {
            try {
              ${code}
            } catch (e) {
              console.error('Error executing custom script for node "${nodeId}":', e);
            }
          })(...arguments);
        `;
        
        // Create the function with specified arguments.
        const scriptFunction = new Function('props', 'nodeId', 'scopeId', 'document', 'window', scriptBody);
        
        // Execute the function, passing the resolved OSDL props, node ID, and the parent scope ID.
        // We explicitly pass `document` and `window` to make it clear they are available.
        scriptFunction(props, nodeId, scopeId, document, window);

      } catch (e) {
        // This catch block will handle syntax errors in the provided `code`.
        console.error(`Syntax error in custom script for node "${nodeId}":`, e);
      }
    }
  }, [code, nodeId, scopeId, executionContext, JSON.stringify(props)]); // Use JSON.stringify for props dependency

  // This component does not render any visible DOM content itself.
  return null;
} 