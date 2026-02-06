import { useAtom } from "jotai";
import { ScreenSize, SidebarPanel } from "../types/builder";
import { useState, useEffect } from "react";
import { isInPreviewModeAtom } from "../store";

// Custom hook for smart max width calculation
export const useSmartMaxWidth = (
    sidebarWidth: number,
    activePanel: SidebarPanel,
    screenSize: ScreenSize
) => {
    const [windowWidth, setWindowWidth] = useState(1920);
    const [smartMaxWidth, setSmartMaxWidth] = useState(1024);
    const [isPreview] = useAtom(isInPreviewModeAtom);

    // Constants for layout calculations
    const LEFT_SIDEBAR_WIDTH = 56; // w-14 = 3.5rem = 56px
    const PREVIEW_AREA_PADDING = 16; // p-4 = 1rem = 16px on each side
    
    // Update window width on resize
    useEffect(() => {
        const updateWindowWidth = () => {
            setWindowWidth(window.innerWidth);
        };

        updateWindowWidth();
        window.addEventListener('resize', updateWindowWidth);
        
        return () => window.removeEventListener('resize', updateWindowWidth);
    }, []);

    // Calculate smart max width based on available space and screen mode
    useEffect(() => {
        let availableWidth: number;
        let buffer: number;

        if (isPreview) {
            // In preview mode, both sidebars are hidden
            // Use minimal buffer since we have the full window
            buffer = 20;
            availableWidth = windowWidth - buffer;
        } else {
            // Calculate space taken by sidebars and padding
            const leftSidebarSpace = LEFT_SIDEBAR_WIDTH;
            const secondarySidebarSpace = sidebarWidth;
            const previewAreaPadding = PREVIEW_AREA_PADDING * 2; // padding on both sides
            
            // For resizable mode, use minimal buffer to maximize usable space
            // For fixed modes (desktop, tablet, mobile), allow more generous space
            if (screenSize === "resizable") {
                buffer = 20; // Very small buffer for resizable mode
            } else {
                // For fixed screen sizes, we don't need much buffer since they're constrained anyway
                buffer = 10;
            }
            
            availableWidth = windowWidth - leftSidebarSpace - secondarySidebarSpace - previewAreaPadding - buffer;
        }

        // Set reasonable bounds based on mode
        const minMaxWidth = 320; // Minimum reasonable max width
        
        // For different screen size modes, set appropriate max limits
        let absoluteMaxWidth: number;
        if (isPreview) {
            absoluteMaxWidth = 2560; // Very high limit in preview mode
        } else if (screenSize === "resizable") {
            // For resizable mode, allow up to the calculated available width
            absoluteMaxWidth = Math.max(1400, availableWidth);
        } else {
            // For fixed modes (desktop 100%, tablet, mobile), the CSS handles the constraint
            // so we can be generous with the max width
            absoluteMaxWidth = 2000;
        }
        
        const calculatedMaxWidth = Math.max(minMaxWidth, Math.min(availableWidth, absoluteMaxWidth));
        
        setSmartMaxWidth(calculatedMaxWidth);
    }, [windowWidth, isPreview, sidebarWidth, activePanel, screenSize]);

    return smartMaxWidth;
};