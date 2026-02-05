import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { useParams } from 'next/navigation';
import { ScreenSize } from '../types/builder';
import { useAtom } from 'jotai';
import { isInPreviewModeAtom } from '../store';
import { useIframeCommunicationContext } from '../context/IframeCommunicationContext';


/*
    This is a hook that prevents the user from interacting with the iframe
    when the mouse is down. so an action like clicking, since it requires mouse up and such
    if we mouse up'd in the iframe, it wouldn't count, casuing a lot of fuckary for literally and dragging
    logic, and idk what else can be fucked up by this.

    so using a protection here is a must.
*/
const useIframeCondom = () => {
  const [useProtection, setUseProtection] = useState(false);

  useEffect(() => {
    const handleMouseDown = () => {
      setUseProtection(true);
    };

    const handleMouseUp = () => {
      setUseProtection(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp); 
    document.addEventListener('mouseleave', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
    };
  }, []);

  return useProtection;
};

export const PreviewArea = ({
    screenSize,
    resizableWidth,
    onResizableWidthChange,
    smartMaxWidth,
}: {
    screenSize: ScreenSize;
    resizableWidth: number;
    onResizableWidthChange: (width: number) => void;
    smartMaxWidth: number;
}) => {
    const [isPreview] = useAtom(isInPreviewModeAtom);
    const { handleIframeReady } = useIframeCommunicationContext();
    
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const params = useParams();
    const sessId = (params?.sessId as string) || 'demo';

    const useProtection = useIframeCondom();

    const [isDragging, setIsDragging] = useState(false);
    const previewAreaRef = useRef<HTMLDivElement>(null);

    // Use smart max width instead of hardcoded values
    useEffect(() => {
        // If current width exceeds the smart max width, constrain it
        if (resizableWidth > smartMaxWidth) {
            onResizableWidthChange(smartMaxWidth);
        }
    }, [smartMaxWidth, resizableWidth, onResizableWidthChange]);

    const handleIframeLoad = () => {
        if (iframeRef.current) {
            handleIframeReady(iframeRef.current);
        }
    };
    
    return (
        <div
            id="preview-area"
            ref={previewAreaRef}
            className={`flex-1 bg-gray-100 relative z-0 min-h-0 ${isPreview ? 'p-0 h-full' : 'p-4'} transition-all duration-150`}
        >
            {/* Resize handles for resizable mode */}
            <ResizeHandler 
                screenSize={screenSize} 
                resizableWidth={resizableWidth} 
                onWidthChange={onResizableWidthChange}
                onDraggingChange={setIsDragging}
                maxWidth={smartMaxWidth}
            />

            <div 
                className={`relative mx-auto bg-white max-w-full shadow-sm ${
                    screenSize === "resizable" && isDragging ? "" : "transition-all duration-150"
                } ${isPreview ? 'rounded-none h-full' : 'rounded-lg min-h-full max-h-full'}`}
                style={{
                    width: screenSize === "resizable" ? `${resizableWidth}px` :
                           screenSize === "desktop" ? "100%" :
                           screenSize === "tablet" ? "768px" :
                           screenSize === "mobile" ? "375px" : "100%"
                }}
            >
                {useProtection && (
                    <div className="absolute inset-0 bg-transparent z-50" />
                )}

                {/* Iframe container for the sandboxed editor */}
                <iframe
                    ref={iframeRef}
                    src={`/shop-manager/website/edit/iframe?siteid=${encodeURIComponent(sessId)}`}
                    // absolute here is important for the iframe to take full height
                    className="absolute top-0 left-0 w-full h-full border-none"
                    onLoad={handleIframeLoad}
                    title="Website Editor Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                />
            </div>
        </div>
    );
}; 


const ResizeHandler = ({
    screenSize, 
    resizableWidth, 
    onWidthChange,
    onDraggingChange,
    maxWidth,
}: {
    screenSize: ScreenSize, 
    resizableWidth: number, 
    onWidthChange: (width: number) => void;
    onDraggingChange: (isDragging: boolean) => void;
    maxWidth: number;
}) => {
    const dragStartPos = useRef(0);
    const dragStartWidth = useRef(0);
    const activeHandle = useRef<'left' | 'right' | null>(null);

    const handleResizeStart = useCallback((e: React.MouseEvent, handle: 'left' | 'right') => {
        e.preventDefault();
        onDraggingChange(true);
        dragStartPos.current = e.clientX;
        dragStartWidth.current = resizableWidth;
        activeHandle.current = handle;
    }, [resizableWidth, onDraggingChange]);

    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (activeHandle.current === null) return;

        const deltaX = e.clientX - dragStartPos.current;
        let newWidth;
        if (activeHandle.current === 'left') {
            newWidth = dragStartWidth.current - deltaX * 2;
        } else {
            newWidth = dragStartWidth.current + deltaX * 2;
        }

        const minWidth = 320;
        const constrainedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
        
        console.log("constrainedWidth", constrainedWidth);
        onWidthChange(constrainedWidth);
    }, [onWidthChange, maxWidth]);

    const handleResizeEnd = useCallback(() => {
        onDraggingChange(false);
        activeHandle.current = null;
    }, [onDraggingChange]);

    useEffect(() => {
        const isDragging = activeHandle.current !== null;

        if (isDragging) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [activeHandle.current, handleResizeMove, handleResizeEnd]);

    return (
        <>
            {screenSize === "resizable" && (
                <>
                    <div
                        className="absolute top-1/2 transform -translate-y-1/2 w-2 h-8 bg-white border border-gray-300 hover:shadow-md rounded cursor-ew-resize z-10"
                        style={{ 
                            left: `calc(50% - ${resizableWidth / 2}px - 4px)`,
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'left')}
                    />
                    {/* Right resize handle */}
                    <div
                        className="absolute top-1/2 transform -translate-y-1/2 w-2 h-8 bg-white border border-gray-300 hover:shadow-md rounded cursor-ew-resize z-10"
                        style={{ 
                            left: `calc(50% + ${resizableWidth / 2}px - 4px)`,
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'right')}
                    />
                </>
            )}
        </>
    );
};
