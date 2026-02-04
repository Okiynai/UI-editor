'use client';

import React, { forwardRef } from 'react';
import { AtomComponentProps } from '@/AtomRegisty';

interface LinkAtomSpecificProps {
  content?: string; // Text content of the link
  href?: string; // URL for the link
  target?: '_blank' | '_self' | '_parent' | '_top'; // Link target
  rel?: string; // Rel attribute for security
  children?: React.ReactNode; // Support for children content
  onClick?: (e: React.MouseEvent) => void; // onClick handler from NodeRenderer
  onMouseEnter?: (e: React.MouseEvent) => void; // Mouse enter handler
  onMouseLeave?: (e: React.MouseEvent) => void; // Mouse leave handler
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onKeyUp?: (e: React.KeyboardEvent) => void;
}

export interface LinkAtomProps extends AtomComponentProps, LinkAtomSpecificProps {}

const LinkAtom = forwardRef<HTMLAnchorElement, LinkAtomProps>(({
  id,
  style,
  className,
  nodeSchema,
  content = 'Link Text Missing',
  href = '#',
  target = '_self',
  rel,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onMouseDown,
  onMouseUp,
}, ref) => {
  // Set default rel for security when opening in new tab
  const defaultRel = target === '_blank' ? 'noopener noreferrer' : undefined;
  const finalRel = rel || defaultRel;

  // Use children if provided, otherwise fall back to content
  const linkContent = children || content;

  return (
    <a
      ref={ref}
      id={id}
      href={href}
      target={target}
      rel={finalRel}
      style={style}
      className={className}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      {linkContent}
    </a>
  );
});

LinkAtom.displayName = 'LinkAtom';

export default LinkAtom; 