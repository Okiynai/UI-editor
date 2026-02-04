'use client';

import React from 'react';
import { AtomComponentProps } from '@/AtomRegisty';
import { AtomNode } from '@/OSDL.types';

interface ImageAtomSpecificProps {
  src?: string;      
  alt?: string;      
  width?: string | number; 
  height?: string | number;
  objectFit?: React.CSSProperties['objectFit'];
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

export interface ImageAtomProps extends AtomComponentProps, ImageAtomSpecificProps {}

const ImageAtom: React.FC<ImageAtomProps> = ({
  id,
  style, // This contains all CSS properties derived from params, layout, positioning
  className,
  nodeSchema,
  src = '', 
  alt = 'Image description missing',
  // width, height, objectFit are part of OSDL params but map to img attributes/style
  // NodeRenderer's processStylesAndLayout should incorporate these into the `style` prop if they are purely stylistic
  // or they can be handled explicitly here for direct img attributes.
  // For now, let's assume `processStylesAndLayout` handles width/height/objectFit within the `style` object.
  // ...otherParams removed to prevent spreading non-standard attributes
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

  // Extract styling-related params that are standard for <img> but might also be in OSDL params.
  // These are often handled by processStylesAndLayout and included in the `style` prop.
  // If they are explicitly also HTML attributes (like width, height), they can be handled here.
  const imgWidth = nodeSchema.params?.width as string | number | undefined;
  const imgHeight = nodeSchema.params?.height as string | number | undefined;
  const imgObjectFit = nodeSchema.params?.objectFit as React.CSSProperties['objectFit'] | undefined;

  // The `style` prop from NodeRenderer should ideally contain width, height, objectFit if they were defined in OSDL params
  // for styling. If they are also meant as direct HTML attributes, there's an overlap.
  // For simplicity, we pass them to the style object here, but ensure `processStylesAndLayout` is the primary source.

  const finalStyle = {
    ...style, // Styles from NodeRenderer (includes layout, positioning, and processed OSDL params like backgroundColor)
    objectFit: imgObjectFit || style?.objectFit, // Prioritize OSDL param if directly set, else from processed style
  };
   // HTML width/height attributes can affect layout differently than CSS width/height.
   // For responsive design, CSS width/height in `style` prop is usually preferred.
   // We will not pass imgWidth and imgHeight as direct HTML attributes here to avoid conflicts
   // with CSS styling from the `style` prop, assuming `processStylesAndLayout` handles them.

  if (!src) {
    return (
      <div 
        id={id} 
        style={{
          width: typeof imgWidth === 'number' ? `${imgWidth}px` : imgWidth || '100px', 
          height: typeof imgHeight === 'number' ? `${imgHeight}px` : imgHeight || '100px', 
          backgroundColor: 'var(--backgroundSubtle)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px dashed var(--textMedium)',
          color: 'var(--textMedium)',
          ...finalStyle, // Apply other styles like positioning
        }}
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
        Missing Image Source ({alt})
      </div>
    );
  }

  return (
    <img
      id={id}
      src={src}
      alt={alt}
      style={finalStyle} // `width` & `height` from params are now part of `finalStyle` if handled by processStylesAndLayout
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
      // Do NOT spread otherParams here
    />
  );
};

export default ImageAtom; 