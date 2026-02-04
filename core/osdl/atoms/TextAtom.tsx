'use client';

import React from 'react';
import { AtomComponentProps } from '@/AtomRegisty';
import { AtomNode } from '@/OSDL.types';

// Props that TextAtom expects, including specific params and common OSDL props
interface TextAtomSpecificProps {
  content?: string;
  tag?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div';
  // Add other Text-specific params here from your OSDL definition if needed
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onKeyUp?: (e: React.KeyboardEvent) => void;
}

// Combine with common AtomComponentProps if those are not already including everything
// However, NodeRenderer spreads params directly, so they become top-level props.
export interface TextAtomProps extends AtomComponentProps, TextAtomSpecificProps {}

const TextAtom: React.FC<TextAtomProps> = ({
  id,
  style, // This contains all CSS properties derived from params, layout, positioning
  className,
  nodeSchema,
  content = 'Text Content Missing', // Default content
  tag: HtmlTag = 'p', // Default tag to <p>
  // ...otherParams are any *additional* OSDL params not covered by 'content' or 'tag'
  // and not already processed into the 'style' prop by NodeRenderer.
  // We should avoid spreading them directly if they are style-related.
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onMouseDown,
  onMouseUp,
  onKeyDown,
  onKeyUp,
}) => {
  // Props intended for the DOM element should be explicitly listed or filtered.
  // For a Text atom, most OSDL params (fontSize, color, etc.) are converted to CSS 
  // and passed via the `style` prop from NodeRenderer.
  // We pass `id`, `style`, `className`.
  // Other non-standard attributes from OSDL params should generally not be passed directly to DOM unless intended.
  return (
    <HtmlTag
      id={id}
      style={style}
      className={className}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      {content}
    </HtmlTag>
  );
};

export default TextAtom;
