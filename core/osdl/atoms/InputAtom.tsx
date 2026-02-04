'use client';

import React, { useState, useEffect } from 'react';
import { AtomComponentProps } from '@/AtomRegisty';

interface InputAtomSpecificProps {
  type?: string;
  placeholder?: string;
  value?: string | number | readonly string[];
  checked?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  pattern?: string;
  autoComplete?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyUp?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export interface InputAtomProps extends AtomComponentProps, InputAtomSpecificProps {}

const InputAtom: React.FC<InputAtomProps> = ({
  id,
  style,
  className,
  nodeSchema,
  type = 'text',
  placeholder = '',
  value,
  checked,
  required = false,
  disabled = false,
  readOnly = false,
  name = '',
  min,
  max,
  step,
  pattern,
  autoComplete,
  onChange,
  onFocus,
  onBlur,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  onKeyDown,
  onKeyUp,
  ...props
}) => {
  const inputName = name || nodeSchema.params.name || id;

  const isCheckable = type === 'radio' || type === 'checkbox';

	console.log('LALA ', checked)
  const inputWidth = nodeSchema.params?.width as string | number | undefined;
  const inputHeight = nodeSchema.params?.height as string | number | undefined;

  const finalStyle = {
    ...style,
    width: inputWidth !== undefined ? (typeof inputWidth === 'number' ? `${inputWidth}px` : inputWidth) : style?.width,
    height: inputHeight !== undefined ? (typeof inputHeight === 'number' ? `${inputHeight}px` : inputHeight) : style?.height,
  };

  return (
    <input
      id={id}
      type={type}
      name={inputName}
      placeholder={placeholder}

      // For checkable inputs, we pass the `checked` prop and let the browser handle the value.
      // For other inputs (like text), we pass the `value` prop.
      value={isCheckable ? undefined : value}
      checked={isCheckable ? checked : undefined}

      required={required}
      disabled={disabled}
      readOnly={readOnly}
      min={min}
      max={max}
      step={step}
      pattern={pattern}
      autoComplete={autoComplete}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      style={finalStyle}
      className={className}
    />
  );
};

export default InputAtom; 
