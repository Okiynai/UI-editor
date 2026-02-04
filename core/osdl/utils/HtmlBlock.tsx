'use client';

import React, { useRef, useEffect } from 'react';

interface HtmlBlockProps {
  code: string;
  executionContext?: 'iframe_sandboxed'; // Currently the only supported and recommended context
  sandboxAttributes?: string[];
}

export function HtmlBlock({ code, executionContext = 'iframe_sandboxed', sandboxAttributes = [] }: HtmlBlockProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // We only proceed if the context is an iframe and the ref is attached.
    if (executionContext === 'iframe_sandboxed' && iframeRef.current) {
      const iframe = iframeRef.current;
      // Accessing the iframe's document to write content into it.
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        // This process completely replaces the iframe's content with the provided HTML code.
        // This is what allows for full HTML document embeds, including <head>, <style>, and <script> tags
        // that are completely isolated from the main page.
        iframeDoc.open();
        iframeDoc.write(code);
        iframeDoc.close();
      }
    }
  }, [code, executionContext]);

  // For now, we only render the iframe context. Other contexts like 'direct_injection'
  // using dangerouslySetInnerHTML are less secure and not implemented.
  if (executionContext === 'iframe_sandboxed') {
    return (
      <iframe
        ref={iframeRef}
        title="Custom HTML Embed"
        // The sandbox attribute is a critical security feature. By default, it's very restrictive.
        // The OSDL `sandboxAttributes` allows a user to selectively enable features if they trust the source.
        // Common values: "allow-scripts", "allow-same-origin", "allow-forms", "allow-popups".
        sandbox={sandboxAttributes.join(' ')}
        // The container div of this CodeBlockNode, styled by the OSDL layout/positioning params,
        // will control the size and position of this iframe.
        style={{ border: 0, width: '100%', height: '100%' }}
      />
    );
  }

  // If the executionContext is not 'iframe_sandboxed', we render nothing.
  return null;
} 