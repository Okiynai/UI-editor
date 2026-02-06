import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  depth?: number;
  defaultExpanded?: boolean;
  buttonClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
  iconClassName?: string;
}

export const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  children,
  depth = 0,
  defaultExpanded = false,
  buttonClassName,
  contentClassName,
  titleClassName,
  iconClassName
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Calculate height excluding absolutely positioned elements
  const getHeightExcludingAbsolute = useCallback((element: HTMLElement): number => {
    let height = 0;
    
    for (const child of Array.from(element.children)) {
      const childElement = child as HTMLElement;
      const computedStyle = window.getComputedStyle(childElement);
      const position = computedStyle.position;
      
      // Skip absolutely positioned elements
      if (position === 'absolute' || position === 'fixed') {
        continue;
      }
      
      // For relatively/static positioned elements, include their height
      if (position === 'relative' || position === 'static' || position === 'sticky') {
        height += childElement.offsetHeight;
      }
    }
    
    return height;
  }, []);
  
  // Instant height sync function (NO ANIMATION)
  const syncContainerHeight = useCallback(() => {
    if (!isExpanded || !contentRef.current || isAnimating) return;
    
    const content = contentRef.current;
    const newHeight = getHeightExcludingAbsolute(content);
    
    // Update height instantly - no animation
    setContainerHeight(newHeight);
  }, [isExpanded, isAnimating, getHeightExcludingAbsolute]);

  // Handle transition events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;


    const handleTransitionStart = ( e: TransitionEvent ) => {
      // Only handle height transitions, ignore other property transitions
      if (e.propertyName === 'height' && e.target === e.currentTarget) {
        setIsTransitioning(true);
      }
    };

    const handleTransitionEnd = ( e: TransitionEvent ) => {
      // Only handle height transitions, ignore other property transitions
      if (e.propertyName === 'height' && e.target === e.currentTarget) {
        setIsTransitioning(false);
        setIsAnimating(false);
      }
    };

    container.addEventListener('transitionstart', handleTransitionStart);
    container.addEventListener('transitionend', handleTransitionEnd);

    return () => {
      container.removeEventListener('transitionstart', handleTransitionStart);
      container.removeEventListener('transitionend', handleTransitionEnd);
    };
  }, []);

  // Handle initial expand/collapse (WITH ANIMATION)
  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;
    
    if (isExpanded) {
      setIsAnimating(true);
      const content = contentRef.current;
      setContainerHeight(getHeightExcludingAbsolute(content));
    } else {
      setIsAnimating(true);
      setContainerHeight(0);
      
      setTimeout(() => {
        setIsAnimating(false);
      }, 200);
    }
  }, [isExpanded, getHeightExcludingAbsolute]);

  // Create observers for reactive height updates (NO ANIMATION)
  useEffect(() => {
    if (!contentRef.current) return;
    
    const content = contentRef.current;
    let resizeObserver: ResizeObserver;
    let mutationObserver: MutationObserver;
    
    // ResizeObserver for size changes
    resizeObserver = new ResizeObserver(() => {
      if (isExpanded && !isAnimating) {
        requestAnimationFrame(() => {
          syncContainerHeight();
        });
      }
    });
    
    // MutationObserver for DOM changes
    mutationObserver = new MutationObserver(() => {
      if (isExpanded && !isAnimating) {
        requestAnimationFrame(() => {
          syncContainerHeight();
        });
      }
    });
    
    // Start observing
    resizeObserver.observe(content);
    mutationObserver.observe(content, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    // Cleanup
    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [isExpanded, isAnimating, syncContainerHeight]);

  const handleToggle = () => {
    // Set transitioning immediately to prevent overflow flicker
    setIsTransitioning(true);
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`pl-${depth * 4}`}>
      <button
        onClick={handleToggle}
        className={buttonClassName ?? "w-full text-left px-4 py-3 text-sm font-medium text-gray-800 hover:text-gray-900 transition-colors flex items-center justify-between"}
      >
        <span className={titleClassName ?? "truncate"}>{title}</span>
        <span className={iconClassName ?? "text-xl font-semibold"}>{isExpanded ? '−' : '+'}</span>
      </button>
      
      {/* Expandable container - only animates on expand/collapse */}
      <div 
        ref={containerRef}
        className={`${isAnimating ? 'transition-all duration-200 ease-in-out' : ''} ${isTransitioning ? 'overflow-hidden' : isExpanded ? 'overflow-visible' : 'overflow-hidden'}`}
        data-skip-container="true"
        style={{ 
          height: `${containerHeight}px`
        }}
      >
        <div ref={contentRef} className={contentClassName ?? "px-4 pb-4"}>
          {children}
        </div>
      </div>
    </div>
  );
}; 