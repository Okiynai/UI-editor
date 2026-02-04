'use client';

import React from 'react';
import { CodeBlockNode } from '@/OSDL.types';
import { DynamicComponentLoader } from './DynamicComponentLoader';
import { HtmlBlock } from './HtmlBlock';
import { CssBlock } from './CssBlock';
import { JavaScriptBlock } from './JavaScriptBlock';
import SkeletonPlaceholder from '../placeholders/SkeletonPlaceholder';

interface CodeBlockRendererProps {
  schema: CodeBlockNode;
  // The params passed here should already have their {{...}} templates resolved by NodeRenderer
  resolvedParams: CodeBlockNode['params'];
  style?: React.CSSProperties;
  className?: string;
  scopeId?: string;
}

export function CodeBlockRenderer({ schema, resolvedParams, style, className, scopeId }: CodeBlockRendererProps) {
  const { language, executionContext, code, compiledComponentUrl, sandboxAttributes, props } = resolvedParams;
  
  // Debug information to help diagnose scoping issues
  const debugInfo = process.env.NODE_ENV !== 'production' && (
    <div style={{ 
      padding: '4px 8px', 
      backgroundColor: '#f0f0f0', 
      borderRadius: '4px',
      fontSize: '10px',
      fontFamily: 'monospace',
      marginBottom: '4px'
    }}>
      CodeBlock {schema.id} | scopeId: {scopeId || 'undefined'}
    </div>
  );

  // The outer div that respects the OSDL layout and styling for all codeblock types.
  // The actual block renderer inside might render null (for CSS/JS) or an iframe (for HTML).
  return (
    <div 
      style={style} 
      className={className} 
      data-oskiynai-scope={schema.id} 
      data-node-id={schema.id}
    >
      {(() => {
        switch (language) {
          case 'react_component_jsx':
            if (!compiledComponentUrl) {
              return <div role="alert" style={{color: 'orange'}}>Warning: Component is not compiled. Please save in the editor to compile.</div>;
            }
            return (
              <DynamicComponentLoader
                url={compiledComponentUrl}
                resolvedProps={props || {}}
                nodeId={schema.id}
                jsxCode={code}
                fallback={<SkeletonPlaceholder style={style} className={className} />}
              />
            );

          case 'html':
            return (
              <HtmlBlock 
                code={code || ''} 
                executionContext={executionContext as 'iframe_sandboxed' | undefined} 
                sandboxAttributes={sandboxAttributes} 
              />
            );

          case 'css':
            return (
              <CssBlock 
                code={code || ''} 
                nodeId={schema.id} 
                scopeId={scopeId}
                executionContext={executionContext as 'scoped_style_tag' | 'global_style_tag' | undefined} 
              />
            );

          case 'javascript':
            return (
              <JavaScriptBlock 
                code={code} 
                nodeId={schema.id} 
                scopeId={scopeId}
                executionContext={executionContext as 'direct_script' | undefined} 
                props={props} 
              />
            );
            
          default:
            return <div role="alert">Unsupported code block language: {language}</div>;
        }
      })()}
    </div>
  );
} 