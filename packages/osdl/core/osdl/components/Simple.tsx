import { ComponentComponentProps } from "@/ComponentRegistry";
import NodeRenderer from "@/osdl/NodeRenderer";
import { AtomNode, SectionNode } from "@/OSDL.types";
import React from 'react';

export const SimpleComponent = ({ 
  nodeSchema, 
  isInspectMode, 
  editingSections, 
  onDeleteNode, 
  onDuplicateNode, 
  setPageDefinition,
  ChildRenderer = NodeRenderer,
  // Component params for dynamic content
  title = 'Welcome to Okiynai!',
  titleSize = '2.5rem',
  titleColor = 'var(--dark-teal)',
  subtitle = 'A unique e-commerce platform combining the best of Shopify and Etsy.',
  subtitleSize = '1.2rem',
  subtitleColor = 'var(--secondary-text)',
  buttonText = 'Start Shopping',
  buttonColor = 'var(--mint-green)',
  buttonTextColor = 'var(--dark-teal)',
  backgroundColor = 'rgba(208, 240, 232, 0.3)',
  padding = '3rem 2rem',
  gap = '1.5rem',
  // Legacy params for backward compatibility
  content,
  fontSize,
  fontWeight,
  color,
  textAlign,
  htmlContent,
  ...otherParams
}: ComponentComponentProps) => {

  // Create a container section with title, subtitle, and button
  const dynamicSectionSchema: SectionNode = {
    id: `${nodeSchema.id}-dynamic-section`,
    type: 'section',
    order: 0,
    params: {},
    layout: {
      mode: 'flex',
      direction: 'column',
      gap,
      justifyContent: 'center',
      alignItems: 'center',
      padding,
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto'
    },
    inlineStyles: {
      backgroundColor,
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    },
    children: [
      {
        id: `${nodeSchema.id}-title`,
        type: 'atom',
        atomType: 'Text',
        order: 0,
        params: {
          content: title,
          tag: 'h1',
          fontSize: titleSize,
          fontWeight: 'bold',
          color: titleColor,
          textAlign: 'center',
          margin: '0'
        }
      },
      {
        id: `${nodeSchema.id}-subtitle`,
        type: 'atom',
        atomType: 'Text',
        order: 1,
        params: {
          content: subtitle,
          tag: 'p',
          fontSize: subtitleSize,
          fontWeight: 'normal',
          color: subtitleColor,
          textAlign: 'center',
          margin: '0',
          lineHeight: '1.6',
          maxWidth: '600px'
        }
      },
      {
        id: `${nodeSchema.id}-button`,
        type: 'atom',
        atomType: 'Button',
        order: 2,
        params: {
          text: buttonText,
          backgroundColor: buttonColor,
          color: buttonTextColor,
          padding: '14px 28px',
          borderRadius: '8px',
          fontSize: '1.1rem',
          fontWeight: '600',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          hoverBackgroundColor: 'var(--dark-teal)',
          hoverColor: 'white',
          hoverTransform: 'scale(1.05)'
        },
        eventHandlers: {
          onClick: [
            {
              id: 'button-click-action',
              type: 'dispatchEvent',
              params: {
                eventName: 'startShopping',
                detail: {
                  buttonId: `${nodeSchema.id}-button`,
                  timestamp: new Date().toISOString()
                }
              }
            }
          ]
        }
      }
    ]
  };

  return (
    <div>
      <ChildRenderer
        nodeSchema={dynamicSectionSchema}
        setPageDefinition={setPageDefinition}
        isInspectMode={isInspectMode}
        editingSections={editingSections}
        onDeleteNode={onDeleteNode}
        onDuplicateNode={onDuplicateNode}
        ChildRenderer={ChildRenderer}
      />
    </div>
  );
};