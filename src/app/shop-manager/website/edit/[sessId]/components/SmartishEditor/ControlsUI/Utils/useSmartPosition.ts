import { useState, useRef, useEffect, useCallback } from 'react';

export type Position = 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface SmartPositionConfig {
  preferredPosition: Position;
  fallbackPositions?: Position[];
  margin?: number;
  container?: HTMLElement | null;
  handleScroll?: boolean;
  handleResize?: boolean;
  handleContainerScroll?: boolean;
  isVisible?: boolean; // Trigger recalculation when this changes
  estimatedWidth?: number; // Initial width estimate to prevent first jump
  estimatedHeight?: number; // Initial height estimate to prevent first jump
}

export interface PositionResult {
  position: Position;
  style: React.CSSProperties;
}

const getScrollParent = (element: HTMLElement | null): HTMLElement => {
  if (!element) return document.documentElement;
  const overflow = getComputedStyle(element).overflow;
  if (overflow.includes('auto') || overflow.includes('scroll')) {
    return element;
  }
  return getScrollParent(element.parentElement);
};

const getConstrainingParent = (element: HTMLElement | null, hasSeenFixedContainer: boolean = false): HTMLElement => {
  if (!element) return document.documentElement;
  
  const style = getComputedStyle(element);
  const position = style.position;
  const overflow = style.overflow;
  const overflowX = style.overflowX;
  const overflowY = style.overflowY;
  
  // Check if this is a fixed positioned container
  const isFixedContainer = position === 'fixed';
  
  // Check if this element would constrain positioned children (overflow container)
  const isOverflowContainer = overflow === 'hidden' || overflowX === 'hidden' || overflowY === 'hidden' ||
      overflow === 'scroll' ||
      overflowX === 'scroll' ||
      overflowY === 'scroll';
  
  // If this is an overflow container with data-skip-container, only skip if we've seen a fixed container
  if (isOverflowContainer && element.hasAttribute('data-skip-container') && hasSeenFixedContainer) {
    return getConstrainingParent(element.parentElement, hasSeenFixedContainer);
  }
  
  // If this is an overflow container (and we're not skipping it), return it
  if (isOverflowContainer) {
    return element;
  }
  
  // Update the flag if we found a fixed container
  const newHasSeenFixedContainer = hasSeenFixedContainer || isFixedContainer;
  
  return getConstrainingParent(element.parentElement, newHasSeenFixedContainer);
};

interface ContainerRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const calculateAvailableSpace = (
  referenceRect: DOMRect,
  floatingRect: DOMRect,
  containerRect: ContainerRect,
  margin: number
) => {
  // Calculate space relative to viewport (for screen edges and scroll)
  const viewportSpace = {
    top: referenceRect.top - margin,
    bottom: window.innerHeight - referenceRect.bottom - margin,
    left: referenceRect.left - margin,
    right: window.innerWidth - referenceRect.right - margin,
  };

  // Calculate space relative to container (for overflow clipping)
  const containerSpace = {
    top: referenceRect.top - containerRect.top - margin,
    bottom: containerRect.bottom - referenceRect.bottom - margin,
    left: referenceRect.right - containerRect.left - margin,
    right: containerRect.right - referenceRect.left - margin,
  };

  // Return the most restrictive space (minimum of both)
  const result = {
    top: Math.min(viewportSpace.top, containerSpace.top),
    bottom: Math.min(viewportSpace.bottom, containerSpace.bottom),
    left: Math.min(viewportSpace.left, containerSpace.left),
    right: Math.min(viewportSpace.right, containerSpace.right),
  };


  return result;
};

const getPositionStyle = (position: Position, margin: number): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 50,
  };

  switch (position) {
    case 'top':
      return { ...baseStyle, bottom: `calc(100% + ${margin}px)` };
    case 'bottom':
      return { ...baseStyle, top: `calc(100% + ${margin}px)` };
    case 'left':
      return { ...baseStyle, right: `calc(100% + ${margin}px)` };
    case 'right':
      return { ...baseStyle, left: `calc(100% + ${margin}px)` };
    case 'top-left':
      return { ...baseStyle, bottom: `calc(100% + ${margin}px)`, right: '0' };
    case 'top-right':
      return { ...baseStyle, bottom: `calc(100% + ${margin}px)`, left: '0' };
    case 'bottom-left':
      return { ...baseStyle, top: `calc(100% + ${margin}px)`, right: '0' };
    case 'bottom-right':
      return { ...baseStyle, top: `calc(100% + ${margin}px)`, left: '0' };
    default:
      return baseStyle;
  }
};

const canFitInPosition = (
  position: Position,
  availableSpace: ReturnType<typeof calculateAvailableSpace>,
  floatingWidth: number,
  floatingHeight: number,
  margin: number
): boolean => {
  switch (position) {
    case 'top':
      return availableSpace.top >= (floatingHeight + margin);
    case 'bottom':
      return availableSpace.bottom >= (floatingHeight + margin);
    case 'left':
      return availableSpace.left >= (floatingWidth + margin);
    case 'right':
      return availableSpace.right >= (floatingWidth + margin);
    case 'top-left':
      return availableSpace.top >= (floatingHeight + margin) && availableSpace.left >= (floatingWidth + margin);
    case 'top-right':
      return availableSpace.top >= (floatingHeight + margin) && availableSpace.right >= (floatingWidth + margin);
    case 'bottom-left':
      return availableSpace.bottom >= (floatingHeight + margin) && availableSpace.left >= (floatingWidth + margin);
    case 'bottom-right':
      return availableSpace.bottom >= (floatingHeight + margin) && availableSpace.right >= (floatingWidth + margin);
    default:
      return false;
  }
};

export const useSmartPosition = (
  referenceRef: React.RefObject<HTMLElement | null>,
  floatingRef: React.RefObject<HTMLElement | null>,
  config: SmartPositionConfig
) => {
  const [position, setPosition] = useState<Position>(config.preferredPosition);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [cachedDimensions, setCachedDimensions] = useState<{width: number, height: number} | null>(null);
  
  const {
    preferredPosition,
    fallbackPositions = [],
    margin = 8,
    container = null,
    handleScroll = true,
    handleResize = true,
    handleContainerScroll = true,
    isVisible = false,
    estimatedWidth,
    estimatedHeight,
  } = config;

  const calculatePosition = useCallback(() => {
    if (!referenceRef.current) return;

    const referenceRect = referenceRef.current.getBoundingClientRect();
    
    // Use cached dimensions, estimates, or measure live
    let floatingWidth: number;
    let floatingHeight: number;
    
    if (cachedDimensions) {
      // Use cached real dimensions
      floatingWidth = cachedDimensions.width;
      floatingHeight = cachedDimensions.height;
    } else if (estimatedWidth && estimatedHeight) {
      // Use estimates to prevent first jump
      floatingWidth = estimatedWidth;
      floatingHeight = estimatedHeight;
    } else if (floatingRef.current) {
      // Fallback to live measurement
      const floatingRect = floatingRef.current.getBoundingClientRect();
      floatingWidth = floatingRect.width;
      floatingHeight = floatingRect.height;
    } else {
      // No dimensions available
      return;
    }
    
    // Determine the container to position relative to
    // Use provided container, or find the constraining container (for clipping), 
    // fallback to scroll parent if no constraining container found
    const constrainingContainer = container || getConstrainingParent(referenceRef.current);
    
    const containerRect: ContainerRect = constrainingContainer === document.documentElement 
      ? { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth }
      : (() => {
          const rect = constrainingContainer.getBoundingClientRect();
          return {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right
          };
        })();

    const availableSpace = calculateAvailableSpace(
      referenceRect,
      { width: floatingWidth, height: floatingHeight } as DOMRect,
      containerRect,
      margin
    );

    // Try preferred position first
    if (canFitInPosition(preferredPosition, availableSpace, floatingWidth, floatingHeight, margin)) {
      setPosition(preferredPosition);
      setStyle(getPositionStyle(preferredPosition, margin));
      return;
    }

    // Try fallback positions in order
    for (const fallbackPosition of fallbackPositions) {
      if (canFitInPosition(fallbackPosition, availableSpace, floatingWidth, floatingHeight, margin)) {
        setPosition(fallbackPosition);
        setStyle(getPositionStyle(fallbackPosition, margin));
        return;
      }
    }
    // If no position fits, use the preferred position anyway (will be clipped)
    setPosition(preferredPosition);
    setStyle(getPositionStyle(preferredPosition, margin));
  }, [referenceRef, floatingRef, preferredPosition, fallbackPositions, margin, container, cachedDimensions, estimatedWidth, estimatedHeight]);

  // Recalculate position when floating element becomes visible
  useEffect(() => {
    if (isVisible && floatingRef.current) {
      // Use a small delay to ensure the element is rendered and has dimensions
      const timer = setTimeout(() => {
        calculatePosition();
        
        // Cache real dimensions after first calculation
        if (!cachedDimensions) {
          const rect = floatingRef.current!.getBoundingClientRect();
          setCachedDimensions({ width: rect.width, height: rect.height });
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isVisible, calculatePosition, cachedDimensions]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        referenceRef.current?.contains(event.target as Node) ||
        floatingRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      // This hook doesn't handle closing - components should handle that themselves
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [referenceRef, floatingRef]);

  // Handle position recalculation
  useEffect(() => {
    if (handleResize) {
      window.addEventListener('resize', calculatePosition);
    }
    
    if (handleScroll) {
      window.addEventListener('scroll', calculatePosition, true);
    }

    if (handleContainerScroll && container) {
      container.addEventListener('scroll', calculatePosition);
    }

    return () => {
      if (handleResize) {
        window.removeEventListener('resize', calculatePosition);
      }
      if (handleScroll) {
        window.removeEventListener('scroll', calculatePosition, true);
      }
      if (handleContainerScroll && container) {
        container.removeEventListener('scroll', calculatePosition);
      }
    };
  }, [calculatePosition, handleResize, handleScroll, handleContainerScroll, container]);

  return {
    position,
    style,
    calculatePosition,
    cachedDimensions,
  };
};
