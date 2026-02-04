'use client';

import React from 'react';
import { AtomComponentProps } from '@/AtomRegisty';
import { AtomNode } from '@/OSDL.types';

interface VideoAtomSpecificProps {
  src?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  playsInline?: boolean;
  poster?: string;
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

export interface VideoAtomProps extends AtomComponentProps, VideoAtomSpecificProps {}

const VideoAtom: React.FC<VideoAtomProps> = ({
  id,
  style,
  className,
  nodeSchema,
  src = '',
  autoplay = false,
  loop = false,
  muted = false,
  controls = true,
  playsInline = false,
  poster = '',
  // width, height, objectFit are handled by style prop from NodeRenderer
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
  // Extract styling-related params that are standard for <video> but might also be in OSDL params
  const videoWidth = nodeSchema.params?.width as string | number | undefined;
  const videoHeight = nodeSchema.params?.height as string | number | undefined;
  const videoObjectFit = nodeSchema.params?.objectFit as React.CSSProperties['objectFit'] | undefined;

  const finalStyle = {
    ...style,
    objectFit: videoObjectFit || style?.objectFit,
  };

  if (!src) {
    return (
      <div 
        id={id} 
        style={{
          width: typeof videoWidth === 'number' ? `${videoWidth}px` : videoWidth || '100%', 
          height: typeof videoHeight === 'number' ? `${videoHeight}px` : videoHeight || '200px', 
          backgroundColor: 'var(--backgroundSubtle)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px dashed var(--textMedium)',
          color: 'var(--textMedium)',
          ...finalStyle,
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
        Missing Video Source
      </div>
    );
  }

  return (
    <video
      id={id}
      src={src}
      autoPlay={autoplay}
      loop={loop}
      muted={muted}
      controls={controls}
      playsInline={playsInline}
      poster={poster}
      style={finalStyle}
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
    />
  );
};

export default VideoAtom; 