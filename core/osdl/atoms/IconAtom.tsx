'use client';

import React from 'react';
import { AtomComponentProps } from '@/AtomRegisty';
import * as LucideIcons from 'lucide-react';

// Props that IconAtom expects - these come from nodeSchema.params via NodeRenderer
interface IconAtomSpecificProps {
  iconName?: string; // Name of the lucide-react icon
	onClick?: (e: React.MouseEvent) => void;
  size?: number; // Size of the icon
  color?: string; // Color of the icon
  strokeWidth?: number; // Stroke width of the icon
  fill?: string; // Fill color of the icon
}

export interface IconAtomProps extends AtomComponentProps, IconAtomSpecificProps {}

const IconAtom: React.FC<IconAtomProps> = ({
  id,
  style,
  className,
  nodeSchema,
  iconName = 'Circle',
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
  fill = 'none',
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onMouseDown,
  onMouseUp,
}) => {
  // Dynamically get the icon component from Lucide
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Circle;

  const iconStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: style?.fontSize || `${size}px`,
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  return (
    <div
      id={id}
      style={iconStyle}
      className={className}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
        <IconComponent 
          size={size} 
          color={style?.stroke || color} 
          strokeWidth={style?.strokeWidth || strokeWidth}
          fill={style?.fill || fill}
          style={{
            width: '1em', // qutie sus ( this and height, but are used for font-size transition, will see with time if it's a brilliant  soltuion or stupid idea )
            height: '1em',
            stroke: style?.stroke || color,
            strokeWidth: style?.strokeWidth || strokeWidth,
            fill: style?.fill || fill,
            transition: 'inherit',
          }}
        />
    </div>
  );
};

export default IconAtom; 
