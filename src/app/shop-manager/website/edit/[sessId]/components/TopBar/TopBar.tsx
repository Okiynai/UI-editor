import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Undo2, Redo2, SquareMousePointer, Eye, EyeOff } from 'lucide-react';
import { PageDropdown } from './PageDropdown';
import { LocaleDropdown } from './LocaleDropdown';
import { ScreenSizeControls } from './ScreenSizeControls';
import { SaveDropdown } from './SaveDropdown';
import { Page, ScreenSize } from '../../types/builder';
import { UseMutateFunction } from '@tanstack/react-query';
import { PageDefinition } from '@/services/api/shop-manager/osdl';
import { useIframeCommunicationContext } from '../../context/IframeCommunicationContext';
import { useAtom } from 'jotai';
import { isInPreviewModeAtom, isInspectModeAtom } from '../../store';
import { ShopLocales } from '@/services/api/osdl/osdl';
import { useUndoRedo } from '../../../iframe/utils/undo-redo';

const SHOW_DEBUG_INFO = false;

export const TopBar = ({
    // Page props
    selectedPage,
    userPages,
    onPageChange,
    upsertPage,
    deletePage,
    isPageLoading,
    
    // Locale props
    localesData,
    isLoadingLocales,

    // Screen size props
    screenSize,
    onScreenSizeChange,
    onResizableWidthChange,
    maxWidth,
    previewMaxWidth,
}: {
    // Page props
    selectedPage: string;
    userPages: Page[];
    onPageChange: (value: string) => void;
    upsertPage: UseMutateFunction<PageDefinition, any, Partial<Omit<PageDefinition, "id">> & { id?: string | undefined; }, unknown>;
    deletePage: UseMutateFunction<{ success: boolean, message: string }, any, string, unknown>;
    isPageLoading?: boolean;
    
    // Locale props
    localesData: ShopLocales | null | undefined;
    isLoadingLocales: boolean;

    // Screen size props
    screenSize: ScreenSize;
    onScreenSizeChange: (size: ScreenSize) => void;
    onResizableWidthChange: (width: number) => void;
    maxWidth: number;
    previewMaxWidth: number;
}) => {
    const { handleInspectModeToggle } = useIframeCommunicationContext();

    const { canUndo, canRedo, undo, redo, currentPageUndoStack, currentPageRedoStack } = useUndoRedo();

    const [isPreview] = useAtom(isInPreviewModeAtom);
    const [isInspectMode, setIsInspectMode] = useAtom(isInspectModeAtom);
    const [isPreviewMode, setIsPreviewMode] = useAtom(isInPreviewModeAtom);
    const topBarRef = useRef<HTMLDivElement>(null);
    const [topBarHeight, setTopBarHeight] = useState(56);
    const [isPreviewBarVisible, setIsPreviewBarVisible] = useState(true);
    const [isHoveringTopBar, setIsHoveringTopBar] = useState(false);
    const hideTimerRef = useRef<number | null>(null);

    // used in the preview function.
    const [localTmpInspectMode, setLocalTmpInspectMode] = useState(isInspectMode);
    

    const handleInspectClick = () => {
        const newInspectMode = !isInspectMode;
        setIsInspectMode(newInspectMode);
        handleInspectModeToggle(newInspectMode);
    };

    const handlePreviewClick = () => {
        // make sure to turn off the inspect mode and save its status.
        if(isInspectMode) {
            setLocalTmpInspectMode(true);
            setIsInspectMode(false);
            handleInspectModeToggle(false);
        }

        // that means we are currently in preview mode, and about to toggle it to false.
        if(isPreviewMode) {
            if(localTmpInspectMode) {
                setIsInspectMode(true);
                setLocalTmpInspectMode(false);
                handleInspectModeToggle(true);
            }
        }

        setIsPreviewMode(!isPreviewMode);
    };

    useLayoutEffect(() => {
        if (!topBarRef.current) return;
        const updateHeight = () => {
            if (!topBarRef.current) return;
            setTopBarHeight(topBarRef.current.getBoundingClientRect().height || 56);
        };
        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        observer.observe(topBarRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isPreview) {
            setIsPreviewBarVisible(true);
            return;
        }

        const triggerHeight = Math.max(0, topBarHeight / 2);
        const hideDelay = 200;

        const clearHideTimer = () => {
            if (hideTimerRef.current) {
                window.clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
            }
        };

        const scheduleHide = () => {
            clearHideTimer();
            hideTimerRef.current = window.setTimeout(() => {
                if (!isHoveringTopBar) setIsPreviewBarVisible(false);
            }, hideDelay);
        };

        const handleMove = (event: MouseEvent) => {
            if (event.clientY <= triggerHeight || isHoveringTopBar) {
                clearHideTimer();
                setIsPreviewBarVisible(true);
            } else {
                scheduleHide();
            }
        };

        const handleLeave = () => {
            if (!isHoveringTopBar) scheduleHide();
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseleave', handleLeave);

        const iframe = document.querySelector<HTMLIFrameElement>('#preview-area iframe');
        const iframeWindow = iframe?.contentWindow;
        const iframeDoc = iframeWindow?.document;

        if (iframeWindow && iframeDoc) {
            iframeWindow.addEventListener('mousemove', handleMove);
            iframeWindow.addEventListener('mouseleave', handleLeave);
            iframeDoc.addEventListener('mousemove', handleMove);
            iframeDoc.addEventListener('mouseleave', handleLeave);
        }

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseleave', handleLeave);
            if (iframeWindow && iframeDoc) {
                iframeWindow.removeEventListener('mousemove', handleMove);
                iframeWindow.removeEventListener('mouseleave', handleLeave);
                iframeDoc.removeEventListener('mousemove', handleMove);
                iframeDoc.removeEventListener('mouseleave', handleLeave);
            }
            clearHideTimer();
        };
    }, [isPreview, topBarHeight, isHoveringTopBar]);

    return (
        <>
            {/* Top Toolbar - spans full width */}
            <div
                ref={topBarRef}
                onMouseEnter={() => setIsHoveringTopBar(true)}
                onMouseLeave={() => setIsHoveringTopBar(false)}
                className={`h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 transition-all duration-200 ${
                    isPreview
                        ? `fixed top-0 left-0 right-0 z-40 ${
                            isPreviewBarVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'
                        }`
                        : 'flex-shrink-0'
                }`}
            >
                {/* Left Section */}
                <div className="flex items-center space-x-3 min-w-0">
                    <PageDropdown
                        selectedPage={selectedPage}
                        userPages={userPages}
                        onPageChange={onPageChange}
                        upsertPage={upsertPage}
                        deletePage={deletePage}
                        isLoading={isPageLoading}
                        className="w-48"
                    />
                </div>

                {/* Center Section - Screen Size Controls */}
                <div className="flex items-center space-x-4 ml-40">
                    <ScreenSizeControls
                        screenSize={screenSize}
                        onScreenSizeChange={onScreenSizeChange}
                        onResizableWidthChange={onResizableWidthChange}
                        maxWidth={isPreview ? previewMaxWidth : maxWidth}
                    />

                    <div className="h-4 w-px bg-gray-200"></div>

                    <LocaleDropdown
                        className="w-40"
                        localesData={localesData}
                        isLoading={isLoadingLocales}
                    />
                </div>

                {/* Right Section */}
                <div className="flex items-center">
                    <div className="flex">
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            className={`p-2 ${
                                canUndo
                                    ? 'text-gray-500 hover:text-gray-700 cursor-pointer'
                                    : 'text-gray-300 cursor-default'
                            }`}
                            title={canUndo ? "Undo" : "Nothing to undo"}
                        >
                            <Undo2 size={14} />
                        </button>
                        <button
                            onClick={redo}
                            disabled={!canRedo}
                            className={`p-2 ${
                                canRedo
                                    ? 'text-gray-500 hover:text-gray-700 cursor-pointer'
                                    : 'text-gray-300 cursor-default'
                            }`}
                            title={canRedo ? "Redo" : "Nothing to redo"}
                        >
                            <Redo2 size={14} />
                        </button>
                    </div>

                    {/* Debug: Show stacks */}
                    {SHOW_DEBUG_INFO && (
                        <div className="ml-4 text-xs text-gray-400 font-mono">
                            <div className="flex items-center space-x-2">
                                <span>U:{currentPageUndoStack.length}</span>
                                <span>R:{currentPageRedoStack.length}</span>
                                <span>canU:{canUndo ? '✓' : '✗'}</span>
                                <span>canR:{canRedo ? '✓' : '✗'}</span>
                            </div>
                            {currentPageUndoStack.length > 0 && (
                                <div className="text-xs truncate max-w-24">
                                    Last: {currentPageUndoStack[currentPageUndoStack.length - 1]?.operation?.type}
                                </div>
                            )}
                            {currentPageRedoStack.length > 0 && (
                                <div className="text-xs truncate max-w-24">
                                    Next: {currentPageRedoStack[currentPageRedoStack.length - 1]?.operation?.type}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="h-4 w-px bg-gray-200 ml-3"></div>
                    
                    <button 
                        disabled={isPreview}
                        onClick={handleInspectClick}
                        className={`ml-5 transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                            isInspectMode 
                                ? 'text-blue-500 hover:text-blue-600' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`} 
                        title={isInspectMode ? "Exit Inspect Mode" : "Inspect Element"}
                    >
                        <SquareMousePointer size={16} />
                    </button>
                    
                    <button 
                        onClick={handlePreviewClick}
                        className={`ml-0 mr-2 px-3 py-1 text-sm font-medium rounded-lg transition-colors flex items-center space-x-2 ${
                            isPreview ? 'text-gray-800' 
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        {isPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                        <span>Preview</span>
                    </button>
                    
                    <SaveDropdown />
                </div>
            </div>
        </>
    );
}; 
