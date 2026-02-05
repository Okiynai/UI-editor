import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import { useAtom } from "jotai";
import { isInPreviewModeAtom } from "../../store";

// Shared loading fallback component
const LoadingFallback = ({ componentName }: { componentName: string }) => (
    <div className="w-full bg-white flex items-center justify-center" 
        style={{ minHeight: 'calc(100dvh - 56px)' }}>
        <span className="text-sm text-gray-700 font-normal">
            Loading {componentName}...
        </span>
    </div>
);

// Lazy load components
const ChatPanel = lazy(() => import("./ChatPanel/ChatPanel").then(module => ({ default: module.ChatPanel })));
const SettingsPanel = lazy(() => import("./SettingsPanel/SettingsPanel").then(module => ({ default: module.SettingsPanel })));
const AssetsPanel = lazy(() => import("./AssetsPanel/AssetsPanel").then(module => ({ default: module.AssetsPanel })));
const LayoutPanel = lazy(() => import("./LayoutPanel/LayoutPanel").then(module => ({ default: module.LayoutPanel })));


interface SidePanelRendererProps {
    activePanel: string;
    onActivePanelChange: (panel: string) => void;
    
    // Iframe data states (single source of truth from iframe)
    siteSettings?: any;
    siteSettingsState?: { isLoading: boolean; isRefetching?: boolean };
    pageDefinition?: any;
    pageDefinitionState?: { isLoading: boolean; isRefetching?: boolean };
    
    // Sidebar width tracking for smart max width calculation
    onSidebarWidthChange?: (width: number) => void;
}

export const SidePanelRenderer = ({
    activePanel,
    onActivePanelChange,
    siteSettings,
    siteSettingsState,
    pageDefinition,
    pageDefinitionState,
    onSidebarWidthChange,
}: SidePanelRendererProps) => {
    const [isPreview] = useAtom(isInPreviewModeAtom);
    
    // Lazy rendering state - track which panels have been loaded
    const [loadedPanels, setLoadedPanels] = useState<Set<string>>(new Set());
    const isInitialRender = useRef(true);
    
    // Sidebar resizing states - moved from main page
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = localStorage.getItem('builderSidebarWidth');
        return saved ? Math.min(600, Math.max(280, Number(saved))) : 600;
    });
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [sidebarDragStartX, setSidebarDragStartX] = useState(0);
    const [sidebarDragStartWidth, setSidebarDragStartWidth] = useState(0);
    const [showResizeHandle, setShowResizeHandle] = useState(false);
    const secondarySidebarRef = useRef<HTMLDivElement | null>(null);

    // Assets state management - moved here to keep original interface
    const [customFolders, setCustomFolders] = useState<string[]>([]);
    const [showAssetModal, setShowAssetModal] = useState(false);
    const [selectedAssetFolder, setSelectedAssetFolder] = useState<string | null>(null);
    const [newFolderName, setNewFolderName] = useState("");
    const [showAddFolderInput, setShowAddFolderInput] = useState(false);
    const [copiedAssetId, setCopiedAssetId] = useState<number | null>(null);

    // Mark panel as loaded when it becomes active
    useEffect(() => {
        console.log('Active panel changed to:', activePanel);
        console.log('Current loaded panels:', Array.from(loadedPanels));
        console.log('Is initial render:', isInitialRender.current);
        
        // Load the initial active panel on first render
        if (activePanel && !loadedPanels.has(activePanel) && isInitialRender.current) {
            console.log('Loading initial panel:', activePanel);
            setLoadedPanels(prev => new Set([...prev, activePanel]));
            isInitialRender.current = false;
        }
        // Load new panels when switching (not initial render)
        else if (activePanel && !loadedPanels.has(activePanel) && !isInitialRender.current) {
            console.log('Loading new panel:', activePanel);
            setLoadedPanels(prev => new Set([...prev, activePanel]));
        }
    }, [activePanel, loadedPanels]);

    // Asset management functions
    const handleOpenAssetFolder = (folderName: string) => {
        setSelectedAssetFolder(folderName);
        setShowAssetModal(true);
    };

    // Copy URL to clipboard
    const handleCopyUrl = async (url: string, assetId: number) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedAssetId(assetId);
            console.log('URL copied to clipboard:', url);
            
            // Clear the check icon after 2 seconds
            setTimeout(() => {
                setCopiedAssetId(null);
            }, 1000);
        } catch (error) {
            console.error('Failed to copy URL:', error);
        }
    };

    // Delete asset (for custom folders only)
    const handleDeleteAsset = (assetId: number) => {
        console.log('Deleting asset:', assetId);
        // In a real implementation, this would make an API call to delete the asset
    };

    // Mouse tracking for resize handle visibility
    const handleContainerMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isResizingSidebar || !secondarySidebarRef.current) return;

        const sidebarRect = secondarySidebarRef.current.getBoundingClientRect();
        const proximity = 20; // Discovery area extends 20px outside the sidebar
        const sidebarEdgeX = sidebarRect.right;

        // Check if mouse is within the discovery area (half inside sidebar, half outside)
        const nearEdge = e.clientX >= sidebarEdgeX - proximity && e.clientX <= sidebarEdgeX + proximity;

        setShowResizeHandle(nearEdge);
    }, [isResizingSidebar]);

    const handleContainerMouseLeave = useCallback(() => {
        if (!isResizingSidebar) {
            setShowResizeHandle(false);
        }
    }, [isResizingSidebar]);

    // Sidebar resize handlers
    const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
        setIsResizingSidebar(true);
        setSidebarDragStartX(e.clientX);
        setSidebarDragStartWidth(sidebarWidth);
        e.preventDefault();
    }, [sidebarWidth]);

    const handleSidebarResizeMove = useCallback((e: MouseEvent) => {
        if (!isResizingSidebar) return;
        
        const deltaX = e.clientX - sidebarDragStartX;
        const newWidth = sidebarDragStartWidth + deltaX;
        
        const minWidth = 280;
        const maxWidth = 600;
        const constrainedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
        
        setSidebarWidth(constrainedWidth);
    }, [isResizingSidebar, sidebarDragStartX, sidebarDragStartWidth]);

    const handleSidebarResizeEnd = useCallback(() => {
        if (!isResizingSidebar) return;
        setIsResizingSidebar(false);
        // Use a callback with the state setter to ensure we get the latest sidebarWidth
        setSidebarWidth(currentWidth => {
            localStorage.setItem('builderSidebarWidth', String(currentWidth));
            return currentWidth;
        });
    }, [isResizingSidebar]);

    // Handle sidebar resize events
    useEffect(() => {
        if (isResizingSidebar) {
            document.addEventListener('mousemove', handleSidebarResizeMove);
            document.addEventListener('mouseup', handleSidebarResizeEnd);
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleSidebarResizeMove);
            document.removeEventListener('mouseup', handleSidebarResizeEnd);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizingSidebar, handleSidebarResizeMove, handleSidebarResizeEnd]);

    // Notify parent component when sidebar width changes
    useEffect(() => {
        if (onSidebarWidthChange) {
            onSidebarWidthChange(sidebarWidth);
        }
    }, [sidebarWidth, onSidebarWidthChange]);

    return (
        <div
            className={`relative flex flex-col ${isPreview ? 'hidden' : ''}`}
            style={{ width: `${sidebarWidth}px` }}
            onMouseMove={handleContainerMouseMove}
            onMouseLeave={handleContainerMouseLeave}
            ref={secondarySidebarRef}
        >
            {/* Main panel content */}
            {loadedPanels.has("chat") && (
                <div className={`${activePanel === "chat" ? 'block' : 'hidden'}`}>
                    <Suspense fallback={<LoadingFallback componentName="Chat Panel" />}>
                        <ChatPanel
                            pageDefinition={pageDefinition}
                        />
                    </Suspense>
                </div>
            )}

            {loadedPanels.has("settings") && (
                <div className={`${activePanel === "settings" ? 'block' : 'hidden'}`}>
                    <Suspense fallback={<LoadingFallback componentName="Settings Panel" />}>
                        {siteSettings && (
                            <SettingsPanel
                                siteSettings={siteSettings}
                                siteSettingsState={siteSettingsState || { isLoading: false }}
                            />
                        )}
                    </Suspense>
                </div>
            )}

            {loadedPanels.has("assets") && (
                <div className={`${activePanel === "assets" ? 'block' : 'hidden'}`}>
                    <Suspense fallback={<LoadingFallback componentName="Assets Panel" />}>
                        <AssetsPanel
                            // Folder management
                            customFolders={customFolders}
                            onCustomFoldersChange={setCustomFolders}
                            newFolderName={newFolderName}
                            onNewFolderNameChange={setNewFolderName}
                            showAddFolderInput={showAddFolderInput}
                            onShowAddFolderInputChange={setShowAddFolderInput}
                            
                            // Asset modal
                            showAssetModal={showAssetModal}
                            onShowAssetModalChange={setShowAssetModal}
                            selectedAssetFolder={selectedAssetFolder}
                            onSelectedAssetFolderChange={setSelectedAssetFolder}
                            
                            // Copy URL feedback
                            copiedAssetId={copiedAssetId}
                            onCopiedAssetIdChange={setCopiedAssetId}
                            
                            // Callbacks
                            onOpenAssetFolder={handleOpenAssetFolder}
                            onCopyUrl={handleCopyUrl}
                            onDeleteAsset={handleDeleteAsset}
                        />
                    </Suspense>
                </div>
            )}

            {loadedPanels.has("layout") && (
                <div className={`${activePanel === "layout" ? 'block' : 'hidden'}`}>
                    <Suspense fallback={<LoadingFallback componentName="Layout Panel" />}>
                        <LayoutPanel 
                            pageDefinition={pageDefinition}
                            pageDefinitionState={pageDefinitionState || { isLoading: false }}
                            siteSettings={siteSettings}
                            onActivePanelChange={onActivePanelChange}
                        />
                    </Suspense>
                </div>
            )}

            {/* Invisible discovery area for resize handle */}
            <div
                className="absolute top-0 right-0 w-2.5 h-full cursor-ew-resize z-20"
                style={{ transform: 'translateX(100%)' }}
                onMouseDown={handleSidebarResizeStart}
            />

            {/* Visible resize handle */}
            {(showResizeHandle || isResizingSidebar) && (
                <div
                    className="rounded-full absolute pointer-events-none top-1/2 right-0 w-1.5 h-16 bg-white border border-gray-200 shadow-sm cursor-ew-resize transition-all duration-200 z-30"
                    style={{
                        transform: `translate(25%, -50%) ${isResizingSidebar ? 'scaleY(1.1)' : 'scaleY(1)'}`,
                    }}
                />
            )}
        </div>
    );
};
