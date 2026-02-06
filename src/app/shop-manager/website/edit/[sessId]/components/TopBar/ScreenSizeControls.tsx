import React from 'react';
import { Monitor, Tablet, Smartphone, Maximize2 } from 'lucide-react';
import { ScreenSize } from '../../types/builder';

export const ScreenSizeControls = ({
    screenSize,
    onScreenSizeChange,
    onResizableWidthChange,
    maxWidth
}: {
    screenSize: ScreenSize;
    onScreenSizeChange: (size: ScreenSize) => void;
    onResizableWidthChange: (width: number) => void;
    maxWidth: number;
}) => {
    const handleScreenSizeChange = (newSize: ScreenSize) => {
        if (newSize !== "resizable") {
            // Set width based on current screen size when switching FROM resizable
            const currentWidth = newSize === "desktop" ? 1200 : 
                                newSize === "tablet" ? 768 : 375;
            onResizableWidthChange(currentWidth);
        } else {
            // Set width based on current screen size when switching TO resizable
            // Add slight nudge (reduction) for visual feedback, but respect max width
            const currentWidth = screenSize === "desktop" ? 1190 : 
                                screenSize === "tablet" ? 750 : 360; // Slightly smaller than fixed widths
            // Ensure we don't exceed the smart max width
            onResizableWidthChange(Math.min(currentWidth, maxWidth));
        }
        onScreenSizeChange(newSize);
    };

    return (
        <div className="flex bg-gray-100/70 rounded-lg p-1">
            <button
                onClick={() => handleScreenSizeChange("desktop")}
                className={`p-2 rounded-md transition-colors ${
                    screenSize === "desktop" 
                    ? "bg-white text-primary-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
                title="Desktop"
            >
                <Monitor size={14} />
            </button>
            <button
                onClick={() => handleScreenSizeChange("tablet")}
                className={`p-2 rounded-md transition-colors ${
                    screenSize === "tablet" 
                    ? "bg-white text-primary-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
                title="Tablet"
            >
                <Tablet size={14} />
            </button>
            <button
                onClick={() => handleScreenSizeChange("mobile")}
                className={`p-2 rounded-md transition-colors ${
                    screenSize === "mobile" 
                    ? "bg-white text-primary-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
                title="Mobile"
            >
                <Smartphone size={14} />
            </button>
            <button
                onClick={() => handleScreenSizeChange("resizable")}
                className={`p-2 rounded-md transition-colors ${
                    screenSize === "resizable" 
                    ? "bg-white text-primary-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
                title="Resizable"
            >
                <Maximize2 size={14} />
            </button>
        </div>
    );
}; 