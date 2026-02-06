import React, { useState, useRef, useEffect } from 'react';
import { RendererProps } from '../../types';
import { SpacingValue } from './types';
import { UnifiedNumberField } from '../../utils/defaults/unifiedFields';
import { useSmartPosition } from '../../ControlsUI/Utils/useSmartPosition';

export const SpacingRenderer: React.FC<RendererProps> = ({
  data,
  mutations,
  config
}) => {
  // Get both padding and margin values from the data
  const paddingValue = data?.padding?.value || { top: 0, right: 0, bottom: 0, left: 0 };
  const marginValue = data?.margin?.value || { top: 0, right: 0, bottom: 0, left: 0 };
  const label = config?.label || 'Spacing';
  const disabled = false;

  // State for floating dropdowns
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const buttonRefs = {
    top: useRef<HTMLButtonElement>(null),
    right: useRef<HTMLButtonElement>(null),
    bottom: useRef<HTMLButtonElement>(null),
    left: useRef<HTMLButtonElement>(null),
    paddingTop: useRef<HTMLButtonElement>(null),
    paddingRight: useRef<HTMLButtonElement>(null),
    paddingBottom: useRef<HTMLButtonElement>(null),
    paddingLeft: useRef<HTMLButtonElement>(null),
  };
  const dropdownRefs = {
    top: useRef<HTMLDivElement>(null),
    right: useRef<HTMLDivElement>(null),
    bottom: useRef<HTMLDivElement>(null),
    left: useRef<HTMLDivElement>(null),
    paddingTop: useRef<HTMLDivElement>(null),
    paddingRight: useRef<HTMLDivElement>(null),
    paddingBottom: useRef<HTMLDivElement>(null),
    paddingLeft: useRef<HTMLDivElement>(null),
  };

  // State for drag functionality
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    direction: keyof SpacingValue | null;
    startPosition: { x: number; y: number } | null;
    startValue: number | null;
    isPadding: boolean;
    isShiftPressed: boolean;
    isCtrlPressed: boolean;
    lastDelta: number;
  }>({
    isDragging: false,
    direction: null,
    startPosition: null,
    startValue: null,
    isPadding: false,
    isShiftPressed: false,
    isCtrlPressed: false,
    lastDelta: 0,
  });

  // Aspect ratios: outer 424:270 (w:h), inner 253.2:150 (w:h)
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidthPx, setContainerWidthPx] = useState<number>(0);
  const [outerHeightPx, setOuterHeightPx] = useState<number>(270);
  const OUTER_HEIGHT_PER_WIDTH = 270 / 424;
  const INNER_HEIGHT_PER_WIDTH = 150 / 253.2;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setContainerWidthPx(w);
        setOuterHeightPx(Math.round(w * OUTER_HEIGHT_PER_WIDTH));
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Derived sizes for alignment of top/bottom regions
  const innerHeightPx = Math.round(containerWidthPx * 0.6 * INNER_HEIGHT_PER_WIDTH) || 150;
  const outerTopBottomGapPx = Math.max(0, Math.round((outerHeightPx - innerHeightPx) / 2));
  // Size inner top/bottom regions to touch inner box edges and clear the center content (20% height)
  const INNER_VERTICAL_PADDING_PX = 0; // 4px top + 4px bottom padding inside inner box
  const innerCenterContentHeightPx = Math.max(0, Math.round(innerHeightPx * 0.2));
  const innerTopBottomHeightPx = Math.max(0, Math.round((innerHeightPx - INNER_VERTICAL_PADDING_PX - innerCenterContentHeightPx) / 2));

  // Pre-set margin values (including negative values)
  const presetValues = [-20, -16, -12, -8, -4, 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96];
  
  // Pre-set padding values (no negative values)
  const paddingPresetValues = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192];

  const handlePaddingChange = (direction: keyof SpacingValue, newValue: number) => {
    const updatedValue = {
      ...paddingValue,
      [direction]: newValue
    };
    
    if (mutations?.setPadding) {
      mutations.setPadding(updatedValue);
    }
  };

  const handleMarginChange = (direction: keyof SpacingValue, newValue: number | "auto") => {
    console.log(`handleMarginChange called: direction=${direction}, newValue=${newValue}`);
    const updatedValue = {
      ...marginValue,
      [direction]: newValue
    };
    console.log('Updated value:', updatedValue);
    
    if (mutations?.setMargin) {
      console.log('Calling mutations.setMargin with:', updatedValue);
      mutations.setMargin(updatedValue);
    } else {
      console.log('No mutations.setMargin available');
    }
  };

  const handleSetAuto = (direction: keyof SpacingValue, isPadding: boolean = false) => {
    if (isPadding) {
      // Padding doesn't support auto, so set to 0
      handlePaddingChange(direction, 0);
    } else {
      handleMarginChange(direction, 'auto');
    }
  };

  const handlePresetClick = (direction: keyof SpacingValue, value: number, isPadding: boolean = false) => {
    if (isPadding) {
      handlePaddingChange(direction, value);
    } else {
      handleMarginChange(direction, value);
    }
  };

  // Drag functionality
  const handleMouseDown = (direction: keyof SpacingValue, event: React.MouseEvent, isPadding: boolean = false) => {
    // Only start drag if not clicking on a button
    if ((event.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    // Close any open dropdowns
    setActiveDropdown(null);
    
    const startPosition = { x: event.clientX, y: event.clientY };
    const startValue = isPadding ? paddingValue[direction] : marginValue[direction];
    
    setDragState({
      isDragging: true,
      direction,
      startPosition,
      startValue,
      isPadding,
      isShiftPressed: event.shiftKey,
      isCtrlPressed: event.ctrlKey,
      lastDelta: 0,
    });
  };

  // Helper function to get opposite field
  const getOppositeField = (direction: keyof SpacingValue): keyof SpacingValue => {
    switch (direction) {
      case 'top': return 'bottom';
      case 'bottom': return 'top';
      case 'left': return 'right';
      case 'right': return 'left';
      default: return direction;
    }
  };

  // Helper function to update all fields with delta
  const updateAllFieldsWithDelta = (delta: number, isPadding: boolean = false) => {
    if (isPadding) {
      const updatedValue = {
        top: Math.max(0, Math.min(1000, Math.round(paddingValue.top + delta))),
        right: Math.max(0, Math.min(1000, Math.round(paddingValue.right + delta))),
        bottom: Math.max(0, Math.min(1000, Math.round(paddingValue.bottom + delta))),
        left: Math.max(0, Math.min(1000, Math.round(paddingValue.left + delta)))
      };
      if (mutations?.setPadding) {
        mutations.setPadding(updatedValue);
      }
    } else {
      const updatedValue = {
        top: Math.max(-200, Math.min(1000, Math.round((marginValue.top as number) + delta))),
        right: Math.max(-200, Math.min(1000, Math.round((marginValue.right as number) + delta))),
        bottom: Math.max(-200, Math.min(1000, Math.round((marginValue.bottom as number) + delta))),
        left: Math.max(-200, Math.min(1000, Math.round((marginValue.left as number) + delta)))
      };
      if (mutations?.setMargin) {
        mutations.setMargin(updatedValue);
      }
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!dragState.isDragging || !dragState.direction || !dragState.startPosition || dragState.startValue === null) {
      return;
    }

    const deltaX = event.clientX - dragState.startPosition.x;
    const deltaY = event.clientY - dragState.startPosition.y;
    
    // Calculate total delta change based on direction
    let totalDelta = 0;
    
    switch (dragState.direction) {
      case 'top':
        // For top: moving down (positive deltaY) increases margin, moving up decreases it
        totalDelta = -deltaY;
        break;
      case 'bottom':
        // For bottom: moving down (positive deltaY) decreases margin, moving up increases it
        totalDelta = deltaY;
        break;
      case 'left':
        // For left: moving right (positive deltaX) increases margin, moving left decreases it
        totalDelta = deltaX;
        break;
      case 'right':
        // For right: moving right (positive deltaX) decreases margin, moving left increases it
        totalDelta = -deltaX;
        break;
    }
    
    // Calculate incremental delta from last position
    const incrementalDelta = totalDelta - dragState.lastDelta;
    
    // Update the lastDelta for next calculation
    setDragState(prev => ({ ...prev, lastDelta: totalDelta }));
    
    // Handle different modifier key behaviors
    if (dragState.isCtrlPressed) {
      // Ctrl: Apply incremental delta to all fields
      updateAllFieldsWithDelta(incrementalDelta, dragState.isPadding);
    } else if (dragState.isShiftPressed) {
      // Shift: Apply incremental delta to both current field and opposite field
      const oppositeDirection = getOppositeField(dragState.direction);
      
      // Update current field
      const currentFieldValue = dragState.isPadding ? paddingValue[dragState.direction] : (marginValue[dragState.direction] as number);
      const currentNewValue = currentFieldValue + incrementalDelta;
      let currentClampedValue = currentNewValue;
      if (dragState.isPadding) {
        currentClampedValue = Math.max(0, Math.min(1000, Math.round(currentNewValue)));
      } else {
        currentClampedValue = Math.max(-200, Math.min(1000, Math.round(currentNewValue)));
      }
      
      // Update opposite field
      const oppositeCurrentValue = dragState.isPadding ? paddingValue[oppositeDirection] : (marginValue[oppositeDirection] as number);
      const oppositeNewValue = oppositeCurrentValue + incrementalDelta;
      let oppositeClampedValue = oppositeNewValue;
      if (dragState.isPadding) {
        oppositeClampedValue = Math.max(0, Math.min(1000, Math.round(oppositeNewValue)));
      } else {
        oppositeClampedValue = Math.max(-200, Math.min(1000, Math.round(oppositeNewValue)));
      }
      
      // Apply both changes using mutations directly
      if (dragState.isPadding) {
        const updatedPaddingValue = {
          ...paddingValue,
          [dragState.direction]: currentClampedValue,
          [oppositeDirection]: oppositeClampedValue
        };
        if (mutations?.setPadding) {
          mutations.setPadding(updatedPaddingValue);
        }
      } else {
        const updatedMarginValue = {
          ...marginValue,
          [dragState.direction]: currentClampedValue,
          [oppositeDirection]: oppositeClampedValue
        };
        if (mutations?.setMargin) {
          mutations.setMargin(updatedMarginValue);
        }
      }
    } else {
      // Normal behavior: Apply incremental delta to the dragged field
      const newValue = dragState.startValue + totalDelta;
      
      // Clamp the value to reasonable bounds
      let clampedValue = newValue;
      if (dragState.isPadding) {
        clampedValue = Math.max(0, Math.min(1000, Math.round(newValue)));
      } else {
        clampedValue = Math.max(-200, Math.min(1000, Math.round(newValue)));
      }
      
      if (dragState.isPadding) {
        handlePaddingChange(dragState.direction, clampedValue);
      } else {
        handleMarginChange(dragState.direction, clampedValue);
      }
    }
  };

  const handleMouseUp = () => {
    if (dragState.isDragging) {
      setDragState({
        isDragging: false,
        direction: null,
        startPosition: null,
        startValue: null,
        isPadding: false,
        isShiftPressed: false,
        isCtrlPressed: false,
        lastDelta: 0,
      });
    }
  };

  // Set cursor based on drag direction
  const getCursorStyle = (direction: keyof SpacingValue, isPadding: boolean = false) => {
    if (!dragState.isDragging || dragState.direction !== direction || dragState.isPadding !== isPadding) {
      return '';
    }
    
    switch (direction) {
      case 'top':
      case 'bottom':
        return 'cursor-ns-resize';
      case 'left':
      case 'right':
        return 'cursor-ew-resize';
      default:
        return '';
    }
  };

  // Global mouse event listeners for drag
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, dragState.direction, dragState.startPosition, dragState.startValue]);

  const toggleDropdown = (direction: string) => {
    setActiveDropdown(activeDropdown === direction ? null : direction);
  };

  // Handle outside clicks to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is inside any dropdown
      const isInsideAnyDropdown = Object.values(dropdownRefs).some(ref => 
        ref.current?.contains(target)
      );
      
      // Check if click is inside any button
      const isInsideAnyButton = Object.values(buttonRefs).some(ref => 
        ref.current?.contains(target)
      );
      
      // Only close if clicking outside both dropdowns and buttons
      if (!isInsideAnyDropdown && !isInsideAnyButton && activeDropdown) {
        setActiveDropdown(null);
      }
    };

    if (activeDropdown) {
      // Add a small delay to prevent immediate closing when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [activeDropdown]);

  // Helper component for floating dropdown
  const FloatingDropdown: React.FC<{
    direction: keyof SpacingValue;
    value: number;
    position: 'top' | 'right' | 'bottom' | 'left';
  }> = ({ direction, value, position }) => {
    const isOpen = activeDropdown === direction;
    
    // Improved positioning logic with better width handling
    const getDropdownStyle = (): React.CSSProperties => {
      const baseStyle: React.CSSProperties = {
        position: 'absolute',
        zIndex: 100,
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        padding: '12px',
      };

      switch (position) {
        case 'top':
          return { 
            ...baseStyle, 
            top: 'calc(100% + 8px)', 
            left: '50%', 
            transform: 'translateX(-50%)',
            minWidth: '280px',
            width: 'max(280px, 60vw)',
            maxWidth: '400px'
          };
        case 'bottom':
          return { 
            ...baseStyle, 
            bottom: 'calc(100% + 8px)', 
            left: '50%', 
            transform: 'translateX(-50%)',
            minWidth: '280px',
            width: 'max(280px, 60vw)',
            maxWidth: '400px'
          };
        case 'left':
          return { 
            ...baseStyle, 
            left: 'calc(100% + 8px)', 
            top: '50%', 
            transform: 'translateY(-50%)',
            minWidth: '200px',
            width: 'max(200px, 40vw)',
            maxWidth: '300px'
          };
        case 'right':
          return { 
            ...baseStyle, 
            right: 'calc(100% + 8px)', 
            top: '50%', 
            transform: 'translateY(-50%)',
            minWidth: '200px',
            width: 'max(200px, 40vw)',
            maxWidth: '300px'
          };
        default:
          return baseStyle;
      }
    };

    return (
      <div className="relative">
        <button
          ref={buttonRefs[direction]}
          onClick={(e) => {
            e.stopPropagation();
            console.log('Button clicked for direction:', direction, 'Current active:', activeDropdown);
            toggleDropdown(direction);
          }}
          className="w-12 h-6 text-xs text-center rounded bg-gray-300 hover:bg-gray-400 transition-colors"
          disabled={disabled}
        >
          {value}
        </button>

        {isOpen && (
          <div
            ref={dropdownRefs[direction]}
            style={getDropdownStyle()}
            className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <UnifiedNumberField
                value={value}
                onChange={(newValue) => handleMarginChange(direction, newValue)}
                config={{
                  min: -200,
                  max: 1000,
                  step: 1,
                  showSlider: false,
                  unit: "px"
                }}
              />
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSetAuto(direction)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
                >
                  Auto
                </button>
                
                <div className="flex gap-1 flex-wrap">
                  {presetValues.slice(0, 10).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick(direction, preset)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        value === preset 
                          ? 'bg-gray-300 text-gray-800' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pb-2">
      {/* Title with icon */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Spacing</h3>
        <button 
          onClick={() => {
            // Set both left and right to auto in a single call
            const updatedValue = {
              ...marginValue,
              left: 'auto',
              right: 'auto'
            };
            
            if (mutations?.setMargin) {
              mutations.setMargin(updatedValue);
            }
          }}
          className="w-4 h-4 border border-gray-400 rounded-sm flex items-center justify-center hover:bg-gray-100 hover:border-gray-500 transition-colors relative"
          title="Set margin left and right to auto"
        >
          {/* Left indicator */}
          <div className="absolute -left-[3px] w-1 h-2 bg-gray-300 border border-white rounded-sm"></div>
          {/* Center content */}
          <div className="w-2 h-2 bg-gray-400 rounded-sm"></div>
          {/* Right indicator */}
          <div className="absolute -right-[3px] w-1 h-2 bg-gray-300 border border-white rounded-sm"></div>
        </button>
      </div>

      {/* Visual box representation */}
      <div className="w-full relative mt-2" ref={containerRef}>
        <div className="relative">
          {/* Outer box (margin) */}
          <div 
            className="border border-gray-300 rounded-sm bg-gray-50 w-full relative"
            style={{
              padding: '4px',
              height: `${outerHeightPx}px`
            }}
          >
            {/* Inner box (padding) - positioned absolutely to calculate spacing areas */}
            <div 
              className="border border-gray-300 rounded-sm bg-gray-50 absolute flex items-center justify-center z-10"
              style={{
                width: '60%',
                height: `${Math.round(containerWidthPx * 0.6 * INNER_HEIGHT_PER_WIDTH) || 150}px`,
                padding: '4px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            >
              {/* Padding Top area - INSIDE the padding box */}
              <div 
                className={`absolute bg-gray-100/40 flex items-center justify-center ${getCursorStyle('top', true)}`}
                onMouseDown={(e) => handleMouseDown('top', e, true)}
                style={{
                  width: '100%',
                  height: `${innerTopBottomHeightPx}px`,
                  top: '0px',
                  left: '0px',
                  clipPath: 'polygon(0px 0px, 100% 0px, 65% 100%, 20% 100%, 34% 100%)'
                }}
              >
                <button
                  ref={buttonRefs.paddingTop}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDropdown('paddingTop');
                  }}
                  className="w-12 h-6 text-xs text-center rounded bg-mint-green hover:bg-mint-green/80 transition-colors border border-dark-teal"
                  disabled={disabled}
                >
                  {paddingValue.top}
                </button>
              </div>

              {/* Padding Right area - INSIDE the padding box */}
              <div 
                className={`absolute bg-gray-200/40 flex items-center justify-center ${getCursorStyle('right', true)}`}
                onMouseDown={(e) => handleMouseDown('right', e, true)}
                style={{
                  width: 'calc(35% + 2px)',
                  height: '100%',
                  top: '0px',
                  right: '0px',
                  clipPath: 'polygon(0px 41%, 100% 0px, 100% 100%, 0% 60%, 0% 78%)'
                }}
              >
                <button
                  ref={buttonRefs.paddingRight}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDropdown('paddingRight');
                  }}
                  className="w-12 h-6 text-xs text-center rounded bg-mint-green hover:bg-mint-green/80 transition-colors border border-dark-teal"
                  disabled={disabled}
                >
                  {paddingValue.right}
                </button>
              </div>

              {/* Padding Bottom area - INSIDE the padding box */}
              <div 
                className={`absolute bg-gray-100/40 flex items-center justify-center ${getCursorStyle('bottom', true)}`}
                onMouseDown={(e) => handleMouseDown('bottom', e, true)}
                style={{
                  width: '100%',
                  height: `${innerTopBottomHeightPx}px`,
                  bottom: '0px',
                  left: '0px',
                  clipPath: 'polygon(37% 0px, 63% 0px, 100% 100%, 0% 100%, 0% 100%)'
                }}
              >
                <button
                  ref={buttonRefs.paddingBottom}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDropdown('paddingBottom');
                  }}
                  className="w-12 h-6 text-xs text-center rounded bg-mint-green hover:bg-mint-green/80 transition-colors border border-dark-teal"
                  disabled={disabled}
                >
                  {paddingValue.bottom}
                </button>
              </div>

              {/* Padding Left area - INSIDE the padding box */}
              <div 
                className={`absolute bg-gray-200/40 flex items-center justify-center ${getCursorStyle('left', true)}`}
                onMouseDown={(e) => handleMouseDown('left', e, true)}
                style={{
                  width: 'calc(35% + 2px)',
                  height: '100%',
                  top: '0px',
                  left: '0px',
                  clipPath: 'polygon(0px 0%, 100% 41%, 100% 60%, 0% 100%, 0% 100%)'
                }}
              >
                <button
                  ref={buttonRefs.paddingLeft}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDropdown('paddingLeft');
                  }}
                  className="w-12 h-6 text-xs text-center rounded bg-mint-green hover:bg-mint-green/80 transition-colors border border-dark-teal"
                  disabled={disabled}
                >
                  {paddingValue.left}
                </button>
              </div>

              <div className="w-[30%] h-[20%] bg-gray-200 rounded-sm flex items-center justify-center">
              </div>
              
              {/* Padding label */}
              <div className="absolute -top-1 left-1 px-1 rounded-sm">
                <span className="text-xs font-bold text-gray-700">padding</span>
              </div>
            </div>

            {/* Top spacing area - space between margin top and padding top */}
            <div 
              className={`absolute bg-gray-100/40 flex items-center justify-center ${getCursorStyle('top', false)}`}
              onMouseDown={(e) => handleMouseDown('top', e, false)}
              style={{
                width: '100%',
                height: `${outerTopBottomGapPx}px`,
                top: 0,
                left: 0,
                clipPath: 'polygon(0px 0px, 100% 0px, 80% 100%, 20% 100%, 20% 100.00%)'
              }}
            >
              <button
                ref={buttonRefs.top}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Button clicked for direction:', 'top', 'Current active:', activeDropdown);
                  toggleDropdown('top');
                }}
                className="w-12 h-6 text-xs text-center rounded bg-gray-300 hover:bg-gray-400 transition-colors"
                disabled={disabled}
              >
                {marginValue.top}
              </button>
            </div>
            
            {/* Right spacing area - space between margin right and padding right */}
            <div 
              className={`absolute bg-gray-200/40 flex items-center justify-center ${getCursorStyle('right', false)}`}
              onMouseDown={(e) => handleMouseDown('right', e, false)}
              style={{
                width: '20%',
                height: '100%',
                top: 0,
                right: 0,
                clipPath: 'polygon(0px 22%, 100% 0px, 100% 100%, 0% 78%, 0% 78%)'
              }}
            >
              <button
                ref={buttonRefs.right}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Button clicked for direction:', 'right', 'Current active:', activeDropdown);
                  toggleDropdown('right');
                }}
                className="w-12 h-6 text-xs text-center rounded bg-gray-300 hover:bg-gray-400 transition-colors"
                disabled={disabled}
              >
                {marginValue.right}
              </button>
            </div>
            
            {/* Bottom spacing area - space between margin bottom and padding bottom */}
            <div 
              className={`absolute bg-gray-100/40 flex items-center justify-center ${getCursorStyle('bottom', false)}`}
              onMouseDown={(e) => handleMouseDown('bottom', e, false)}
              style={{
                width: '100%',
                height: `${outerTopBottomGapPx}px`,
                bottom: 0,
                left: 0,
                clipPath: 'polygon(20% 0px, 80% 0px, 100% 100%, 0% 100%, 0% 100%)'
              }}
            >
              <button
                ref={buttonRefs.bottom}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Button clicked for direction:', 'bottom', 'Current active:', activeDropdown);
                  toggleDropdown('bottom');
                }}
                className="w-12 h-6 text-xs text-center rounded bg-gray-300 hover:bg-gray-400 transition-colors"
                disabled={disabled}
              >
                {marginValue.bottom}
              </button>
            </div>
            
            {/* Left spacing area - space between margin left and padding left */}
            <div 
              className={`absolute bg-gray-200/40 flex items-center justify-center ${getCursorStyle('left', false)}`}
              onMouseDown={(e) => handleMouseDown('left', e, false)}
              style={{
                width: '20%',
                height: '100%',
                top: 0,
                left: 0,
                clipPath: 'polygon(0px 0%, 100% 22%, 100% 78%, 0% 100%, 0% 100%)'
              }}
            >
              <button
                ref={buttonRefs.left}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Button clicked for direction:', 'left', 'Current active:', activeDropdown);
                  toggleDropdown('left');
                }}
                className="w-12 h-6 text-xs text-center rounded bg-gray-300 hover:bg-gray-400 transition-colors"
                disabled={disabled}
              >
                {marginValue.left}
              </button>
            </div>
          </div>

          {/* Margin label */}
          <div className="absolute -top-1 left-1 px-1 rounded-sm">
            <span className="text-xs font-bold text-gray-700">margin</span>
          </div>
        </div>

        {/* Floating Dropdowns - Outside clipped containers */}
        {activeDropdown === 'top' && (
          <div
            ref={dropdownRefs.top}
            style={{
              position: 'absolute',
              zIndex: 100,
              top: '60px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '12px',
              minWidth: '280px',
              width: 'max(280px, 60vw)',
              maxWidth: '400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <UnifiedNumberField
                value={marginValue.top}
                onChange={(newValue) => handleMarginChange('top', newValue)}
                config={{
                  min: -200,
                  max: 1000,
                  step: 1,
                  showSlider: false,
                  unit: "px"
                }}
              />
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSetAuto('top')}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
                >
                  Auto
                </button>
                
                <div className="flex gap-1 flex-wrap">
                  {presetValues.slice(0, 10).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick('top', preset)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        marginValue.top === preset 
                          ? 'bg-gray-300 text-gray-800' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDropdown === 'right' && (
          <div
            ref={dropdownRefs.right}
            style={{
              position: 'absolute',
              zIndex: 100,
              right: '20%',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '12px',
              minWidth: '200px',
              width: 'max(200px, 40vw)',
              maxWidth: '300px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <UnifiedNumberField
                value={marginValue.right}
                onChange={(newValue) => handleMarginChange('right', newValue)}
                config={{
                  min: -200,
                  max: 1000,
                  step: 1,
                  showSlider: false,
                  unit: "px"
                }}
              />
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSetAuto('right')}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
                >
                  Auto
                </button>
                
                <div className="flex gap-1 flex-wrap">
                  {presetValues.slice(0, 10).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick('right', preset)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        marginValue.right === preset 
                          ? 'bg-gray-300 text-gray-800' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDropdown === 'bottom' && (
          <div
            ref={dropdownRefs.bottom}
            style={{
              position: 'absolute',
              zIndex: 100,
              bottom: '60px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '12px',
              minWidth: '280px',
              width: 'max(280px, 60vw)',
              maxWidth: '400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <UnifiedNumberField
                value={marginValue.bottom}
                onChange={(newValue) => handleMarginChange('bottom', newValue)}
                config={{
                  min: -200,
                  max: 1000,
                  step: 1,
                  showSlider: false,
                  unit: "px"
                }}
              />
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSetAuto('bottom')}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
                >
                  Auto
                </button>
                
                <div className="flex gap-1 flex-wrap">
                  {presetValues.slice(0, 10).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick('bottom', preset)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        marginValue.bottom === preset 
                          ? 'bg-gray-300 text-gray-800' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDropdown === 'left' && (
          <div
            ref={dropdownRefs.left}
            style={{
              position: 'absolute',
              zIndex: 100,
              left: '20%',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '12px',
              minWidth: '200px',
              width: 'max(200px, 40vw)',
              maxWidth: '300px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <UnifiedNumberField
                value={marginValue.left}
                onChange={(newValue) => handleMarginChange('left', newValue)}
                config={{
                  min: -200,
                  max: 1000,
                  step: 1,
                  showSlider: false,
                  unit: "px"
                }}
              />
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSetAuto('left')}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
                >
                  Auto
                </button>
                
                <div className="flex gap-1 flex-wrap">
                  {presetValues.slice(0, 10).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick('left', preset)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        marginValue.left === preset 
                          ? 'bg-gray-300 text-gray-800' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Padding Dropdowns */}
        {activeDropdown === 'paddingTop' && (
          <div
            ref={dropdownRefs.paddingTop}
            style={{
              position: 'absolute',
              zIndex: 100,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              marginTop: '-95px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '12px',
              minWidth: '280px',
              width: 'max(280px, 60vw)',
              maxWidth: '400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <UnifiedNumberField
                value={paddingValue.top}
                onChange={(newValue) => handlePaddingChange('top', newValue)}
                config={{
                  min: 0,
                  max: 1000,
                  step: 1,
                  showSlider: false,
                  unit: "px"
                }}
              />
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSetAuto('top', true)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
                >
                  Auto
                </button>
                
                <div className="flex gap-1 flex-wrap">
                  {paddingPresetValues.slice(0, 10).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick('top', preset, true)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        paddingValue.top === preset 
                          ? 'bg-mint-green text-dark-teal' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDropdown === 'paddingRight' && (
          <div
            ref={dropdownRefs.paddingRight}
            style={{
              position: 'absolute',
              zIndex: 100,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              marginLeft: '50px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '12px',
              minWidth: '200px',
              width: 'max(200px, 40vw)',
              maxWidth: '300px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <UnifiedNumberField
                value={paddingValue.right}
                onChange={(newValue) => handlePaddingChange('right', newValue)}
                config={{
                  min: 0,
                  max: 1000,
                  step: 1,
                  showSlider: false,
                  unit: "px"
                }}
              />
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSetAuto('right', true)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
                >
                  Auto
                </button>
                
                <div className="flex gap-1 flex-wrap">
                  {paddingPresetValues.slice(0, 10).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick('right', preset, true)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        paddingValue.right === preset 
                          ? 'bg-mint-green text-dark-teal' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDropdown === 'paddingBottom' && (
          <div
            ref={dropdownRefs.paddingBottom}
            style={{
              position: 'absolute',
              zIndex: 100,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              marginTop: '95px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '12px',
              minWidth: '280px',
              width: 'max(280px, 60vw)',
              maxWidth: '400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <UnifiedNumberField
                value={paddingValue.bottom}
                onChange={(newValue) => handlePaddingChange('bottom', newValue)}
                config={{
                  min: 0,
                  max: 1000,
                  step: 1,
                  showSlider: false,
                  unit: "px"
                }}
              />
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSetAuto('bottom', true)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
                >
                  Auto
                </button>
                
                <div className="flex gap-1 flex-wrap">
                  {paddingPresetValues.slice(0, 10).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick('bottom', preset, true)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        paddingValue.bottom === preset 
                          ? 'bg-mint-green text-dark-teal' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDropdown === 'paddingLeft' && (
          <div
            ref={dropdownRefs.paddingLeft}
            style={{
              position: 'absolute',
              zIndex: 100,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              marginLeft: '-50px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '12px',
              minWidth: '200px',
              width: 'max(200px, 40vw)',
              maxWidth: '300px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <UnifiedNumberField
                value={paddingValue.left}
                onChange={(newValue) => handlePaddingChange('left', newValue)}
                config={{
                  min: 0,
                  max: 1000,
                  step: 1,
                  showSlider: false,
                  unit: "px"
                }}
              />
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSetAuto('left', true)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
                >
                  Auto
                </button>
                
                <div className="flex gap-1 flex-wrap">
                  {paddingPresetValues.slice(0, 10).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick('left', preset, true)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        paddingValue.left === preset 
                          ? 'bg-mint-green text-dark-teal' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
