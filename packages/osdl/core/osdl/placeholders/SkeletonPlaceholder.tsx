'use client';

import React from 'react';
import { SkeletonConfig } from '@/OSDL.types';
import './placeholders.css'; // Import the CSS for shimmer animation

interface SkeletonPlaceholderProps {
  config?: SkeletonConfig;
  style?: React.CSSProperties;
  className?: string;
}

const SkeletonPlaceholder: React.FC<SkeletonPlaceholderProps> = ({
  config,
  style,
  className,
}) => {
  const baseStyle: React.CSSProperties = {
    backgroundColor: 'var(--skeleton-bg, #e0e0e0)', // Default skeleton background
    borderRadius: config?.shape === 'circle' ? '50%' : '4px',
    display: 'block',
    overflow: 'hidden', // Ensures shimmer is contained
    ...style, // Merge with passed styles
  };

  const shape = config?.shape || 'rect';
  const color = config?.color || 'var(--skeleton-bg, #e0e0e0)';
  baseStyle.backgroundColor = color;

  if (shape === 'text') {
    const lines = config?.lines || 1;
    const lineStyle: React.CSSProperties = {
      ...baseStyle,
      height: style?.fontSize ? `calc(${style.fontSize} * 0.8)` : '0.8em',
      width: style?.width, // Use provided width, otherwise undefined (don't default to 100%)
      marginBottom: style?.fontSize ? `calc(${style.fontSize} * 0.4)` : '0.4em',
    };
    // Remove width from baseStyle if it was set, so it doesn't conflict with individual line widths if not needed
    delete baseStyle.width; 

    if (lines === 1) {
      return <div style={lineStyle} className={`skeleton-shimmer ${className || ''}`} />;
    }

    return (
      <div style={{ ...style, width: style?.width, display: 'flex', flexDirection: 'column' }} className={className || ''}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            style={{
              ...lineStyle, // lineStyle already has width: style.width
              // For multi-line text, individual lines might need to be 100% of their container if container has a set width.
              // Or, if the container has no width (style.width is undefined), then they adapt.
              // The current lineStyle.width = style?.width handles this.
              // However, if style.width is undefined, this could mean lines are too short.
              // Let's make lines 100% of their parent if the parent (this div) has a defined width, otherwise adapt or use a sensible default.
              width: (style?.width && index === lines -1 && lines > 1) ? '75%' : (style?.width ? '100%' : (index === lines - 1 && lines > 1 ? '75%' : '100%')), 
              marginBottom: index === lines - 1 ? 0 : (style?.fontSize ? `calc(${style.fontSize} * 0.4)` : '0.4em'),
            }}
            className="skeleton-shimmer"
          />
        ))}
      </div>
    );
  }

  if (shape === 'circle') {
    return (
      <div
        style={{
          ...baseStyle,
          width: style?.width || style?.height || '50px',
          height: style?.height || style?.width || '50px',
        }}
        className={`skeleton-shimmer ${className || ''}`}
      />
    );
  }

  // Default to rect
  return (
    <div
      style={{
        ...baseStyle,
        width: style?.width, // Use provided width, otherwise undefined
        height: style?.height || '1.2em', 
      }}
      className={`skeleton-shimmer ${className || ''}`}
    />
  );
};

export default SkeletonPlaceholder; 