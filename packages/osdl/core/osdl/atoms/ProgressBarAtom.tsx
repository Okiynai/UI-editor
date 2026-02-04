'use client';

import React from 'react';
import { AtomNode, ProgressBarAtomParams } from '@/OSDL.types';
import { useLocale } from '@/osdl/contexts/LocaleContext';

// Define the props ProgressBarAtom receives from NodeRenderer
// It includes standard atom props and the specific ProgressBarAtomParams (spread by NodeRenderer)
export interface ProgressBarAtomProps extends ProgressBarAtomParams { 
  id: string; 
  style?: React.CSSProperties; 
  className?: string; 
  nodeSchema: AtomNode; // The full node schema for context
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

const ProgressBarAtom: React.FC<ProgressBarAtomProps> = ({
  id,
  style, 
  className,
  nodeSchema, // Used for context, params are destructured below
  // ProgressBarAtomParams are received directly due to spread in NodeRenderer
  value,
  max = 100, 
  barColor,
  trackColor,
  width = '100%',
  height = '10px',
  borderRadius,
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
  const { activeLocale } = useLocale();
  const isRTL = activeLocale.startsWith('ar');

  const containerStyle: React.CSSProperties = {
    width: width,
    height: height,
    backgroundColor: trackColor || 'var(--backgroundSubtle)',
    borderRadius: borderRadius || '4px',
    overflow: 'hidden',
    direction: isRTL ? 'rtl' : 'ltr',
    ...style, 
  };

  const progressElementStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    border: 'none', 
    borderRadius: borderRadius || '4px',
    color: barColor || 'var(--primary)', // This often sets the bar color in compliant browsers
  };

  return (
    <div
      style={containerStyle}
      id={id}
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
      <progress
        value={value}
        max={max}
        style={progressElementStyle}
      />
    </div>
  );
};

export default ProgressBarAtom; 