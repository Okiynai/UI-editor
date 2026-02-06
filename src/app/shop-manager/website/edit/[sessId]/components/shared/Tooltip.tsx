import React, { useRef, useState, useCallback } from 'react';

// Global tooltip state
let globalTooltipElement: HTMLDivElement | null = null;

// Initialize global tooltip container
const initGlobalTooltip = () => {
    if (!globalTooltipElement) {
        globalTooltipElement = document.createElement('div');
        globalTooltipElement.id = 'global-tooltip';
        globalTooltipElement.className = 'fixed z-[9999] bg-gray-800 text-white text-xs rounded-lg px-3 py-2 max-w-xs shadow-lg pointer-events-none';
        globalTooltipElement.style.display = 'none';
        document.body.appendChild(globalTooltipElement);
    }
    return globalTooltipElement;
};

// Show global tooltip
const showGlobalTooltip = (content: string, targetElement: HTMLElement, offset: { top?: number; left?: number; right?: number; bottom?: number } = {}) => {
    const tooltip = initGlobalTooltip();
    const rect = targetElement.getBoundingClientRect();
    
    // Parse backticks as code blocks
    const parsedContent = content.replace(/`([^`]+)`/g, '<code class="bg-gray-700 px-1 rounded text-gray-200">$1</code>');
    tooltip.innerHTML = parsedContent;
    tooltip.style.display = 'block';
    
    // Default positioning (right)
    let top = rect.top;
    let left = rect.left + rect.width + 2;
    
    // Apply offsets
    if (offset.top !== undefined) top += offset.top;
    if (offset.left !== undefined) left += offset.left;
    if (offset.right !== undefined) left += offset.right;
    if (offset.bottom !== undefined) top += offset.bottom;
    
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
};

// Hide global tooltip
const hideGlobalTooltip = () => {
    if (globalTooltipElement) {
        globalTooltipElement.style.display = 'none';
    }
};

// Reusable Tooltip Component
export const Tooltip = ({ 
    children, 
    content, 
    className = "",
    offset = {},
    delay
}: { 
    children: React.ReactNode; 
    content: string; 
    className?: string;
    offset?: { top?: number; left?: number; right?: number; bottom?: number };
    delay?: number;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    const showTooltip = useCallback(() => {
        if (containerRef.current) {
            showGlobalTooltip(content, containerRef.current, offset);
            setIsVisible(true);
        }
    }, [content, offset]);

    const hideTooltip = useCallback(() => {
        hideGlobalTooltip();
        setIsVisible(false);
    }, []);

    const handleMouseEnter = useCallback(() => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Set a new timeout for the delay
        timeoutRef.current = setTimeout(() => {
            showTooltip();
            timeoutRef.current = null;
        }, delay);
    }, [showTooltip, delay]);

    const handleMouseLeave = useCallback(() => {
        // Clear the timeout if user leaves before delay completes
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Hide tooltip if it's currently visible
        if (isVisible) {
            hideTooltip();
        }
    }, [hideTooltip, isVisible]);

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            // Clear timeout if it exists
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            // Hide tooltip if it's currently visible when unmounting
            if (isVisible) {
                hideGlobalTooltip();
            }
        };
    }, [isVisible]);

    return (
        <div className={`relative ${className}`}>
            {/* Hover area with smaller padding around the actual trigger */}
            <div
                ref={containerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="p-1.5 -m-1.5 cursor-help" // 5px padding around the icon (halved)
            >
                {children}
            </div>
        </div>
    );
}; 