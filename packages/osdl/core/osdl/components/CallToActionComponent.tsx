'use client';

import React from 'react';
import { ComponentNode, Node, AtomNode } from '@/OSDL.types';
import TextAtom from '../atoms/TextAtom';
import ButtonAtom from '../atoms/ButtonAtom';
import NodeRenderer from '../NodeRenderer';

// Define expected params for this component for clarity, though OSDL.params is Record<string, any>
export interface CallToActionComponentParams {
  title?: string;
  titleTag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  subtitle?: string;
  subtitleTag?: 'p' | 'span';
  buttonText?: string;
  buttonHref?: string;
  buttonVariant?: string; // e.g., 'primary', 'secondary' - to be handled by ButtonAtom
  buttonSize?: string; // e.g., 'medium', 'large' - to be handled by ButtonAtom
  backgroundColor?: string;
  textColor?: string;
  padding?: string;
  borderRadius?: string;
  textAlign?: 'left' | 'center' | 'right';
  maxWidth?: string;
  gap?: string; // Gap between elements
  // Optional slot for custom content *before* the button
  customContentSlot?: Node[]; 
}

interface CallToActionComponentProps extends CallToActionComponentParams {
  id: string;
  nodeSchema: ComponentNode; // The OSDL schema for this component instance
  style?: React.CSSProperties; // Applied to the root of this component
  className?: string; // Applied to the root of this component
  showDevInfo?: boolean; // Passed from NodeRenderer if needed
}

const CallToActionComponent: React.FC<CallToActionComponentProps> = ({
  id,
  nodeSchema,
  style,
  className,
  showDevInfo,
  title = 'Catchy Title Here',
  titleTag = 'h2',
  subtitle,
  subtitleTag = 'p',
  buttonText = 'Learn More',
  buttonHref = '#',
  buttonVariant = 'primary',
  buttonSize = 'medium',
  backgroundColor = 'var(--backgroundLight)',
  textColor = 'var(--textDark)',
  padding = 'var(--spacing-large)',
  borderRadius = 'var(--border-radius-medium)',
  textAlign = 'center',
  maxWidth = '600px',
  gap = 'var(--spacing-medium)',
  customContentSlot,
}) => {

  const internalStyle: React.CSSProperties = {
    backgroundColor,
    color: textColor,
    padding,
    borderRadius,
    textAlign,
    maxWidth,
    margin: '0 auto', // Center the component if maxWidth is set
    display: 'flex',
    flexDirection: 'column',
    alignItems: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
    gap,
    ...style, // Allow overriding with passed-in style prop
  };

  // Construct minimal AtomNode schemas for internal TextAtom and ButtonAtom
  const titleAtomNodeSchema: AtomNode = {
    id: `${id}-title-atom`,
    type: 'atom',
    atomType: 'Text',
    order: 0,
    name: 'CTA Title',
    params: {
      content: title,
      tag: titleTag,
      color: textColor,
      textAlign: textAlign // Pass down text align for consistency
    }
  };

  const subtitleAtomNodeSchema: AtomNode | null = subtitle ? {
    id: `${id}-subtitle-atom`,
    type: 'atom',
    atomType: 'Text',
    order: 1,
    name: 'CTA Subtitle',
    params: {
      content: subtitle,
      tag: subtitleTag,
      color: textColor,
      textAlign: textAlign // Pass down text align
    }
  } : null;

  const buttonAtomNodeSchema: AtomNode | null = buttonText ? {
    id: `${id}-button-atom`,
    type: 'atom',
    atomType: 'Button',
    order: customContentSlot && customContentSlot.length > 0 ? 3 : 2, // Adjust order based on slot presence
    name: 'CTA Button',
    params: {
      content: buttonText,
      tag: 'a' as const, 
      href: buttonHref,
      variant: buttonVariant,
      size: buttonSize,
      // Button specific styling like alignment if not covered by flex parent
    }
  } : null;

  return (
    <div id={id} style={internalStyle} className={className} data-component-type="CallToAction">
      {showDevInfo && <small>CallToAction Component ID: {id} (Parent Schema: {nodeSchema.id})</small>}
      
      {title && (
        <TextAtom 
          id={titleAtomNodeSchema.id} 
          nodeSchema={titleAtomNodeSchema} 
          {...titleAtomNodeSchema.params} 
        />
      )}

      {subtitleAtomNodeSchema && (
        <TextAtom 
          id={subtitleAtomNodeSchema.id} 
          nodeSchema={subtitleAtomNodeSchema} 
          {...subtitleAtomNodeSchema.params} 
        />
      )}

      {customContentSlot && customContentSlot.length > 0 && (
        <div className="cta-custom-slot" style={{ width: '100%', order: 2 }}> {/* Ensure slot order */} 
          {customContentSlot.map(node => (
            <NodeRenderer key={node.id} nodeSchema={node} showDevInfo={showDevInfo} />
          ))}
        </div>
      )}

      {buttonAtomNodeSchema && (
        <ButtonAtom 
          id={buttonAtomNodeSchema.id} 
          nodeSchema={buttonAtomNodeSchema} 
          {...buttonAtomNodeSchema.params} 
        />
      )}
    </div>
  );
};

export default CallToActionComponent; 