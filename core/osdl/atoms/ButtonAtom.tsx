'use client';

import React from 'react';
import { AtomComponentProps } from '@/AtomRegisty';
import { useActionExecutor } from '@/osdl/hooks/useActionExecutor';
import * as LucideIcons from 'lucide-react';

// Props that ButtonAtom expects
interface ButtonAtomSpecificProps {
  content?: string; // Text of the button
  tag?: 'button' | 'a'; // HTML tag to use
  href?: string; // For <a> tags
  icon?: string; // Icon name for the button (any Lucide icon name)
  iconSize?: number; // Size of the icon
  iconColor?: string; // Color of the icon
  // OSDL params might include a 'buttonType' (e.g., 'submit', 'reset')
  // It won't be in AtomComponentProps directly but in nodeSchema.params
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

export interface ButtonAtomProps extends AtomComponentProps, ButtonAtomSpecificProps {}

const ButtonAtom: React.FC<ButtonAtomProps> = ({
  id,
  style, // This contains all CSS properties derived from params, layout, positioning
  className,
  nodeSchema,
  content = 'Button Text Missing',
  tag: HtmlTag = 'button',
  href,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onMouseDown,
  onMouseUp,
  onKeyDown,
  onKeyUp,
  icon,
  iconSize = 16,
  iconColor = 'currentColor',
  // ...otherParams removed to prevent spreading non-standard attributes
}) => {

  const domProps = {
    id,
    style,
    className,
    onClick: onClick,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    onMouseDown,
    onMouseUp,
    onKeyDown,
    onKeyUp,
  };

  // Dynamically get the icon component if icon is specified
  // Check both 'icon' and 'iconName' for compatibility with iconPickerField
  const iconName = icon || (nodeSchema.params?.iconName as string);
  const IconComponent = iconName ? (LucideIcons as any)[iconName] : null;
  
  // Get icon size, color, strokeWidth, and fill from params
  // Only use fallback when value is undefined/null, not when it's 0
  const iconSizeFromParams = nodeSchema.params?.iconSize as number;
  const finalIconSize = iconSizeFromParams !== undefined && iconSizeFromParams !== null 
    ? iconSizeFromParams 
    : (iconSize || 16);
  // Use iconColor from params (set by buttonIconColorField) or fallback to iconColor prop
  const finalIconColor = (nodeSchema.params?.iconColor as string) || iconColor || 'currentColor';
  const finalStrokeWidth = (nodeSchema.params?.strokeWidth as number) || 2;
  const finalFill = (nodeSchema.params?.fill as string) || 'none';

  if (HtmlTag === 'a') {
    return (
      <a href={href || '#'} {...domProps}>
        {IconComponent && <IconComponent 
          size={finalIconSize} 
          color={finalIconColor} 
          strokeWidth={finalStrokeWidth}
          fill={finalFill}
          style={{ display: 'block' }} 
        />}
        {content}
      </a>
    );
  }

  // For <button>, extract 'type' from OSDL params if it exists.
  // Default to 'button' if not specified.
  const buttonType = (nodeSchema.params?.buttonType as 'submit' | 'reset' | 'button' | undefined) || 'button';

  return (
    <button type={buttonType} {...domProps}>
      {IconComponent && <IconComponent 
        size={finalIconSize} 
        color={finalIconColor} 
        strokeWidth={finalStrokeWidth}
        fill={finalFill}
        style={{ display: 'block' }} 
      />}
      {content}
    </button>
  );
};

export default ButtonAtom;
