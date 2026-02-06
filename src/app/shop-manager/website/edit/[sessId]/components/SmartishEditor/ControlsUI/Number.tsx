"use client";

// should make a couple of options here
// like slider or not
// input or not

import React, { useState, useRef, useEffect } from 'react';

interface DragNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  unit?: string;
  unitOptions?: string[];
  onUnitChange?: (unit: string) => void;
  showSlider?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export const DragNumberInput: React.FC<DragNumberInputProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  className = "",
  inputClassName = "",
  placeholder = "",
  disabled = false,
  unit = "",
  unitOptions = [],
  onUnitChange,
  showSlider = true,
  onFocus,
  onBlur,
  onDragStart,
  onDragEnd,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const initialNumericValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const initialIsSpecialUnit = unit === 'Auto' || unit === 'Unset' || unit === 'None' || unit === 'fit-content';
  // Store the actual value in ref to avoid re-renders during drag
  const valueRef = useRef(value);
  const [localValue, setLocalValue] = useState(initialNumericValue);
  const [inputValue, setInputValue] = useState(initialIsSpecialUnit ? unit : initialNumericValue.toString());
  const [currentUnit, setCurrentUnit] = useState(unit);
  
  // Check if current unit is a special value that should show text instead of number
  const isSpecialUnit = currentUnit === 'Auto' || currentUnit === 'Unset' || currentUnit === 'None' || currentUnit === 'fit-content';
  // Adaptive unit width: compact for special units, wider otherwise
  const unitWidthCh = isSpecialUnit ? 4 : 5;
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);
  const unitDropdownRef = useRef<HTMLDivElement>(null);

  // Sync number from parent while preserving special-unit text labels.
  useEffect(() => {
    if (!isDragging && !isUpdatingRef.current && Math.abs(value - localValue) > 0.0001) {
      setLocalValue(value);
      if (!isSpecialUnit) {
        setInputValue(value.toString());
      }
    }
    valueRef.current = value;
  }, [value, isDragging, localValue, isSpecialUnit]);

  // Update current unit when external unit changes
  useEffect(() => {
    setCurrentUnit(unit);
  }, [unit]);

  // Ensure special units show their label instead of numeric backing value.
  useEffect(() => {
    if (isSpecialUnit) {
      setInputValue(currentUnit);
    }
  }, [currentUnit, isSpecialUnit]);

  // Effective slider bounds: only respect negativity permission via min
  const effectiveMin = min < 0 ? min : 0;
  const effectiveRange = max - effectiveMin;
  // Calculate percentage of value in range for the track fill
  const percentage = effectiveRange > 0
    ? Math.max(0, Math.min(100, ((localValue - effectiveMin) / effectiveRange) * 100))
    : 0;

  // Safely update parent with value, preventing loops
  const updateParentValue = (newValue: number) => {
    if (Math.abs(newValue - valueRef.current) > 0.0001) {
      isUpdatingRef.current = true;
      onChange(newValue);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    
    setIsDragging(true);
    onDragStart?.();
    
    const handleDragMove = (moveEvent: MouseEvent) => {
      if (!sliderRef.current) return;
      
      const rect = sliderRef.current.getBoundingClientRect();
      const sliderWidth = rect.width;
      
      // Calculate position within slider bounds
      const position = Math.max(0, Math.min(moveEvent.clientX - rect.left, sliderWidth));
      
      // Convert position to value
      const ratio = position / sliderWidth;
      const newValue = effectiveMin + ratio * (max - effectiveMin);
      
      // Round to nearest step
      const rounded = Math.round(newValue / step) * step;
      const precision = String(step).includes('.') ? String(step).split('.')[1].length : 0;
      const formatted = Number(rounded.toFixed(precision));
      
      // Only update if value has changed significantly
      if (Math.abs(formatted - localValue) > 0.0001) {
        setLocalValue(formatted);
        setInputValue(formatted.toString());
        // Delay parent update to avoid render loop
        requestAnimationFrame(() => {
          updateParentValue(formatted);
        });
      }
    };
    
    // Apply initial movement to handle clicking and immediately dragging
    handleDragMove(e.nativeEvent);
    
    const handleDragEnd = () => {
      setIsDragging(false);
      onDragEnd?.();
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  // Arrow up/down on input increments/decrements by step when focused
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const isNonNegativeMode = !(min < 0);
    // Block minus sign when min is non-negative
    if (isNonNegativeMode && (e.key === '-' || (e.key === 'Minus' as any))) {
      e.preventDefault();
      return;
    }
    // Replace leading 0 when typing a digit
    const isDigitKey = e.key.length === 1 && e.key >= '0' && e.key <= '9';
    if (isDigitKey && inputValue === '0') {
      e.preventDefault();
      setInputValue(e.key);
      const parsed = parseFloat(e.key);
      setLocalValue(parsed);
      updateParentValue(parsed);
      return;
    }
    let direction = 0;
    if (e.key === 'ArrowUp' && !e.shiftKey) direction = 1;
    if (e.key === 'ArrowDown' && !e.shiftKey) direction = -1;
    if (direction === 0) return;
    e.preventDefault();
    
    // Ensure localValue is a valid number
    const currentValue = typeof localValue === 'number' && !isNaN(localValue) ? localValue : 0;
    const precision = String(step).includes('.') ? String(step).split('.')[1].length : 0;
    let next = Number((currentValue + direction * step).toFixed(precision));
    if (isNonNegativeMode && next < 0) next = 0;
    if (Math.abs(next - currentValue) > 0.0001) {
      setLocalValue(next);
      setInputValue(next.toString());
      updateParentValue(next);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInputValue = e.target.value;
    const isNonNegativeMode = !(min < 0);

    // Replace leading 0 when typing a digit (e.g., 0 -> 5 becomes 5, not 05)
    if (isNonNegativeMode) {
      // If currently showing exactly '0' and user types a digit, replace it
      if (inputValue === '0' && /^\d$/.test(newInputValue[newInputValue.length - 1] || '')) {
        const lastDigit = newInputValue[newInputValue.length - 1];
        setInputValue(lastDigit);
        const parsed = parseFloat(lastDigit);
        setLocalValue(parsed);
        updateParentValue(parsed);
        return;
      }
    }

    setInputValue(newInputValue);
    
    // Allow typing '-' when input is empty or when all text is selected
    if ((!isNonNegativeMode && newInputValue === '-') || newInputValue === '') {
      return; // Don't update the actual value yet
    }
    
    // Disallow '-' in non-negative mode
    if (isNonNegativeMode && newInputValue.includes('-')) {
      return;
    }

    const newValue = parseFloat(newInputValue);
    if (isNaN(newValue)) return;
    
    // Respect non-negative minimum when min is 0 or positive
    const clamped = (isNonNegativeMode && newValue < 0) ? 0 : newValue;
    setLocalValue(clamped);
    updateParentValue(clamped);
  };

  // Fixed, compact width (no growth); unit rendered inline so no reservation needed
  const getInputWidth = () => {
    const baseDigitsWidth = 72; // unified fixed width
    return baseDigitsWidth;
  };

  // Fixed compact width for slider variant
  const getSliderInputWidth = () => {
    const baseDigitsWidth = 72; // unified fixed width
    return baseDigitsWidth;
  };

  // Handle unit selection
  const handleUnitSelect = (selectedUnit: string) => {
    setCurrentUnit(selectedUnit);
    setIsUnitDropdownOpen(false);
    if (onUnitChange) {
      onUnitChange(selectedUnit);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target as Node)) {
        setIsUnitDropdownOpen(false);
      }
    };

    if (isUnitDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUnitDropdownOpen]);

  // Clean up any event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', () => {});
      document.removeEventListener('mouseup', () => {});
    };
  }, []);

  return (
    <div className={`${className}`}>
      {label && <label className="block text-xs text-gray-600 mb-1">{label}</label>}
      <div className={`flex items-center ${showSlider ? 'gap-3' : ''}`}>
        <div className="relative" style={{ 
          width: (() => {
            const base = showSlider ? getSliderInputWidth() : getInputWidth();
            const hasAnyUnit = (unitOptions.length > 0) || (unit && unit.trim() !== '');
            const deltaPx = hasAnyUnit ? 0 : 36; // ~5ch
            const finalWidth = Math.max(40, base - deltaPx);
            return `${finalWidth}px`;
          })(), 
          minWidth: '50px' 
        }}>
          <div className={`w-full flex items-center bg-gray-100 rounded-md overflow-visible ${disabled ? 'opacity-50' : ''}`}>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => {
                onFocus?.();
              }}
              onBlur={() => {
                if (isSpecialUnit) {
                  setInputValue(currentUnit);
                  onBlur?.();
                  return;
                }
                // Ensure value is properly formatted on blur
                const precision = String(step).includes('.') ? String(step).split('.')[1].length : 0;
                const formatted = Number(localValue.toFixed(precision));
                setLocalValue(formatted);
                setInputValue(formatted.toString());
                updateParentValue(formatted);
                onBlur?.();
              }}
              onKeyDown={handleInputKeyDown}
              className={`flex-1 min-w-0 h-6 pl-2 bg-transparent text-xs leading-none focus:outline-none ${inputClassName} ${disabled ? 'cursor-not-allowed' : ''} ${isSpecialUnit ? 'truncate' : ''} ${((unitOptions.length > 0) || (unit && unit.trim() !== '')) ? '' : 'pr-2'}`}
              placeholder={placeholder}
              disabled={disabled || isSpecialUnit}
              title={isSpecialUnit ? inputValue : undefined}
              style={{ appearance: 'textfield' }} // Removes spinner buttons
            />
            {unitOptions.length > 0 ? (
              <div className="relative flex items-center self-center" ref={unitDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                  className="h-6 text-xs leading-none text-gray-700 hover:text-gray-900 focus:outline-none px-1 rounded shrink-0 text-center truncate"
                  style={{ width: `${unitWidthCh}ch`, maxWidth: `${unitWidthCh}ch` }}
                  disabled={disabled}
                >
                  {isSpecialUnit ? '-' : (currentUnit || 'Select')}
                </button>
                {isUnitDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-gray-50 border border-gray-200 rounded-md shadow-lg z-20 w-fit max-h-48 overflow-y-auto">
                    {unitOptions.map((option, index) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleUnitSelect(option)}
                        className={`w-full text-left px-2 py-1.5 text-xs hover:bg-gray-100 first:rounded-t-md last:rounded-b-md ${
                          currentUnit === option ? 'bg-mint-green text-dark-teal' : 'text-gray-700'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : unit && (
              <span className="h-6 flex items-center justify-center px-1 text-xs leading-none text-gray-700 shrink-0 text-center truncate" style={{ width: `${unitWidthCh}ch`, maxWidth: `${unitWidthCh}ch` }}>
                {unit.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        {showSlider && !isSpecialUnit && (
          <div 
            ref={sliderRef}
            className={`h-1 bg-gray-200 flex-grow rounded-full cursor-ew-resize relative ${isDragging ? 'bg-gray-300' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onMouseDown={handleMouseDown}
          >
            {/* Filled track */}
            <div 
              className="absolute h-full bg-primary-500 rounded-full left-0"
              style={{ width: `${percentage}%` }}
            />
            
            {/* Thumb/handle */}
            <div 
              ref={thumbRef}
              className="slider-thumb absolute h-4 w-4 rounded-full bg-white top-1/2 transform -translate-y-1/2 -ml-2 cursor-ew-resize"
              style={{ 
                left: `${percentage}%`,
                cursor: 'ew-resize',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
              }}
              onMouseDown={handleMouseDown}
            />
          </div>
        )}
      </div>
    </div>
  );
}; 
